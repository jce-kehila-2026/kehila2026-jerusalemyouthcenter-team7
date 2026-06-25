import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  MONTHLY_ATTENDANCE,
  MonthlyAttendanceEntry,
  SESSIONS_PER_MONTH,
  STAT_STUDENTS,
  STAT_YEARS,
  StatStudent,
  YEARLY_TOTALS,
} from "./statsData";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AttendanceStats = {
  monthlyAttendance: MonthlyAttendanceEntry[];
  yearlyTotals: Record<number, { students: number; hours: number }>;
  sessionsPerMonth: Record<number, number[]>;
};

export type FormQuestionResult = {
  questionId: string;
  questionText: string;
  answerType: "text" | "yes_no" | "multiple_choice" | "range";
  counts: Record<string, number>;
  totalResponses: number;
};

export type FormResult = {
  formId: string;
  formTitle: string;
  questions: FormQuestionResult[];
};

export type FormMeta = {
  id: string;
  title: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Maps a singer's year_id (1–4) to the filter key used by the stats screen */
function yearIdToGroupKey(yearId: number | null | undefined): string {
  if (yearId == null || yearId < 1 || yearId > 4) return "g1";
  return `g${yearId}`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetch attendance + session + yearly-totals stats from Firestore.
 * Falls back to mock data from statsData.ts if no real attendance docs exist.
 */
export async function getAttendanceStats(): Promise<AttendanceStats> {
  try {
    // 1. Build eventId → date map
    const eventsSnap = await getDocs(collection(db, "events"));
    const eventDateMap = new Map<string, string>();
    eventsSnap.forEach((d) => {
      const date: string | undefined = d.data().date;
      if (date) eventDateMap.set(d.id, date);
    });

    // 2. Load all attendance docs
    const attSnap = await getDocs(collection(db, "attendance"));
    if (attSnap.empty) {
      return {
        monthlyAttendance: MONTHLY_ATTENDANCE,
        yearlyTotals: YEARLY_TOTALS,
        sessionsPerMonth: SESSIONS_PER_MONTH,
      };
    }

    // 3. Build studentId → groupKey map (via year_id)
    const singersSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "singer")),
    );
    const studentGroupMap = new Map<string, string>();
    singersSnap.forEach((d) => {
      const data = d.data();
      const yearId = data.year_id != null ? Number(data.year_id) : null;
      studentGroupMap.set(d.id, yearIdToGroupKey(yearId));
    });

    // 4. Aggregate attendance into month/year/group buckets
    type MonthCell = { present: number; total: number };
    const monthData: Record<
      number,
      Record<number, Record<string, MonthCell>>
    > = {};
    const sessionCounts: Record<number, Record<number, number>> = {};

    attSnap.forEach((d) => {
      const data = d.data();
      const eventId: string = data.eventId ?? d.id;
      const dateStr = eventDateMap.get(eventId);
      if (!dateStr) return;

      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return;
      const year = dt.getFullYear();
      const month = dt.getMonth(); // 0-indexed

      if (!monthData[year]) monthData[year] = {};
      if (!monthData[year][month]) monthData[year][month] = {};
      if (!sessionCounts[year]) sessionCounts[year] = {};
      sessionCounts[year][month] = (sessionCounts[year][month] ?? 0) + 1;

      const records: Record<string, string> = data.records ?? {};
      Object.entries(records).forEach(([studentId, status]) => {
        const gKey = studentGroupMap.get(studentId) ?? "g1";
        const isPresent = status !== "absent";

        // accumulate for "all" bucket and the specific group bucket
        for (const key of ["all", gKey]) {
          if (!monthData[year][month][key])
            monthData[year][month][key] = { present: 0, total: 0 };
          monthData[year][month][key].total++;
          if (isPresent) monthData[year][month][key].present++;
        }
      });
    });

    // 5. Build MonthlyAttendanceEntry[] in the same shape as mock data
    const allYears = new Set([
      ...Object.keys(monthData).map(Number),
      ...Array.from(STAT_YEARS),
    ]);
    const groupKeys = ["all", "g1", "g2", "g3", "g4"];
    const monthlyAttendance: MonthlyAttendanceEntry[] = [];

    for (const year of allYears) {
      for (const groupId of groupKeys) {
        const rates = new Array(12).fill(0);
        for (let m = 0; m < 12; m++) {
          const cell = monthData[year]?.[m]?.[groupId];
          if (cell && cell.total > 0) {
            rates[m] = Math.round((cell.present / cell.total) * 100);
          }
        }
        monthlyAttendance.push({ year, groupId, rates });
      }
    }

    // If all rates are zero (no event→date joins worked), keep mock
    const hasRealRates = monthlyAttendance.some((e) =>
      e.rates.some((r) => r > 0),
    );

    // 6. Build sessionsPerMonth
    const sessionsPerMonth: Record<number, number[]> = {};
    for (const yearStr of Object.keys(sessionCounts)) {
      const year = Number(yearStr);
      const arr = new Array(12).fill(0);
      for (const [mStr, cnt] of Object.entries(sessionCounts[year])) {
        arr[Number(mStr)] = cnt;
      }
      sessionsPerMonth[year] = arr;
    }
    for (const year of Array.from(STAT_YEARS)) {
      if (!sessionsPerMonth[year])
        sessionsPerMonth[year] = new Array(12).fill(0);
    }

    // 7. Build yearlyTotals: cumulative singers per year + hours (2 hrs/event)
    const joinYearCounts = new Map<number, number>();
    singersSnap.forEach((d) => {
      const jy = d.data().year_joined ? Number(d.data().year_joined) : null;
      if (jy) joinYearCounts.set(jy, (joinYearCounts.get(jy) ?? 0) + 1);
    });

    const yearlyTotals: Record<number, { students: number; hours: number }> =
      {};
    for (const year of allYears) {
      let cumStudents = 0;
      for (const [jy, cnt] of joinYearCounts.entries()) {
        if (jy <= year) cumStudents += cnt;
      }
      if (cumStudents === 0) cumStudents = singersSnap.size;
      const totalEvents = Object.values(sessionCounts[year] ?? {}).reduce(
        (a, b) => a + b,
        0,
      );
      yearlyTotals[year] = { students: cumStudents, hours: totalEvents * 2 };
    }

    return {
      monthlyAttendance: hasRealRates ? monthlyAttendance : MONTHLY_ATTENDANCE,
      yearlyTotals:
        Object.keys(yearlyTotals).length > 0 ? yearlyTotals : YEARLY_TOTALS,
      sessionsPerMonth:
        Object.keys(sessionsPerMonth).length > 0
          ? sessionsPerMonth
          : SESSIONS_PER_MONTH,
    };
  } catch (err) {
    console.error("[statsService] getAttendanceStats:", err);
    return {
      monthlyAttendance: MONTHLY_ATTENDANCE,
      yearlyTotals: YEARLY_TOTALS,
      sessionsPerMonth: SESSIONS_PER_MONTH,
    };
  }
}

