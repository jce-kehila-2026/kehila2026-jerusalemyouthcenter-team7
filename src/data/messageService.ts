import {
    addDoc,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export type MsgType = "text" | "image" | "file" | "audio" | "voice";

export type FirestoreMsg = {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id?: string;   // absent for group messages
  receiver_name?: string;
  group_id?: string;      // present only for group-chat messages
  content: string;
  type: MsgType;
  fileName?: string;
  fileSize?: string;
  duration?: number;
  timestamp: string;
  is_read: boolean;
  reactions?: Record<string, string>;
  reply_to?: { id: string; content: string; sender_name: string; type: string };
};

export const messageService = {
  subscribe(callback: (msgs: FirestoreMsg[]) => void): () => void {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: FirestoreMsg[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FirestoreMsg, "id">),
        }));
        callback(msgs);
      },
      (error) => {
        if (error.code === "permission-denied") {
          console.error(
            "[messageService] Firestore permission denied.\n" +
              "Go to Firebase Console → Firestore → Rules and set:\n" +
              "  match /messages/{msg} { allow read, write: if request.auth != null; }",
          );
        } else {
          console.error(
            "[messageService] Listener error:",
            error.code,
            error.message,
          );
        }
        callback([]);
      },
    );
  },

  async send(data: Omit<FirestoreMsg, "id">): Promise<void> {
    const payload = Object.fromEntries(
      Object.entries({ ...data, timestamp: new Date().toISOString(), is_read: false })
        .filter(([, v]) => v !== undefined),
    );
    await addDoc(collection(db, "messages"), payload);
  },

  async markRead(messageId: string): Promise<void> {
    await updateDoc(doc(db, "messages", messageId), { is_read: true });
  },

  async addReaction(messageId: string, uid: string, emoji: string): Promise<void> {
    await updateDoc(doc(db, "messages", messageId), {
      [`reactions.${uid}`]: emoji,
    });
  },

  async removeReaction(messageId: string, uid: string): Promise<void> {
    await updateDoc(doc(db, "messages", messageId), {
      [`reactions.${uid}`]: deleteField(),
    });
  },

  async deleteMessage(messageId: string): Promise<void> {
    await deleteDoc(doc(db, "messages", messageId));
  },

  subscribeUnreadCount(uid: string, callback: (count: number) => void): () => void {
    const q = query(
      collection(db, "messages"),
      where("receiver_id", "==", uid),
      where("is_read", "==", false),
    );
    return onSnapshot(
      q,
      (snap) => callback(snap.size),
      (err) => {
        console.error("[messageService] subscribeUnreadCount error:", err);
        callback(0);
      },
    );
  },
};

// ── Chat Groups ────────────────────────────────────────────────────────────
// Completely separate from chorus student groups ("groups" collection).
// Chat group data lives only in the "chat_groups" Firestore collection.

export type ChatGroup = {
  id: string;
  name: string;
  created_by: string;
  members: string[];  // array of participant UIDs
  created_at: string;
};

export const chatGroupService = {
  async getChatGroups(): Promise<ChatGroup[]> {
    const snap = await getDocs(collection(db, "chat_groups"));
    return snap.docs.map((d) => ({
      ...(d.data() as Omit<ChatGroup, "id">),
      id: d.id,
    }));
  },

  async createChatGroup(
    name: string,
    members: string[],
    createdBy: string,
  ): Promise<string> {
    const ref = await addDoc(collection(db, "chat_groups"), {
      name,
      members,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      is_chat_group: true,
    });
    return ref.id;
  },

  async updateChatGroup(
    id: string,
    name: string,
    members: string[],
  ): Promise<void> {
    await updateDoc(doc(db, "chat_groups", id), { name, members });
  },

  async deleteChatGroup(id: string): Promise<void> {
    await deleteDoc(doc(db, "chat_groups", id));
  },
};
