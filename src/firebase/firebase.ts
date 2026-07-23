import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// Secondary app used ONLY for creating Firebase Auth accounts (admin → singer/admin creation)
// without replacing the currently logged-in admin's session.
const SECONDARY = "admin-creator";
const secondaryApp =
  getApps().find((a) => a.name === SECONDARY) ??
  initializeApp(firebaseConfig, SECONDARY);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const secondaryAuth = getAuth(secondaryApp);
export const auth = getAuth(app);
