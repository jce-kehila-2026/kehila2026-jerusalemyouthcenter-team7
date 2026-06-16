import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/src/firebase/firebase";

// ── Post type ─────────────────────────────────────────────────────────────────
export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  avatarColor: string;
  timestamp: string; // ISO string
  location?: string;
  badgeTag?: string;
  text: string;
  photoUrls?: string[];
  likeCount: number;
  likedByCurrentUser: boolean;
  commentCount: number;
  postType: "shoutout" | "badge" | "streak" | "general";
};

type RawPost = Omit<Post, "id" | "likedByCurrentUser"> & {
  likedBy: string[];
  timestamp: any;
};

// ── Firestore collection name ─────────────────────────────────────────────────
const COLLECTION = "feed_posts";

// ── Avatar color palette (deterministic from name) ────────────────────────────
const AVATAR_COLORS = [
  "#039899", "#c56451", "#cfad5d", "#6b5ce7", "#22c55e", "#e84393",
];
export function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ── Sample seed posts (shown while collection is empty) ───────────────────────
export const SEED_POSTS: Post[] = [
  {
    id: "seed-1",
    authorId: "seed",
    authorName: "Yara Mansour",
    avatarColor: "#039899",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    location: "Rehearsal Room B",
    badgeTag: "🏆 Champion",
    text: "Amazing rehearsal today! So proud of everyone who hit the high notes. This choir keeps getting better 🎵",
    likeCount: 14,
    likedByCurrentUser: false,
    commentCount: 3,
    postType: "general",
  },
  {
    id: "seed-2",
    authorId: "system",
    authorName: "Chorus",
    avatarColor: "#cfad5d",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    badgeTag: "🔥 Streak",
    text: "🎉 **Omar Khalil** just hit a 10-day rehearsal streak! Keep the momentum going!",
    likeCount: 22,
    likedByCurrentUser: false,
    commentCount: 7,
    postType: "streak",
  },
  {
    id: "seed-3",
    authorId: "seed",
    authorName: "Layla Hassan",
    avatarColor: "#c56451",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    location: "Main Hall",
    text: "Shoutout to **Noor Saleh** for absolutely crushing the solo today — you've come so far! 🌟",
    likeCount: 31,
    likedByCurrentUser: false,
    commentCount: 11,
    postType: "shoutout",
  },
];

export const feedService = {
  /**
   * Subscribe to feed posts in real-time (newest first).
   * Falls back to SEED_POSTS when the collection is empty.
   */
  subscribe(
    currentUserId: string,
    pageLimit: number,
    callback: (posts: Post[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTION),
      orderBy("timestamp", "desc"),
      limit(pageLimit)
    );

    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          callback(SEED_POSTS.slice(0, pageLimit));
          return;
        }
        const posts: Post[] = snap.docs.map((d) => {
          const raw = d.data() as RawPost;
          return {
            id: d.id,
            authorId: raw.authorId,
            authorName: raw.authorName,
            avatarColor: raw.avatarColor,
            timestamp:
              raw.timestamp?.toDate?.()?.toISOString?.() ??
              new Date().toISOString(),
            location: raw.location,
            badgeTag: raw.badgeTag,
            text: raw.text,
            photoUrls: raw.photoUrls,
            likeCount: raw.likeCount ?? 0,
            likedByCurrentUser: (raw.likedBy ?? []).includes(currentUserId),
            commentCount: raw.commentCount ?? 0,
            postType: raw.postType ?? "general",
          };
        });
        callback(posts);
      },
      () => {
        // Firestore permission error — fall back to seed data
        callback(SEED_POSTS.slice(0, pageLimit));
      }
    );
  },

  /** Upload local image URIs to Firebase Storage. Returns download URLs. */
  async uploadPostPhotos(
    localUris: string[],
    authorId: string
  ): Promise<string[]> {
    return Promise.all(
      localUris.map(async (uri) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = ref(
          storage,
          `feed_photos/${authorId}_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );
        await uploadBytes(storageRef, blob);
        return getDownloadURL(storageRef);
      })
    );
  },

  /** User-generated post (text + optional photos). */
  async createUserPost(
    author: { id: string; name: string; avatarColor: string },
    text: string,
    photoUrls: string[] = []
  ): Promise<void> {
    await addDoc(collection(db, COLLECTION), {
      authorId: author.id,
      authorName: author.name,
      avatarColor: author.avatarColor,
      timestamp: serverTimestamp(),
      text,
      photoUrls,
      likeCount: 0,
      likedBy: [],
      commentCount: 0,
      postType: "general",
    });
  },

  async toggleLike(
    postId: string,
    currentUserId: string,
    isCurrentlyLiked: boolean
  ): Promise<void> {
    const r = doc(db, COLLECTION, postId);
    await updateDoc(r, {
      likedBy: isCurrentlyLiked
        ? arrayRemove(currentUserId)
        : arrayUnion(currentUserId),
      likeCount: increment(isCurrentlyLiked ? -1 : 1),
    });
  },

  /** Auto-post: member earned a badge. */
  async createBadgePost(
    _userId: string,
    userName: string,
    badgeName: string,
    badgeEmoji: string
  ): Promise<void> {
    await addDoc(collection(db, COLLECTION), {
      authorId: "system",
      authorName: "Chorus",
      avatarColor: "#cfad5d",
      timestamp: serverTimestamp(),
      badgeTag: `${badgeEmoji} ${badgeName}`,
      text: `🏅 **${userName}** just earned the **${badgeName}** badge!`,
      photoUrls: [],
      likeCount: 0,
      likedBy: [],
      commentCount: 0,
      postType: "badge",
    });
  },

  /** Auto-post: member hit a rehearsal streak milestone. */
  async createStreakPost(
    _userId: string,
    userName: string,
    streakDays: number
  ): Promise<void> {
    await addDoc(collection(db, COLLECTION), {
      authorId: "system",
      authorName: "Chorus",
      avatarColor: "#039899",
      timestamp: serverTimestamp(),
      badgeTag: "🔥 Streak",
      text: `🔥 **${userName}** just hit a ${streakDays}-day rehearsal streak! Keep it up!`,
      photoUrls: [],
      likeCount: 0,
      likedBy: [],
      commentCount: 0,
      postType: "streak",
    });
  },

  /**
   * Member shoutout — call from profile screen or a "New Post" button.
   * Example: feedService.createShoutoutPost(fromUser, toUser, "Amazing harmony today!")
   */
  async createShoutoutPost(
    fromUser: { id: string; name: string; avatarColor: string },
    toUser: { id: string; name: string },
    text: string
  ): Promise<void> {
    await addDoc(collection(db, COLLECTION), {
      authorId: fromUser.id,
      authorName: fromUser.name,
      avatarColor: fromUser.avatarColor,
      timestamp: serverTimestamp(),
      badgeTag: "💌 Shoutout",
      text: `Shoutout to **${toUser.name}** — ${text}`,
      photoUrls: [],
      likeCount: 0,
      likedBy: [],
      commentCount: 0,
      postType: "shoutout",
    });
  },
};
