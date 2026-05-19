import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

export type FirestoreMsg = {
  id: string;
  sender_id: string;       // Firebase uid, or 'admin'
  sender_name: string;
  receiver_id: string;     // Firebase uid, or 'admin'
  content: string;
  timestamp: string;       // ISO string
  is_read: boolean;
};

export const messageService = {
  // Subscribe to all messages ordered by time; returns the unsubscribe function.
  subscribe(callback: (msgs: FirestoreMsg[]) => void): () => void {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(
      q,
      snapshot => {
        const msgs: FirestoreMsg[] = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<FirestoreMsg, 'id'>),
        }));
        callback(msgs);
      },
      error => {
        if (error.code === 'permission-denied') {
          console.error(
            '[messageService] Firestore permission denied.\n' +
            'Go to Firebase Console → Firestore → Rules and set:\n' +
            '  match /messages/{msg} { allow read, write: if request.auth != null; }'
          );
        } else {
          console.error('[messageService] Listener error:', error.code, error.message);
        }
        callback([]);
      },
    );
  },

  async send(data: Omit<FirestoreMsg, 'id'>): Promise<void> {
    await addDoc(collection(db, 'messages'), {
      ...data,
      timestamp: new Date().toISOString(),
      is_read: false,
    });
  },

  async markRead(messageId: string): Promise<void> {
    await updateDoc(doc(db, 'messages', messageId), { is_read: true });
  },
};
