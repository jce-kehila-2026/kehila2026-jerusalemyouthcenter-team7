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
  role: UserRole;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  school_name?: string | null;
  voice_type?: string | null;
};

// All fields collected during student signup
export type StudentSignupPayload = {
  full_name: string;
  email?: string;
  phone: string;
  birth_date: string;
  address: string;
  neighborhood: string;
  gender: "male" | "female";
  nationality: string;
  age: number;
  school_name: string;
  shirt_size: "S" | "M" | "L" | "XL";
  voice_type: "bass" | "tenor" | "alto" | "soprano";
  year_joined: number;
  food_notes: "vegetarian" | "vegan" | "halal" | "kosher" | string;
  parent_relation: "father" | "mother";
  parent_name: string;
  parent_phone: string;
  medical_situation: string;
  password: string;
};

type AuthContextType = {
  user: UserType | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Students login with phone, admins with email
  login: (
    identifier: string,
    password: string,
    role: UserRole,
  ) => Promise<boolean>;
  // Only students self-register; admins are added manually in Firebase
  signupStudent: (payload: StudentSignupPayload) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Students auth email is derived from their phone number
const phoneToEmail = (phone: string) =>
  `${phone.replace(/\D/g, "")}@kehila.app`;

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app restart
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fb: User | null) => {
      if (fb) {
        try {
          // Check students collection first
          let snap = await getDoc(doc(db, "students", fb.uid));
          if (snap.exists()) {
            const d = snap.data();
            setUser({
              uid: fb.uid,
              role: "student",
              full_name: d.full_name,
              email: d.email ?? null,
              phone: d.phone ?? null,
              school_name: d.school_name ?? null,
              voice_type: d.voice_type ?? null,
            });
          } else {
            // Check admins collection
            snap = await getDoc(doc(db, "admins", fb.uid));
            if (snap.exists()) {
              const d = snap.data();
              setUser({
                uid: fb.uid,
                role: "admin",
                full_name: d.full_name,
                email: d.email ?? null,
                phone: d.phone ?? null,
              });
            } else {
              // UID in Auth but no Firestore doc — sign out for safety
              await signOut(auth);
              setUser(null);
            }
          }
        } catch (e) {
          console.log("Auth restore error:", e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (
    identifier: string,
    password: string,
    role: UserRole,
  ): Promise<boolean> => {
    try {
      // Students use phone→email, admins use their real email
      const firebaseEmail =
        role === "student" ? phoneToEmail(identifier) : identifier.trim();

      const result = await signInWithEmailAndPassword(
        auth,
        firebaseEmail,
        password,
      );
      const uid = result.user.uid;
      const collection = role === "admin" ? "admins" : "students";

      const snap = await getDoc(doc(db, collection, uid));
      if (!snap.exists()) {
        // Valid Firebase credentials but wrong role selected
        await signOut(auth);
        return false;
      }

      const d = snap.data();
      setUser({
        uid,
        role,
        full_name: d.full_name,
        email: d.email ?? null,
        phone: d.phone ?? null,
        school_name: d.school_name ?? null,
        voice_type: d.voice_type ?? null,
      });
      return true;
    } catch (e: any) {
      console.log("LOGIN ERROR:", e.message);
      return false;
    }
  };

  // ── Student signup ────────────────────────────────────────────────────────
  const signupStudent = async (
    payload: StudentSignupPayload,
  ): Promise<boolean> => {
    try {
      const { password, ...fields } = payload;

      const result = await createUserWithEmailAndPassword(
        auth,
        phoneToEmail(fields.phone),
        password,
      );
      const uid = result.user.uid;

      await setDoc(doc(db, "students", uid), {
        uid,
        role: "student",
        full_name: fields.full_name.trim(),
        email: fields.email?.trim() || null,
        phone: fields.phone.trim(),
        birth_date: fields.birth_date.trim(),
        address: fields.address.trim(),
        neighborhood: fields.neighborhood.trim(),
        gender: fields.gender,
        nationality: fields.nationality.trim(),
        age: fields.age,
        school_name: fields.school_name.trim(),
        shirt_size: fields.shirt_size,
        voice_type: fields.voice_type,
        year_joined: fields.year_joined,
        food_notes: fields.food_notes.trim(),
        parent_relation: fields.parent_relation,
        parent_phone: fields.parent_phone.trim(),
        createdAt: serverTimestamp(),
      });

      setUser({
        uid,
        role: "student",
        full_name: fields.full_name.trim(),
        email: fields.email?.trim() || null,
        phone: fields.phone.trim(),
        school_name: fields.school_name.trim(),
        voice_type: fields.voice_type,
      });

      return true;
    } catch (e: any) {
      console.log("SIGNUP ERROR:", e.message);
      return false;
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signupStudent,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
