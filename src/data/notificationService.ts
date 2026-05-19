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

export type FirestoreNotification = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  is_read: boolean;
  type: 'event' | 'message' | 'form' | 'general';
  target_uid?: string; // if set, only shown to this user; absent = show to everyone
};

export const notificationService = {
  /**
   * Subscribe to notifications in real time.
   * Pass targetUid for a student (filters to their notifications + global ones).
   * Omit targetUid for admin (sees all notifications).
   */
  subscribe(
    callback: (notifications: FirestoreNotification[]) => void,
    targetUid?: string,
  ): () => void {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      snapshot => {
        let notifs: FirestoreNotification[] = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<FirestoreNotification, 'id'>),
        }));

        // Students only see notifications aimed at them or at everyone
        if (targetUid) {
          notifs = notifs.filter(n => !n.target_uid || n.target_uid === targetUid);
        }

        callback(notifs);
      },
      error => {
        if (error.code === 'permission-denied') {
          console.error(
            '[notificationService] Firestore permission denied.\n' +
            'Add to rules: match /notifications/{n} { allow read, write: if request.auth != null; }',
          );
        } else {
          console.error('[notificationService] Listener error:', error.code, error.message);
        }
        callback([]);
      },
    );
  },

  /** Create a notification document. target_uid scopes it to one user; omit for all admins. */
  async create(data: Omit<FirestoreNotification, 'id'>): Promise<void> {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      timestamp: new Date().toISOString(),
      is_read: false,
    });
  },

  async markRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId), { is_read: true });
  },

  async markAllRead(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => updateDoc(doc(db, 'notifications', id), { is_read: true })));
  },
};
