import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
  current_year_id?: number | null;
  group_id?: string | null;
  mustChangePassword?: boolean;
};

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
  voice_type: string;
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
  login: (
    identifier: string,
    password: string,
    role: UserRole,
  ) => Promise<boolean | "pending" | "rejected">;
  // Returns "submitted" on success, "rejected" if previously rejected, false if phone already registered, throws on other errors
  signupStudent: (
    payload: StudentSignupPayload,
  ) => Promise<"submitted" | "rejected" | false>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeSingerPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
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
  const isSigningUpRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fb: User | null) => {
      if (fb) {
        try {
          const snap = await getDoc(doc(db, "users", fb.uid));
          if (snap.exists()) {
            const d = snap.data();
            const userRole = d.role;

            // Only allow singer and admin roles to have an active session
            if (userRole !== "singer" && userRole !== "admin") {
              console.log("AUTH: blocking session restore for role:", userRole);
              if (!isSigningUpRef.current) {
                await signOut(auth);
              }
              setUser(null);
            } else {
              setUser({
                uid: fb.uid,
                role: userRole as UserRole,
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
                mustChangePassword: d.mustChangePassword ?? false,
              });
            }
          } else {
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
  ): Promise<boolean | "pending" | "rejected"> => {
    let email = identifier;
    let singerPhone = "";
    try {
      if (role === "singer") {
        singerPhone = normalizeSingerPhone(identifier);
        if (!singerPhone) {
          console.log("LOGIN ERROR: invalid singer phone", identifier);
          return false;
        }

        // Fast-path rejection check before Auth call
        const rejectedDoc = await getDoc(doc(db, "join_requests", singerPhone));
        if (rejectedDoc.exists()) {
          const rd = rejectedDoc.data();
          if (rd.status === "rejected") {
            console.log("LOGIN: phone is rejected");
            return "rejected";
          }
        }

        email = phoneToEmail(singerPhone);
      }

      console.log("LOGIN: attempting signInWithEmailAndPassword ->", email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = result.user;

      const snap = await getDoc(doc(db, "users", fbUser.uid));

      if (snap.exists()) {
        const d = snap.data();
        const userRole = d.role;

        if (userRole === "join-request") {
          console.log("LOGIN: user pending admin approval");
          await signOut(auth);
          return "pending";
        }

        if (userRole === "rejected") {
          console.log("LOGIN: user was rejected");
          await signOut(auth);
          return "rejected";
        }

        if (userRole !== role) {
          console.log(`LOGIN: role mismatch expected=${role} got=${userRole}`);
          await signOut(auth);
          return false;
        }

        setUser({
          uid: fbUser.uid,
          role: userRole as UserRole,
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
          mustChangePassword: d.mustChangePassword ?? false,
        });
        return true;
      } else {
        await signOut(auth);
        return false;
      }
    } catch (e: any) {
      console.log("LOGIN ERROR:", e.code ?? e.message ?? e);

      if (role === "singer") {
        const digits = normalizeSingerPhone(identifier);
        if (!digits) return false;

        const variants = new Set<string>([digits]);
        if (digits.startsWith("0")) variants.add("972" + digits.slice(1));
        if (digits.startsWith("972")) variants.add("0" + digits.slice(3));

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
              const userRole = d.role;

              if (userRole === "join-request") {
                await signOut(auth);
                return "pending";
              }
              if (userRole === "rejected") {
                await signOut(auth);
                return "rejected";
              }

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
                mustChangePassword: d.mustChangePassword ?? false,
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

  // ── Signup → creates Firebase Auth + users doc with role "join-request" ───
  // Admin must approve before the singer can log in.
  const signupStudent = async (
    payload: StudentSignupPayload,
  ): Promise<"submitted" | "rejected" | false> => {
    isSigningUpRef.current = true;
    try {
      const { password, ...fields } = payload;
      const phoneDigits = fields.phone.replace(/\D/g, "");

      // Block re-registration for previously rejected phones
      const rejectedDoc = await getDoc(doc(db, "join_requests", phoneDigits));
      if (rejectedDoc.exists() && rejectedDoc.data().status === "rejected") {
        console.log("SIGNUP: phone previously rejected");
        isSigningUpRef.current = false;
        return "rejected";
      }

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
          const result = await signInWithEmailAndPassword(
            auth,
            phoneToEmail(fields.phone),
            password,
          );
          const existing = await getDoc(doc(db, "users", result.user.uid));
          if (existing.exists()) {
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
        role: "join-request",
        status: "pending",
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
        parent_name: fields.parent_name.trim(),
        parent_phone: fields.parent_phone.trim(),
        medical_situation: fields.medical_situation.trim(),
        createdAt: serverTimestamp(),
      });

      // Sign out immediately — cannot use app until admin approves
      await signOut(auth);
      isSigningUpRef.current = false;
      return "submitted";
    } catch (e: any) {
      isSigningUpRef.current = false;
      console.log("SIGNUP ERROR:", e.message);
      throw e;
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
