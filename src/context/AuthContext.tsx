import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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
    // ) => Promise<boolean | "pending" | "rejected">;
  ) => Promise<boolean>;
  // Singers submit a join request; admins approve/reject from their side
  // submitJoinRequest: (payload: StudentSignupPayload) => Promise<boolean>;
  signupStudent: (payload: StudentSignupPayload) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Students auth email is derived from their phone number
const normalizeSingerPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0") || digits.startsWith("972")) return digits;
  return digits;
};

const phoneToEmail = (phone: string) => {
  const digits = normalizeSingerPhone(phone);
  return digits ? `${digits}@kehila.app` : "";
};

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Prevents onAuthStateChanged from signing out the user mid-signup
  const isSigningUpRef = useRef(false);

  // Restore session on app restart
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fb: User | null) => {
      if (fb) {
        try {
          // Check users collection and load user by role
          const snap = await getDoc(doc(db, "users", fb.uid));
          if (snap.exists()) {
            const d = snap.data();
            const userRole = d.role as UserRole;
            setUser({
              uid: fb.uid,
              role: userRole,
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
                  : d.year !== undefined && d.year !== null
                    ? Number(d.year)
                    : null,
            });
          } else {
            // UID in Auth but no Firestore doc — only sign out if not mid-signup
            if (!isSigningUpRef.current) {
              await signOut(auth);
            }
            setUser(null);
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
    // ): Promise<boolean | "pending" | "rejected"> => {
  ): Promise<boolean> => {
    let email = identifier;
    let singerPhone = "";
    try {
      if (role === "singer") {
        singerPhone = normalizeSingerPhone(identifier);
        if (!singerPhone) {
          console.log("LOGIN ERROR: invalid singer phone", identifier);
          return false;
        }

        // // If the phone request already exists, return pending/rejected state before trying auth
        // const requestDoc = await getDoc(doc(db, "join_requests", singerPhone));
        // if (requestDoc.exists()) {
        //   const requestData = requestDoc.data();
        //   if (requestData.status === "pending") {
        //     return "pending";
        //   }
        //   if (requestData.status === "rejected") {
        //     return "rejected";
        //   }
        // }

        email = phoneToEmail(singerPhone);
      }

      console.log("LOGIN: attempting signInWithEmailAndPassword ->", email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = result.user;

      // // For singers: if a join request still exists, do not allow login until approved
      // if (role === "singer") {
      //   const requestDoc = await getDoc(doc(db, "join_requests", singerPhone));
      //   if (requestDoc.exists()) {
      //     const requestData = requestDoc.data();
      //     if (requestData.status === "pending") {
      //       await signOut(auth);
      //       return "pending";
      //     }
      //     if (requestData.status === "rejected") {
      //       await signOut(auth);
      //       return "rejected";
      //     }
      //   }
      // }

      // Check users collection and verify role matches
      const snap = await getDoc(doc(db, "users", fbUser.uid));

      if (snap.exists()) {
        const d = snap.data();
        const userRole = d.role as UserRole;

        // Verify the user has the expected role
        if (userRole !== role) {
          console.log(`Role mismatch: expected ${role}, got ${userRole}`);
          await signOut(auth);
          return false;
        }

        setUser({
          uid: fbUser.uid,
          role: userRole,
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
              : d.year !== undefined && d.year !== null
                ? Number(d.year)
                : null,
        });
        return true;
      } else {
        // Profile doesn't exist in users collection
        await signOut(auth);
        return false;
      }
    } catch (e: any) {
      console.log("LOGIN ERROR:", e.code ?? e.message ?? e);

      if (role === "singer") {
        const digits = normalizeSingerPhone(identifier);
        if (!digits) {
          return false;
        }

        const variants = new Set<string>([digits]);
        if (digits.startsWith("0")) {
          variants.add("972" + digits.slice(1));
        }
        if (digits.startsWith("972")) {
          variants.add("0" + digits.slice(3));
        }

        for (const v of variants) {
          const tryEmail = `${v}@kehila.app`;
          if (tryEmail === email) continue;
          try {
            console.log("LOGIN: retrying with variant ->", tryEmail);
            const res = await signInWithEmailAndPassword(
              auth,
              tryEmail,
              password,
            );
            const fbUser = res.user;

            const snap = await getDoc(doc(db, "users", fbUser.uid));
            if (snap.exists()) {
              const d = snap.data();
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
                  d.year_id !== undefined
                    ? Number(d.year_id)
                    : d.year !== undefined && d.year !== null
                      ? Number(d.year)
                      : null,
              });
              return true;
            } else {
              await signOut(auth);
            }
          } catch (err: any) {
            console.log(
              "variant login failed:",
              err?.code ?? err?.message ?? err,
            );
          }
        }
      }

      return false;
    }
  };

  // ── Student signup ────────────────────────────────────────────────────────
  const signupStudent = async (
    payload: StudentSignupPayload,
  ): Promise<boolean> => {
    isSigningUpRef.current = true;
    try {
      const { password, ...fields } = payload;

      let uid: string;

      try {
        const result = await createUserWithEmailAndPassword(
          auth,
          phoneToEmail(fields.phone),
          password,
        );
        uid = result.user.uid;
      } catch (authErr: any) {
        if (authErr.code === "auth/email-already-in-use") {
          // Auth account exists from a previously interrupted signup attempt.
          // Sign in and complete the Firestore write if the profile doc is still missing.
          const result = await signInWithEmailAndPassword(
            auth,
            phoneToEmail(fields.phone),
            password,
          );
          const existing = await getDoc(doc(db, "users", result.user.uid));
          if (existing.exists()) {
            // Fully registered — user should log in instead
            await signOut(auth);
            isSigningUpRef.current = false;
            return false;
          }
          uid = result.user.uid;
        } else {
          throw authErr;
        }
      }

      await setDoc(doc(db, "users", uid!), {
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
        year_id: 1,
        year_joined: fields.year_joined,
        food_notes: fields.food_notes.trim(),
        parent_relation: fields.parent_relation,
        parent_phone: fields.parent_phone.trim(),
        createdAt: serverTimestamp(),
      });

      setUser({
        uid: uid!,
        role: "singer",
        full_name: fields.full_name.trim(),
        email: fields.email?.trim() || null,
        phone: fields.phone.trim(),
        school_name: fields.school_name.trim(),
        voice_type: fields.voice_type
          ? String(fields.voice_type).trim().toLowerCase()
          : null,
        group_id: null,
        current_year_id: 1,
      });

      isSigningUpRef.current = false;
      return true;
    } catch (e: any) {
      isSigningUpRef.current = false;
      console.log("SIGNUP ERROR:", e.message);
      return false;
    }
  };

  // ── Submit join request (pending approval by admin) ──────────────────────
  // NOTE: No Firebase Auth account is created here.
  // The singer CANNOT log in until admin approves and creates their account.
  // const submitJoinRequest = async (
  //   payload: StudentSignupPayload,
  // ): Promise<boolean> => {
  //   try {
  //     const { password, ...fields } = payload;

  //     // Use phone digits as document ID to prevent duplicates
  //     const requestId = fields.phone.replace(/\D/g, "");

  //     // Check for existing request
  //     const existing = await getDoc(doc(db, "join_requests", requestId));
  //     if (existing.exists()) {
  //       const d = existing.data();
  //       if (d.status === "pending" || d.status === "approved") {
  //         // Already submitted
  //         return false;
  //       }
  //     }

  //     await setDoc(doc(db, "join_requests", requestId), {
  //       full_name: fields.full_name.trim(),
  //       email: fields.email?.trim() || null,
  //       phone: fields.phone.trim(),
  //       birth_date: fields.birth_date.trim(),
  //       address: fields.address.trim(),
  //       neighborhood: fields.neighborhood.trim(),
  //       gender: fields.gender,
  //       nationality: fields.nationality.trim(),
  //       age: fields.age,
  //       school_name: fields.school_name.trim(),
  //       shirt_size: fields.shirt_size,
  //       voice_type: fields.voice_type
  //         ? String(fields.voice_type).trim().toLowerCase()
  //         : null,
  //       year_joined: fields.year_joined,
  //       food_notes: fields.food_notes ? fields.food_notes.trim() : "",
  //       parent_relation: fields.parent_relation,
  //       parent_phone: fields.parent_phone.trim(),
  //       parent_name: fields.parent_name.trim(),
  //       medical_situation: fields.medical_situation.trim(),
  //       _tempPassword: password, // used by admin to create the Auth account on approval
  //       status: "pending",
  //       createdAt: serverTimestamp(),
  //     });

  // Fire a notification so admins see the bell badge immediately
  // Query for all admin users and send them the notification
  //     const adminQ = query(
  //       collection(db, "users"),
  //       where("role", "==", "admin"),
  //     );
  //     const adminSnap = await getDocs(adminQ);

  //     for (const adminDoc of adminSnap.docs) {
  //       await addDoc(collection(db, "notifications"), {
  //         title: "New Singer Request 🎤",
  //         body: `${fields.full_name.trim()} has submitted a join request.`,
  //         type: "general",
  //         is_read: false,
  //         target_uid: adminDoc.id, // send to each admin
  //         timestamp: new Date().toISOString(),
  //       });
  //     }

  //     return true;
  //   } catch (e: any) {
  //     console.log("JOIN REQUEST ERROR:", e.message);
  //     return false;
  //   }
  // };

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
        // submitJoinRequest,
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
