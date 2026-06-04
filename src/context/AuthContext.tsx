import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole = "singer" | "admin";

export type UserType = {
  uid: string;
  role: UserRole;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  school_name?: string | null;
  voice_type?: string | null;
  current_year_id?: number | null; // Added for student's current year
  group_id?: string | null;
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
  nationality: "palestinian" | "israeli" | "other";
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
  ) => Promise<boolean | "pending" | "rejected">;
  // Singers submit a join request; admins approve/reject from their side
  submitJoinRequest: (payload: StudentSignupPayload) => Promise<boolean>;
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
          let snap = await getDoc(doc(db, "singers", fb.uid));
          if (snap.exists()) {
            const d = snap.data();
            setUser({
              uid: fb.uid,
              role: "singer",
              full_name: d.full_name,
              email: d.email ?? null,
              phone: d.phone ?? null,
              school_name: d.school_name ?? null,
              voice_type: d.voice_type
                ? String(d.voice_type).trim().toLowerCase()
                : null,
              group_id: d.group_id ?? null,
              current_year_id:
                d.year_id !== undefined
                  ? Number(d.year_id)
                  : d.year !== undefined && d.year !== null // Ensure d.year is not null
                    ? Number(d.year)
                    : null, // Default to null if no year is found
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

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (
    identifier: string,
    password: string,
    role: UserRole,
  ): Promise<boolean | "pending" | "rejected"> => {
    try {
      // Students use phone (mapped to email), Admins use direct email
      const email = role === "singer" ? phoneToEmail(identifier) : identifier;
      const result = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = result.user;

      // For singers: first check if they have a pending/rejected join request
      if (role === "singer") {
        const email = phoneToEmail(identifier);
        // Check join_requests by phone
        const reqQ = query(
          collection(db, "join_requests"),
          where("phone", "==", identifier.trim()),
        );
        const reqSnap = await getDocs(reqQ);
        if (!reqSnap.empty) {
          const reqData = reqSnap.docs[0].data();
          if (reqData.status === "pending") {
            await signOut(auth);
            return "pending"; // special signal
          }
          if (reqData.status === "rejected") {
            await signOut(auth);
            return "rejected"; // special signal
          }
        }
      }

      // Check the appropriate collection based on the intended role
      const collectionName = role === "singer" ? "singers" : "admins";
      const snap = await getDoc(doc(db, collectionName, fbUser.uid));

      if (snap.exists()) {
        const d = snap.data();
        if (role === "singer") {
          setUser({
            uid: fbUser.uid,
            role: "singer",
            full_name: d.full_name,
            email: d.email ?? null,
            phone: d.phone ?? null,
            school_name: d.school_name ?? null,
            voice_type: d.voice_type
              ? String(d.voice_type).trim().toLowerCase()
              : null,
            group_id: d.group_id ?? null,
            current_year_id:
              d.group_id !== undefined && d.group_id !== null
                ? Number(d.group_id)
                : d.year_id !== undefined
                  ? Number(d.year_id)
                  : null,
          });
        } else {
          setUser({
            uid: fbUser.uid,
            role: "admin",
            full_name: d.full_name,
            email: d.email ?? null,
            phone: d.phone ?? null,
          });
        }
        return true;
      } else {
        // Profile doesn't exist in the selected role's collection
        await signOut(auth);
        return false;
      }
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

      await setDoc(doc(db, "singers", uid), {
        uid,
        role: "singer",
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
        voice_type: fields.voice_type
          ? String(fields.voice_type).trim().toLowerCase()
          : null,
        year_id: 1, // Ensure year_id is saved to Firestore
        year_joined: fields.year_joined,
        food_notes: fields.food_notes.trim(),
        parent_relation: fields.parent_relation,
        parent_phone: fields.parent_phone.trim(),
        createdAt: serverTimestamp(),
      });

      setUser({
        uid,
        role: "singer",
        full_name: fields.full_name.trim(),
        email: fields.email?.trim() || null,
        phone: fields.phone.trim(),
        school_name: fields.school_name.trim(),
        voice_type: fields.voice_type
          ? String(fields.voice_type).trim().toLowerCase()
          : null,
        group_id: null,
        current_year_id: 1, // Default to Year 1 for new signups
      });

      return true;
    } catch (e: any) {
      console.log("SIGNUP ERROR:", e.message);
      return false;
    }
  };


  // ── Submit join request (pending approval by admin) ──────────────────────
  // NOTE: No Firebase Auth account is created here.
  // The singer CANNOT log in until admin approves and creates their account.
  const submitJoinRequest = async (
    payload: StudentSignupPayload,
  ): Promise<boolean> => {
    try {
      const { password, ...fields } = payload;

      // Use phone digits as document ID to prevent duplicates
      const requestId = fields.phone.replace(/\D/g, "");

      // Check for existing request
      const existing = await getDoc(doc(db, "join_requests", requestId));
      if (existing.exists()) {
        const d = existing.data();
        if (d.status === "pending" || d.status === "approved") {
          // Already submitted
          return false;
        }
      }

      await setDoc(doc(db, "join_requests", requestId), {
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
        voice_type: fields.voice_type
          ? String(fields.voice_type).trim().toLowerCase()
          : null,
        year_joined: fields.year_joined,
        food_notes: fields.food_notes ? fields.food_notes.trim() : "",
        parent_relation: fields.parent_relation,
        parent_phone: fields.parent_phone.trim(),
        parent_name: fields.parent_name.trim(),
        medical_situation: fields.medical_situation.trim(),
        _tempPassword: password, // used by admin to create the Auth account on approval
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Fire a notification so admin sees the bell badge immediately
      await addDoc(collection(db, "notifications"), {
        title: "New Singer Request 🎤",
        body: `${fields.full_name.trim()} has submitted a join request.`,
        type: "general",
        is_read: false,
        target_uid: "admin", // filtered to admins only
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (e: any) {
      console.log("JOIN REQUEST ERROR:", e.message);
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
        submitJoinRequest,
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