/**
 * Fetch real singers from Firestore and map to StatStudent format.
 * Falls back to STAT_STUDENTS mock if Firestore is empty or has no gender data.
 */
export async function getProgramStudents(): Promise<StatStudent[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "users"), where("role", "==", "singer")),
    );
    if (snap.empty) return STAT_STUDENTS;

    const students: StatStudent[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const gender: "male" | "female" =
        data.gender === "female" ? "female" : "male";
      const yearId = data.year_id != null ? Number(data.year_id) : null;
      students.push({
        id: d.id,
        name: (data.full_name ?? data.name ?? d.id) as string,
        gender,
        groupId: yearIdToGroupKey(yearId),
        yearJoined: data.year_joined ? Number(data.year_joined) : 2024,
      });
    });

    // Only swap in real data if we got at least some female-flagged records;
    // otherwise the gender split would be misleading (all defaulting to "male").
    const hasGenderData = students.some((s) => s.gender === "female");
    return hasGenderData ? students : STAT_STUDENTS;
  } catch (err) {
    console.error("[statsService] getProgramStudents:", err);
    return STAT_STUDENTS;
  }
}

/**
 * Fetch the list of forms for the form-selector chip row.
 */
export async function getForms(): Promise<FormMeta[]> {
  try {
    const snap = await getDocs(collection(db, "forms"));
    return snap.docs.map((d) => ({
      id: d.id,
      title: (d.data().title as string) ?? "Untitled Form",
    }));
  } catch (err) {
    console.error("[statsService] getForms:", err);
    return [];
  }
}

/**
 * Aggregate all submissions for one form into per-question result counts.
 * Returns null if the form doesn't exist or has no submissions yet.
 */
export async function getFormResults(
  formId: string,
): Promise<FormResult | null> {
  try {
    const formDocSnap = await getDoc(doc(db, "forms", formId));
    if (!formDocSnap.exists()) return null;
    const formData = formDocSnap.data()!;
    const rawQuestions: any[] = Array.isArray(formData.questions)
      ? formData.questions
      : [];

    const subsSnap = await getDocs(
      query(
        collection(db, "form_submissions"),
        where("form_id", "==", formId),
      ),
    );
    if (subsSnap.empty) return null;

    type QEntry = {
      text: string;
      answerType: string;
      counts: Record<string, number>;
      total: number;
    };
    const qMap = new Map<string, QEntry>();
    for (const q of rawQuestions) {
      const qId = String(q.id ?? "");
      qMap.set(qId, {
        text: (q.text ?? q.question_text ?? "") as string,
        answerType: (q.answer_type ?? "text") as string,
        counts: {},
        total: 0,
      });
    }

    subsSnap.forEach((d) => {
      const responses: Array<{ questionId: string; answer: any }> =
        Array.isArray(d.data().responses) ? d.data().responses : [];
      for (const r of responses) {
        const entry = qMap.get(String(r.questionId));
        if (!entry) continue;
        const val = String(r.answer ?? "").trim();
        if (!val) continue;
        entry.total++;
        entry.counts[val] = (entry.counts[val] ?? 0) + 1;
      }
    });

    const questions: FormQuestionResult[] = rawQuestions.map((q) => {
      const qId = String(q.id ?? "");
      const entry = qMap.get(qId);
      return {
        questionId: qId,
        questionText: entry?.text ?? "",
        answerType: (entry?.answerType ??
          "text") as FormQuestionResult["answerType"],
        counts: entry?.counts ?? {},
        totalResponses: entry?.total ?? 0,
      };
    });

    return {
      formId,
      formTitle: (formData.title as string) ?? "Untitled",
      questions,
    };
  } catch (err) {
    console.error("[statsService] getFormResults:", err);
    return null;
  }
}
