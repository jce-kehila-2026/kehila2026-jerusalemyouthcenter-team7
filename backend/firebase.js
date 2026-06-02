// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB8ni5Y-YQ2e1SVSXysRTzdpVqVbNp4LAM",
  authDomain: "fullstack-team-7.firebaseapp.com",
  projectId: "fullstack-team-7",
  storageBucket: "fullstack-team-7.firebasestorage.app",
  messagingSenderId: "410116734350",
  appId: "1:410116734350:web:59c58e19ea0727151af8df",
  measurementId: "G-VGWWGK2EPZ",
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
