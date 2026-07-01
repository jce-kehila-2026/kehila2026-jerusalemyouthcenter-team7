import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { AppState, AppStateStatus } from "react-native";
import { db } from "../firebase/firebase";

export const presenceService = {
  startTracking(uid: string): () => void {
    const userRef = doc(db, "users", uid);

    updateDoc(userRef, {
      is_online: true,
      last_seen: new Date().toISOString(),
    }).catch(() => {});

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        updateDoc(userRef, {
          is_online: nextState === "active",
          last_seen: new Date().toISOString(),
        }).catch(() => {});
      },
    );

    return () => {
      subscription.remove();
      updateDoc(userRef, {
        is_online: false,
        last_seen: new Date().toISOString(),
      }).catch(() => {});
    };
  },

  subscribeOnlineCount(callback: (count: number) => void): () => void {
    const q = query(
      collection(db, "users"),
      where("role", "==", "singer"),
      where("is_online", "==", true),
    );
    return onSnapshot(q, (snap) => callback(snap.size), () => callback(0));
  },

  subscribePresence(
    callback: (data: Record<string, { is_online: boolean; last_seen: string | null }>) => void,
  ): () => void {
    const q = query(collection(db, "users"), where("role", "==", "singer"));
    return onSnapshot(
      q,
      (snap) => {
        const map: Record<string, { is_online: boolean; last_seen: string | null }> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          map[d.id] = {
            is_online: data.is_online === true,
            last_seen: data.last_seen ?? null,
          };
        });
        callback(map);
      },
      () => callback({}),
    );
  },
};
