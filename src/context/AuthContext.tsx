import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";

type UserType = {
  uid: string;
  email: string | null;
  name?: string | null;
  phone?: string | null;
};

type AuthContextType = {
  user: UserType | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until Firebase resolves auth state

  // ─── Listen to Firebase auth state changes ───────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          // Try to enrich user object with Firestore profile data
          try {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: data.name ?? null,
                phone: data.phone ?? null,
              });
            } else {
              // Firestore doc missing (e.g. old account) — fall back to Auth data
              setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
            }
          } catch (err) {
            console.log("Firestore read error:", err);
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      },
    );

    return () => unsubscribe(); // cleanup on unmount
  }, []);

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged above will update the user state automatically
      return true;
    } catch (error: any) {
      console.log("LOGIN ERROR:", error.message);
      return false;
    }
  };

  // ─── Signup ───────────────────────────────────────────────────────────────
  const signup = async ({
    name,
    email,
    phone,
    password,
  }: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<boolean> => {
    try {
      // 1. Create the user in Firebase Auth
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const firebaseUser = result.user;

      // 2. Save profile data to Firestore — this is the critical DB write
      await setDoc(doc(db, "users", firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: firebaseUser.email,
        phone: phone?.trim() || null,
        createdAt: serverTimestamp(),
      });

      // 3. onAuthStateChanged will fire and set the user state automatically,
      //    but we proactively set it here too so the UI updates immediately
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: name.trim(),
        phone: phone?.trim() || null,
      });

      return true;
    } catch (error: any) {
      console.log("SIGNUP ERROR:", error.message);
      return false;
    }
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will set user to null automatically
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
