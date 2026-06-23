import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export type LeaderboardEntry = {
  uid: string;
  name: string;
  voice_type: string;
  points: number;
};

export type PointReason =
  | "register_event"
  | "submit_form"
  | "open_library_file"
  | "attend_rehearsal"
  | "complete_profile"
  | "update_contact"
  | "on_time"
  | "help_member"
  | "active_rehearsal"
  | "bring_friend"
  | "perfect_attendance"
  | "all_forms"
  | "first_register";

const DEFAULT_POINTS: Record<PointReason, number> = {
  register_event:     10,
  submit_form:         5,
  open_library_file:   5,
  attend_rehearsal:   15,
  complete_profile:    5,
  update_contact:      5,
  on_time:            10,
  help_member:        10,
  active_rehearsal:   10,
  bring_friend:       15,
  perfect_attendance: 20,
  all_forms:          15,
  first_register:     20,
};

// Maps PointReason to the challenge id used in leaderboard_config
const REASON_TO_CHALLENGE_ID: Record<PointReason, string> = {
  register_event:     "register_event",
  submit_form:        "submit_form",
  open_library_file:  "visit_library",
  attend_rehearsal:   "attend_rehearsal",
  complete_profile:   "complete_profile",
  update_contact:     "update_contact",
  on_time:            "on_time",
  help_member:        "help_member",
  active_rehearsal:   "active_rehearsal",
  bring_friend:       "bring_friend",
  perfect_attendance: "perfect_attendance",
  all_forms:          "all_forms",
  first_register:     "first_register",
};

export const leaderboardService = {
  async awardPoints(
    uid: string,
    name: string,
    voice_type: string,
    reason: PointReason,
  ): Promise<void> {
    try {
      let pts = DEFAULT_POINTS[reason];
      const challengeId = REASON_TO_CHALLENGE_ID[reason];
      try {
        const cfgSnap = await getDoc(doc(db, "leaderboard_config", "active"));
        if (cfgSnap.exists()) {
          const cfg = cfgSnap.data() as any;
          const challenges: any[] = cfg.challenges ?? [];
          const match = challenges.find((c: any) => c.id === challengeId);
          if (match && !match.active) return; // challenge disabled by admin
          if (match && typeof match.points === "number") pts = match.points;
        }
      } catch {
        // config read failed — use default points
      }

      const ref = doc(db, "leaderboard", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { points: increment(pts) });
      } else {
        await setDoc(ref, { uid, name, voice_type: voice_type ?? "", points: pts });
      }
    } catch (e) {
      console.error("[leaderboardService] awardPoints error:", e);
    }
  },

  subscribe(callback: (entries: LeaderboardEntry[]) => void): () => void {
    const q = query(collection(db, "leaderboard"), orderBy("points", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        callback(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })));
      },
      (err) => {
        console.error("[leaderboardService] listener error:", err);
        callback([]);
      },
    );
  },

  async getAll(): Promise<LeaderboardEntry[]> {
    try {
      const snap = await getDocs(
        query(collection(db, "leaderboard"), orderBy("points", "desc")),
      );
      return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
    } catch (e) {
      console.error("[leaderboardService] getAll error:", e);
      return [];
    }
  },
};
