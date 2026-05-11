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

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole = "student" | "admin";

export type UserType = {
  uid: string;
  email: string | null;
  name?: string | null;
  phone?: string | null;
  role: UserRole;
};

type AuthContextType = {
  user: UserType | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  signup: (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
  }) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app restart — check both collections
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          try {
            // Try students first, then admins
            let userDoc = await getDoc(doc(db, "students", firebaseUser.uid));
            let role: UserRole = "student";

            if (!userDoc.exists()) {
              userDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
              role = "admin";
            }

            if (userDoc.exists()) {
              const data = userDoc.data();
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: data.name ?? null,
                phone: data.phone ?? null,
                role,
              });
            } else {
              // Not found in either collection — force sign out
              await signOut(auth);
              setUser(null);
            }
          } catch (err) {
            console.log("Firestore read error:", err);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  // Role is passed from the UI — we verify the user exists in that collection
  // so a student cannot log in using the admin toggle (and vice-versa).
  const login = async (
    email: string,
    password: string,
    role: UserRole,
  ): Promise<boolean> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;
      const collection = role === "admin" ? "admins" : "students";

      const userDoc = await getDoc(doc(db, collection, uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        return false; // wrong role selected
      }

      const data = userDoc.data();
      setUser({
        uid,
        email: result.user.email,
        name: data.name ?? null,
        phone: data.phone ?? null,
        role,
      });

      return true;
    } catch (error: any) {
      console.log("LOGIN ERROR:", error.message);
      return false;
    }
  };

  // ── Signup ────────────────────────────────────────────────────────────────
  const signup = async ({
    name,
    email,
    phone,
    password,
    role,
  }: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
  }): Promise<boolean> => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const firebaseUser = result.user;

      // Write to role-specific Firestore collection
      const collection = role === "admin" ? "admins" : "students";
      await setDoc(doc(db, collection, firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: firebaseUser.email,
        phone: phone?.trim() || null,
        role,
        createdAt: serverTimestamp(),
      });

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: name.trim(),
        phone: phone?.trim() || null,
        role,
      });

      return true;
    } catch (error: any) {
      console.log("SIGNUP ERROR:", error.message);
      return false;
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will set user → null
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
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
