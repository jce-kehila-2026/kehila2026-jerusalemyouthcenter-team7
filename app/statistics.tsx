import { COLORS } from "@/src/data/mockData";
import { db } from "@/src/firebase/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

// ── Constants ──────────────────────────────────────────────────────────────────
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const F_COLOR = "#ec4899";
const M_COLOR = "#3b82f6";
const C_TEAL = "#0a7ea4";
const C_ORA = "#FF6B35";

// ── Real data types ────────────────────────────────────────────────────────────
type Singer = {
  id: string;
  gender: "male" | "female" | "";
  voice_type: string;
  year_joined: number | null; // calendar year, e.g. 2024
  year_id: number | null; // program cohort, e.g. 1 / 2 / 3
};

type AttendanceDoc = {
  id: string; // event id
  records: Record<string, string>; // { [uid]: statusKey }
};

type FirestoreEvent = {
  id: string;
  title: string;
  date: string; // ISO-ish string
};

// ── SVG helpers ────────────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function donutArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const sweep = Math.min(endDeg - startDeg, 359.99);
  const end = startDeg + sweep;
  const large = sweep > 180 ? 1 : 0;
  const o1 = polar(cx, cy, outerR, startDeg);
  const o2 = polar(cx, cy, outerR, end);
  const i1 = polar(cx, cy, innerR, end);
  const i2 = polar(cx, cy, innerR, startDeg);
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y} Z`;
}

// ── Chart: Area / Line trend ───────────────────────────────────────────────────
function AreaTrendChart({
  values,
  labels,
  color,
  chartWidth,
}: {
  values: number[];
  labels: string[];
  color: string;
  chartWidth: number;
}) {
  const H = 175;
  const PL = 30,
    PR = 8,
    PT = 10,
    PB = 32;
  const PW = chartWidth - PL - PR;
  const PH = H - PT - PB;
  if (values.length < 2) {
    return (
      <View
        style={{ height: H, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: COLORS.muted, fontSize: 13 }}>
          Not enough data
        </Text>
      </View>
    );
  }
  const maxV = Math.max(...values, 1);
  const pts = values.map((v, i) => ({
    x: PL + (i / (values.length - 1)) * PW,
    y: PT + PH - (v / maxV) * PH,
  }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${PT + PH} L ${pts[0].x} ${PT + PH} Z`;
  const gridVals = [0, 25, 50, 75, 100];
  return (
    <Svg width={chartWidth} height={H}>
      <Defs>
        <LinearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      {gridVals.map((v) => {
        const y = PT + PH - (v / 100) * PH;
        return (
          <G key={v}>
            <Line
              x1={PL}
              y1={y}
              x2={chartWidth - PR}
              y2={y}
              stroke={COLORS.border}
              strokeWidth="1"
            />
            <SvgText
              x={PL - 4}
              y={y + 4}
              fontSize="9"
              fill={COLORS.muted}
              textAnchor="end"
            >
              {v}
            </SvgText>
          </G>
        );
      })}
      <Path d={areaPath} fill="url(#aG)" />
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <G key={i}>
          <Circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill={COLORS.card}
            stroke={color}
            strokeWidth="2"
          />
          <SvgText
            x={p.x}
            y={H - 6}
            fontSize="9"
            fill={COLORS.muted}
            textAnchor="middle"
          >
            {labels[i]}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

// ── Chart: Vertical bar ────────────────────────────────────────────────────────
function BarChart({
  values,
  labels,
  color,
  accentMax = false,
  accentColor,
  chartWidth,
  chartHeight = 140,
}: {
  values: number[];
  labels: string[];
  color: string;
  accentMax?: boolean;
  accentColor?: string;
  chartWidth: number;
  chartHeight?: number;
}) {
  const PL = 26,
    PR = 6,
    PT = 10,
    PB = 26;
  const PW = chartWidth - PL - PR;
  const PH = chartHeight - PT - PB;
  const n = values.length;
  const maxV = Math.max(...values, 1);
  const step = PW / n;
  const barW = Math.max(step * 0.56, 4);
  const maxIdx = values.indexOf(Math.max(...values));
  return (
    <Svg width={chartWidth} height={chartHeight}>
      {[0, 50, 100].map((pct) => {
        const y = PT + PH - (pct / 100) * PH;
        const v = Math.round((pct / 100) * maxV);
        return (
          <G key={pct}>
            <Line
              x1={PL}
              y1={y}
              x2={chartWidth - PR}
              y2={y}
              stroke={COLORS.border}
              strokeWidth="1"
            />
            <SvgText
              x={PL - 3}
              y={y + 4}
              fontSize="8"
              fill={COLORS.muted}
              textAnchor="end"
            >
              {v}
            </SvgText>
          </G>
        );
      })}
      {values.map((v, i) => {
        const barH = Math.max((v / maxV) * PH, 1);
        const x = PL + i * step + (step - barW) / 2;
        const y = PT + PH - barH;
        const c = accentMax && i === maxIdx ? (accentColor ?? C_TEAL) : color;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx="3" fill={c} />
            {barH > 14 && (
              <SvgText
                x={x + barW / 2}
                y={y - 3}
                fontSize="8"
                fill={COLORS.sub}
                textAnchor="middle"
              >
                {v}
              </SvgText>
            )}
            {(n <= 7 || i % 2 === 0) && (
              <SvgText
                x={x + barW / 2}
                y={chartHeight - 4}
                fontSize="8"
                fill={COLORS.muted}
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ── Chart: Donut ───────────────────────────────────────────────────────────────
function DonutChart({
  female,
  male,
  size = 120,
}: {
  female: number;
  male: number;
  size?: number;
}) {
  const total = female + male;
  if (total === 0) return null;
  const cx = size / 2,
    cy = size / 2;
  const outerR = size / 2 - 6,
    innerR = outerR * 0.6;
  const fDeg = (female / total) * 360;
  return (
    <Svg width={size} height={size}>
      <Path d={donutArc(cx, cy, outerR, innerR, 0, fDeg)} fill={F_COLOR} />
      <Path d={donutArc(cx, cy, outerR, innerR, fDeg, 360)} fill={M_COLOR} />
      <SvgText
        x={cx}
        y={cy - 4}
        fontSize="17"
        fontWeight="bold"
        fill={COLORS.text}
        textAnchor="middle"
      >
        {Math.round((female / total) * 100)}%
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 13}
        fontSize="10"
        fill={COLORS.muted}
        textAnchor="middle"
      >
        Female
      </SvgText>
    </Svg>
  );
}

// ── Brand Card ─────────────────────────────────────────────────────────────────
function BrandCard({
  barColor = COLORS.teal,
  title,
  children,
  style,
}: {
  barColor?: string;
  title?: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[bc.shadow, style]}>
      <View style={bc.outer}>
        <View style={[bc.bar, { backgroundColor: barColor }]} />
        <View style={bc.pad}>
          {title ? <Text style={bc.title}>{title.toUpperCase()}</Text> : null}
          {children}
        </View>
      </View>
    </View>
  );
}
const bc = StyleSheet.create({
  shadow: {
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    borderRadius: 16,
  },
  outer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  bar: { height: 4 },
  pad: { padding: 16 },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 12,
  },
});

// ── KPI card ───────────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  accent,
  label,
  main,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  accent: string;
  label: string;
  main: string;
  sub?: string;
}) {
  return (
    <View style={[kp.shadow, { flex: 1 }]}>
      <View style={kp.outer}>
        <View style={[kp.bar, { backgroundColor: accent }]} />
        <View style={kp.pad}>
          <View style={[kp.icon, { backgroundColor: accent + "22" }]}>
            <Ionicons name={icon} size={17} color={accent} />
          </View>
          <Text style={kp.label}>{label}</Text>
          <Text style={kp.main}>{main}</Text>
          {sub ? <Text style={kp.sub}>{sub}</Text> : null}
        </View>
      </View>
    </View>
  );
}
const kp = StyleSheet.create({
  shadow: {
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderRadius: 16,
  },
  outer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  bar: { height: 4 },
  pad: { padding: 16 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 4,
  },
  main: { fontSize: 22, fontWeight: "900", color: COLORS.text },
  sub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
});

// ── Filter chips ───────────────────────────────────────────────────────────────
function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <View>
      {label && <Text style={fc.rowLabel}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[fc.chip, opt.value === value && fc.active]}
          >
            <Text style={[fc.text, opt.value === value && fc.textActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
const fc = StyleSheet.create({
  rowLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: "#edf2f5",
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  active: { backgroundColor: COLORS.teal + "15", borderColor: COLORS.teal },
  text: { fontSize: 13, color: COLORS.muted, fontWeight: "600" },
  textActive: { color: COLORS.teal, fontWeight: "700" },
});

// ── Main screen ────────────────────────────────────────────────────────────────
export default function StatisticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fullW = width - 32;
  const halfW = (width - 40) / 2;

  // ── Filter state ──────────────────────────────────────────────────────────
  // Row 1: calendar year (year_joined field) — "all" or e.g. "2024"
  // Row 2: program year  (year_id field)     — "all" or e.g. "1"
  const [selJoinYear, setSelJoinYear] = useState<string>("all");
  const [selProgramYear, setSelProgramYear] = useState<string>("all");

  // ── Firestore raw data ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [attendanceDocs, setAttendanceDocs] = useState<AttendanceDoc[]>([]);
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [extraProgYears, setExtraProgYears] = useState<
    { value: string; label: string }[]
  >([]);
  const [savedJoinYears, setSavedJoinYears] = useState<number[]>([]);

  // Live: all singers
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "singer")),
      (snap) => {
        setSingers(
          snap.docs.map((d) => {
            const data = d.data() as any;
            const yj =
              data.year_joined != null ? Number(data.year_joined) : null;
            const yi = data.year_id != null ? Number(data.year_id) : null;
            return {
              id: d.id,
              gender: data.gender ?? "",
              voice_type: data.voice_type ?? "",
              year_joined: Number.isNaN(yj) ? null : yj,
              year_id: Number.isNaN(yi) ? null : yi,
            };
          }),
        );
        setLoading(false);
      },
      (err) => {
        console.error("singers listener:", err);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  // Live: attendance collection — one doc per event
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "attendance"),
      (snap) =>
        setAttendanceDocs(
          snap.docs.map((d) => ({
            id: d.id,
            records: (d.data() as any).records ?? {},
          })),
        ),
      (err) => console.error("attendance listener:", err),
    );
    return unsub;
  }, []);

  // Live: events — for the Sessions/Month chart
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events"),
      (snap) =>
        setEvents(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return { id: d.id, title: data.title ?? "", date: data.date ?? "" };
          }),
        ),
      (err) => console.error("events listener:", err),
    );
    return unsub;
  }, []);

  // Live: program years beyond 3 (from groups collection)
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "groups"), orderBy("year_id")),
      (snap) => {
        setExtraProgYears(
          snap.docs
            .map((d) => d.data() as { name?: string; year_id?: number })
            .filter((g) => typeof g.year_id === "number" && g.year_id > 3)
            .map((g) => ({
              value: String(g.year_id),
              label: g.name ?? `Year ${g.year_id}`,
            })),
        );
      },
      (err) => console.error("groups listener:", err),
    );
    return unsub;
  }, []);

  // Live: manually-added join years from manage-years settings screen.
  // Merged with auto-detected years from singers, so the filter shows
  // both real years (from existing singers) and future years the admin
  // added in advance (e.g. 2027 before any singers sign up with it).
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "join_years"), orderBy("year")),
      (snap) =>
        setSavedJoinYears(
          snap.docs.map((d) => (d.data() as any).year as number),
        ),
      (err) => console.error("join_years listener:", err),
    );
    return unsub;
  }, []);

  // ── Filter options ────────────────────────────────────────────────────────

  // Row 1: union of (a) year_joined values found in real singers' profiles
  // and (b) years manually added by the admin in Manage Years & Voices.
  // This way existing singers auto-populate the filter AND the admin can
  // add a future year like 2027 in advance before anyone signs up with it.
  const joinYearOpts = useMemo<{ value: string; label: string }[]>(() => {
    const fromSingers = singers
      .map((s) => s.year_joined)
      .filter((y): y is number => y !== null);
    const merged = Array.from(
      new Set([...fromSingers, ...savedJoinYears]),
    ).sort((a, b) => a - b);
    return [
      { value: "all", label: "All Years" },
      ...merged.map((y) => ({ value: String(y), label: String(y) })),
    ];
  }, [singers, savedJoinYears]);

  // Row 2: hardcoded Years 1-3 + dynamic extra years from groups collection.
  const programYearOpts = useMemo<{ value: string; label: string }[]>(
    () => [
      { value: "all", label: "All Cohorts" },
      { value: "1", label: "Year 1" },
      { value: "2", label: "Year 2" },
      { value: "3", label: "Year 3" },
      ...extraProgYears,
    ],
    [extraProgYears],
  );

  // ── Filtered singer set (both filters combined) ───────────────────────────
  const filtered = useMemo(() => {
    let result = singers;
    if (selJoinYear !== "all")
      result = result.filter((s) => s.year_joined === Number(selJoinYear));
    if (selProgramYear !== "all")
      result = result.filter((s) => s.year_id === Number(selProgramYear));
    return result;
  }, [singers, selJoinYear, selProgramYear]);

  const filteredIds = useMemo(
    () => new Set(filtered.map((s) => s.id)),
    [filtered],
  );

  // ── KPI: Total Students ───────────────────────────────────────────────────
  const totalStudents = filtered.length;

  // ── KPI: Avg Attendance ───────────────────────────────────────────────────
  // For each (student, event) pair in the attendance records, count
  // how many are "present" (any status other than "absent").
  const avgAttendance = useMemo(() => {
    if (filteredIds.size === 0 || attendanceDocs.length === 0) return 0;
    let present = 0,
      total = 0;
    attendanceDocs.forEach((doc) => {
      Object.entries(doc.records).forEach(([uid, status]) => {
        if (!filteredIds.has(uid)) return;
        total += 1;
        if (status !== "absent") present += 1;
      });
    });
    return total === 0 ? 0 : Math.round((present / total) * 100);
  }, [filteredIds, attendanceDocs]);

  // ── Gender data (real) ────────────────────────────────────────────────────
  const genderData = useMemo(() => {
    const f = filtered.filter((s) => s.gender === "female").length;
    const m = filtered.filter((s) => s.gender === "male").length;
    return { female: f, male: m, total: f + m };
  }, [filtered]);

  // ── By-cohort gender breakdown (always across all singers, not filtered) ──
  // Shows gender split per program year — meaningful across the full choir.
  const cohortGenderData = useMemo(() => {
    const years = [1, 2, 3, ...extraProgYears.map((y) => Number(y.value))];
    return years
      .map((yi) => {
        const cohort = singers.filter((s) => s.year_id === yi);
        const f = cohort.filter((s) => s.gender === "female").length;
        const m = cohort.filter((s) => s.gender === "male").length;
        return {
          label: `Year ${yi}`,
          female: f,
          male: m,
          total: cohort.length,
        };
      })
      .filter((c) => c.total > 0);
  }, [singers, extraProgYears]);

  // ── Attendance trend: monthly avg % per calendar year ────────────────────
  // Groups real attendance records by event date → calendar year → month,
  // computes the monthly attendance rate for the filtered student set,
  // then averages to a single % per year for the trend line.
  const { trendValues, trendLabels } = useMemo(() => {
    if (
      filteredIds.size === 0 ||
      attendanceDocs.length === 0 ||
      events.length === 0
    ) {
      return { trendValues: [], trendLabels: [] };
    }

    // Build a map: eventId → calendar year
    const eventYear = new Map<string, number>();
    events.forEach((e) => {
      if (!e.date) return;
      const y = new Date(e.date).getFullYear();
      if (!Number.isNaN(y)) eventYear.set(e.id, y);
    });

    // year → { present, total }
    const byYear = new Map<number, { present: number; total: number }>();
    attendanceDocs.forEach((doc) => {
      const y = eventYear.get(doc.id);
      if (y == null) return;
      if (!byYear.has(y)) byYear.set(y, { present: 0, total: 0 });
      const bucket = byYear.get(y)!;
      Object.entries(doc.records).forEach(([uid, status]) => {
        if (!filteredIds.has(uid)) return;
        bucket.total += 1;
        if (status !== "absent") bucket.present += 1;
      });
    });

    const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);
    const vals = sortedYears.map((y) => {
      const b = byYear.get(y)!;
      return b.total === 0 ? 0 : Math.round((b.present / b.total) * 100);
    });
    return { trendValues: vals, trendLabels: sortedYears.map(String) };
  }, [filteredIds, attendanceDocs, events]);

  // ── YoY growth: singers per join-year ────────────────────────────────────
  // Counts total singers (unfiltered — shows full choir growth over time).
  const yoyData = useMemo(() => {
    const yearCounts = new Map<number, number>();
    singers.forEach((s) => {
      if (s.year_joined == null) return;
      yearCounts.set(s.year_joined, (yearCounts.get(s.year_joined) ?? 0) + 1);
    });
    const sorted = Array.from(yearCounts.keys()).sort((a, b) => a - b);
    return {
      values: sorted.map((y) => yearCounts.get(y)!),
      labels: sorted.map(String),
    };
  }, [singers]);

  // ── Sessions/Month: real event count per month ────────────────────────────
  // Counts events per month across all years (filtered by join year if set),
  // aggregated into Jan-Dec buckets to show which months are busiest.
  const sessionData = useMemo(() => {
    let evts = events;
    if (selJoinYear !== "all") {
      const y = Number(selJoinYear);
      evts = evts.filter((e) => e.date && new Date(e.date).getFullYear() === y);
    }
    const counts = new Array(12).fill(0);
    evts.forEach((e) => {
      if (!e.date) return;
      const m = new Date(e.date).getMonth();
      if (m >= 0 && m < 12) counts[m] += 1;
    });
    const activeMonths = counts
      .map((c, i) => ({ c, label: MONTH_SHORT[i] }))
      .filter((x) => x.c > 0);
    return {
      values: activeMonths.map((x) => x.c),
      labels: activeMonths.map((x) => x.label),
    };
  }, [events, selJoinYear]);

  const fPct =
    genderData.total > 0
      ? Math.round((genderData.female / genderData.total) * 100)
      : 0;
  const mPct = genderData.total > 0 ? 100 - fPct : 0;

  const joinYearLabel =
    joinYearOpts.find((o) => o.value === selJoinYear)?.label ?? "";
  const programYearLabel =
    programYearOpts.find((o) => o.value === selProgramYear)?.label ?? "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <View>
          <Text style={s.headerSub}>🎵 Jerusalem Youth Chorus</Text>
          <Text style={s.headerTitle}>Our Statistics</Text>
        </View>
      </View>

      {/* Filter bar */}
      <View style={s.filterBar}>
        <FilterChips
          label="Join Year"
          options={joinYearOpts}
          value={selJoinYear}
          onChange={setSelJoinYear}
        />
        <View style={{ height: 10 }} />
        <FilterChips
          label="Program Year"
          options={programYearOpts}
          value={selProgramYear}
          onChange={setSelProgramYear}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={COLORS.teal} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* KPI row A — real Firestore data */}
          <View style={s.row}>
            <KpiCard
              icon="people"
              accent={COLORS.teal}
              label="Total Students"
              main={String(totalStudents)}
              sub={
                selJoinYear === "all" && selProgramYear === "all"
                  ? "all singers"
                  : [
                      selJoinYear !== "all" && joinYearLabel,
                      selProgramYear !== "all" && programYearLabel,
                    ]
                      .filter(Boolean)
                      .join(" · ")
              }
            />
            <KpiCard
              icon="checkmark-circle"
              accent={COLORS.teal}
              label="Avg Attendance"
              main={totalStudents === 0 ? "—" : `${avgAttendance}%`}
              sub={
                totalStudents === 0
                  ? "no singers in filter"
                  : "present vs absent"
              }
            />
          </View>

          {/* KPI row B — real gender data */}
          <View style={[s.row, { marginTop: 8 }]}>
            <KpiCard
              icon="female"
              accent={F_COLOR}
              label="Female"
              main={String(genderData.female)}
              sub={`${fPct}% of filtered`}
            />
            <KpiCard
              icon="male"
              accent={M_COLOR}
              label="Male"
              main={String(genderData.male)}
              sub={`${mPct}% of filtered`}
            />
          </View>

          {/* Attendance Trend — real per-year attendance % */}
          <View style={{ marginTop: 16 }}>
            <BrandCard barColor={COLORS.teal} title="Attendance % by year">
              <AreaTrendChart
                values={trendValues}
                labels={trendLabels}
                color={COLORS.teal}
                chartWidth={fullW - 32}
              />
            </BrandCard>
          </View>

          {/* Demographics row — real gender data */}
          <View style={[s.row, { marginTop: 8 }]}>
            <BrandCard
              barColor={COLORS.teal}
              title="Gender Split"
              style={{ width: halfW }}
            >
              <View style={{ alignItems: "center" }}>
                <DonutChart
                  female={genderData.female}
                  male={genderData.male}
                  size={108}
                />
                <View style={s.legend}>
                  <View style={s.lgItem}>
                    <View style={[s.lgDot, { backgroundColor: F_COLOR }]} />
                    <Text style={s.lgTxt}>F · {genderData.female}</Text>
                  </View>
                  <View style={s.lgItem}>
                    <View style={[s.lgDot, { backgroundColor: M_COLOR }]} />
                    <Text style={s.lgTxt}>M · {genderData.male}</Text>
                  </View>
                </View>
              </View>
            </BrandCard>

            <BrandCard
              barColor={COLORS.yellow}
              title="By Cohort"
              style={{ width: halfW }}
            >
              {cohortGenderData.length === 0 ? (
                <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                  No data
                </Text>
              ) : (
                cohortGenderData.map((g) => {
                  const frac = g.total > 0 ? g.female / g.total : 0;
                  return (
                    <View key={g.label} style={{ marginBottom: 8 }}>
                      <Text style={s.gLabel}>{g.label}</Text>
                      <View style={s.gBar}>
                        <View
                          style={[
                            s.gSeg,
                            { flex: frac || 0.01, backgroundColor: F_COLOR },
                          ]}
                        />
                        <View
                          style={[
                            s.gSeg,
                            {
                              flex: 1 - frac || 0.01,
                              backgroundColor: M_COLOR,
                            },
                          ]}
                        />
                      </View>
                      <Text style={s.gSub}>
                        {g.female}F · {g.male}M
                      </Text>
                    </View>
                  );
                })
              )}
            </BrandCard>
          </View>

          {/* Growth & Sessions row — real data */}
          <View style={[s.row, { marginTop: 8 }]}>
            <BrandCard
              barColor={COLORS.teal}
              title="Singers per join year"
              style={{ width: halfW }}
            >
              {yoyData.values.length > 0 ? (
                <BarChart
                  values={yoyData.values}
                  labels={yoyData.labels}
                  color={COLORS.teal}
                  chartWidth={halfW - 32}
                  chartHeight={130}
                />
              ) : (
                <View
                  style={{
                    height: 100,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                    No data
                  </Text>
                </View>
              )}
            </BrandCard>

            <BrandCard
              barColor={COLORS.yellow}
              title="Events per month"
              style={{ width: halfW }}
            >
              {sessionData.values.length > 0 ? (
                <BarChart
                  values={sessionData.values}
                  labels={sessionData.labels}
                  color={C_ORA}
                  accentMax
                  accentColor={C_TEAL}
                  chartWidth={halfW - 32}
                  chartHeight={130}
                />
              ) : (
                <View
                  style={{
                    height: 100,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                    No events
                  </Text>
                </View>
              )}
            </BrandCard>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  backBtn: { padding: 4, marginBottom: 4 },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
  },
  headerTitle: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 4 },
  filterBar: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  scroll: { padding: 16 },
  row: { flexDirection: "row", gap: 8 },
  legend: { flexDirection: "row", gap: 12, marginTop: 8 },
  lgItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  lgDot: { width: 8, height: 8, borderRadius: 4 },
  lgTxt: { fontSize: 11, color: COLORS.sub },
  gLabel: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 3,
  },
  gBar: {
    flexDirection: "row",
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: COLORS.border,
    marginBottom: 2,
  },
  gSeg: { height: 7 },
  gSub: { fontSize: 10, color: COLORS.muted },
});
