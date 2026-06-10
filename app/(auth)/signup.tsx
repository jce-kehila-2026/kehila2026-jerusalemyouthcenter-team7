import { StudentSignupPayload, useAuth } from "@/src/context/AuthContext";
import { COLORS } from "@/src/data/mockData";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// ── Bird logo ─────────────────────────────────────────────────────────────────
function BirdLogo({ size = 80 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black", // important
      }}
    >
      <Image
        source={require("../../assets/images/bird-logo.jpeg")}
        style={{ width: size * 0.9, height: size * 0.9, resizeMode: "contain" }}
      />
    </View>
  );
}

// ── Reusable label ────────────────────────────────────────────────────────────
function FL({
  text,
  req,
  opt,
}: {
  text: string;
  req?: boolean;
  opt?: boolean;
}) {
  return (
    <Text style={f.label}>
      {text}
      {req && <Text style={{ color: COLORS.red }}> *</Text>}
      {opt && (
        <Text
          style={{
            color: COLORS.gray,
            fontWeight: "400",
            textTransform: "none",
          }}
        >
          {" "}
          (optional)
        </Text>
      )}
    </Text>
  );
}

// ── Pill picker ───────────────────────────────────────────────────────────────
function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <View style={f.row}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={[
            f.pill,
            value === o.value && {
              backgroundColor: COLORS.teal,
              borderColor: COLORS.teal,
            },
          ]}
          onPress={() => onChange(o.value)}
        >
          <Text
            style={[
              f.pillTxt,
              value === o.value && { color: COLORS.white, fontWeight: "700" },
            ]}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const f = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334",
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.grayLight,
  },
  pillTxt: { fontSize: 13, color: COLORS.gray },
});

// ── Step bar ──────────────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < current ? COLORS.teal : COLORS.border,
            }}
          />
        ))}
      </View>
      <Text
        style={{
          fontSize: 11,
          color: COLORS.gray,
          marginTop: 6,
          textAlign: "right",
        }}
      >
        Step {current} of {total}
      </Text>
    </View>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────
type FormState = {
  full_name: string;
  email: string;
  phone: string;
  birth_date: string;
  address: string;
  neighborhood: string;
  gender: "male" | "female" | "";
  nationality: "Palestinian" | "Israeli" | "Other" | "";
  age: string;
  school_name: string;
  shirt_size: "S" | "M" | "L" | "XL" | "";
  voice_type: "bass" | "tenor" | "alto" | "soprano" | "";
  year_joined: string;
  food_notes: "vegetarian" | "vegan" | "halal" | "kosher" | string;
  parent_relation: "father" | "mother" | "";
  parent_name: string;
  parent_phone: string;
  medical_situation: string;
  password: string;
  confirm: string;
};

const EMPTY: FormState = {
  full_name: "",
  email: "",
  phone: "",
  birth_date: "",
  address: "",
  neighborhood: "",
  gender: "",
  nationality: "",
  age: "",
  school_name: "",
  shirt_size: "",
  voice_type: "",
  year_joined: String(new Date().getFullYear()),
  food_notes: "",
  parent_relation: "",
  parent_name: "",
  parent_phone: "",
  medical_situation: "",
  password: "",
  confirm: "",
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SignupScreen() {
  const { submitJoinRequest } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const set = (k: keyof FormState) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const inp = (k: string) => [
    s.input,
    focused === k && {
      borderColor: COLORS.teal,
      backgroundColor: COLORS.white,
    },
  ];

  const fld = (k: keyof FormState) => ({
    value: form[k] as string,
    onChangeText: set(k),
    onFocus: () => setFocused(k),
    onBlur: () => setFocused(null),
  });

  // ── Validation per step ───────────────────────────────────────────────────
  const validate = (): string | null => {
    if (step === 1) {
      if (!form.full_name.trim()) return "Full name is required";
      if (!form.phone.trim()) return "Phone number is required";
      if (!form.email.trim()) return "Email is required";
      if (!form.birth_date.trim()) return "Date of birth is required";
      if (!form.gender) return "Please select your gender";
      if (!form.nationality) return "Please select your nationality";
      if (!form.age.trim()) return "Age is required";
      if (isNaN(Number(form.age))) return "Age must be a number";
      if (!form.address.trim()) return "Address is required";
      if (!form.neighborhood.trim()) return "Neighborhood is required";
    }
    if (step === 2) {
      if (!form.school_name.trim()) return "School name is required";
      if (!form.shirt_size) return "Please select your shirt size";
      if (!form.voice_type) return "Please select your voice type";
      if (!form.year_joined.trim()) return "Year joined is required";
      if (isNaN(Number(form.year_joined))) return "Year must be a valid number";
    }
    if (step === 3) {
      if (!form.parent_relation) return "Please select parent / guardian";
      if (!form.parent_phone.trim()) return "Parent phone number is required";
      if (!form.parent_name.trim()) return "Parent name is required";
      if (!form.medical_situation.trim())
        return "Medical situation is required";
      if (!form.password) return "Password is required";
      if (form.password.length < 6)
        return "Password must be at least 6 characters";
      if (form.password !== form.confirm) return "Passwords do not match";
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((p) => p + 1);
  };

  const back = () => {
    setError("");
    setStep((p) => p - 1);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoading(true);

    const payload: StudentSignupPayload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      birth_date: form.birth_date.trim(),
      address: form.address.trim(),
      neighborhood: form.neighborhood.trim(),
      gender: form.gender as "male" | "female",
      nationality: form.nationality.toLowerCase() as
        | "palestinian"
        | "israeli"
        | "other",
      age: parseInt(form.age, 10),
      school_name: form.school_name.trim(),
      shirt_size: form.shirt_size as "S" | "M" | "L" | "XL",
      voice_type: form.voice_type as "bass" | "tenor" | "alto" | "soprano",
      year_joined: parseInt(form.year_joined, 10),
      food_notes: form.food_notes as
        | "vegetarian"
        | "vegan"
        | "halal"
        | "kosher"
        | string,
      parent_relation: form.parent_relation as "father" | "mother",
      parent_name: form.parent_name.trim(),
      parent_phone: form.parent_phone.trim(),
      medical_situation: form.medical_situation.trim(),
      password: form.password,
    };

    const ok = await submitJoinRequest(payload);
    setLoading(false);

    if (ok) {
      setSubmitted(true);
    } else {
      setError(
        "Could not send join request. This phone number may already be registered.",
      );
    }
  };

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStep = () => {
    if (step === 1)
      return (
        <>
          <Text style={s.stepTitle}>👤 Personal Information</Text>

          <FL text="Full Name" req />
          <TextInput
            style={inp("full_name")}
            {...fld("full_name")}
            placeholder="Your full name"
            placeholderTextColor="#aab"
          />

          <FL text="Phone Number" req />
          <Text style={s.hint}>This is your login identifier</Text>
          <TextInput
            style={inp("phone")}
            {...fld("phone")}
            placeholder="+972-50-000-0000"
            placeholderTextColor="#aab"
            keyboardType="phone-pad"
          />

          <FL text="Email" req />
          <TextInput
            style={inp("email")}
            {...fld("email")}
            placeholder="you@example.com"
            placeholderTextColor="#aab"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FL text="Date of Birth" req />
          <TextInput
            style={inp("birth_date")}
            {...fld("birth_date")}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#aab"
          />

          <FL text="Age" req />
          <TextInput
            style={inp("age")}
            {...fld("age")}
            placeholder="e.g. 15"
            placeholderTextColor="#aab"
            keyboardType="number-pad"
          />

          <FL text="Gender" req />
          <Pills
            options={[
              { label: "👦 Male", value: "male" },
              { label: "👧 Female", value: "female" },
            ]}
            value={form.gender}
            onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
          />

          <FL text="Nationality" req />
          <Pills
            options={[
              { label: " Palestinian", value: "Palestinian" },
              { label: " Israeli", value: "Israeli" },
              { label: "🌍 Other", value: "Other" },
            ]}
            value={form.nationality}
            onChange={(v) => setForm((p) => ({ ...p, nationality: v }))}
          />

          <FL text="Address" req />
          <TextInput
            style={inp("address")}
            {...fld("address")}
            placeholder="Street & number"
            placeholderTextColor="#aab"
          />

          <FL text="Neighborhood" req />
          <TextInput
            style={inp("neighborhood")}
            {...fld("neighborhood")}
            placeholder="e.g. Katamon"
            placeholderTextColor="#aab"
          />
        </>
      );

    if (step === 2)
      return (
        <>
          <Text style={s.stepTitle}> School & Preferences</Text>

          <FL text="School Name" req />
          <TextInput
            style={inp("school_name")}
            {...fld("school_name")}
            placeholder="Your school name"
            placeholderTextColor="#aab"
          />

          <FL text="Year Joined Jerusalem Youth Chorus" req />
          <TextInput
            style={inp("year_joined")}
            {...fld("year_joined")}
            placeholder="e.g. 2024"
            placeholderTextColor="#aab"
            keyboardType="number-pad"
          />

          <FL text="Shirt Size" req />
          <Pills
            options={[
              { label: "S", value: "S" },
              { label: "M", value: "M" },
              { label: "L", value: "L" },
              { label: "XL", value: "XL" },
            ]}
            value={form.shirt_size}
            onChange={(v) => setForm((p) => ({ ...p, shirt_size: v }))}
          />

          <FL text="Voice Type" req />
          <Pills
            options={[
              { label: "🎵 Bass", value: "bass" },
              { label: "🎵 Tenor", value: "tenor" },
              { label: "🎵 Alto", value: "alto" },
              { label: "🎵 Soprano", value: "soprano" },
            ]}
            value={form.voice_type}
            onChange={(v) => setForm((p) => ({ ...p, voice_type: v }))}
          />

          <FL text="Food / Allergies" opt />
          <Text style={s.hint}>Vegetarian, allergies, dietary notes</Text>
          <TextInput
            style={[
              inp("food_notes"),
              { height: 80, textAlignVertical: "top" },
            ]}
            {...fld("food_notes")}
            placeholder="e.g. Vegetarian, nut allergy…"
            placeholderTextColor="#aab"
            multiline
            numberOfLines={3}
          />
        </>
      );

    if (step === 3)
      return (
        <>
          <Text style={s.stepTitle}>👨‍👩‍👧 Parent Contact & Password</Text>

          <FL text="Parent / Guardian" req />
          <Pills
            options={[
              { label: "👨 Father", value: "father" },
              { label: "👩 Mother", value: "mother" },
            ]}
            value={form.parent_relation}
            onChange={(v) => setForm((p) => ({ ...p, parent_relation: v }))}
          />

          <FL text="Parent Name" req />
          <TextInput
            style={inp("parent_name")}
            {...fld("parent_name")}
            placeholder="Parent full name"
            placeholderTextColor="#aab"
          />
          <FL text="Parent Phone Number" req />
          <TextInput
            style={inp("parent_phone")}
            {...fld("parent_phone")}
            placeholder="+972-50-000-0000"
            placeholderTextColor="#aab"
            keyboardType="phone-pad"
          />
          <FL text="Medical Situation" req />
          <TextInput
            style={[
              inp("medical_situation"),
              { height: 80, textAlignVertical: "top" },
            ]}
            {...fld("medical_situation")}
            placeholder="Any medical conditions or allergies..."
            placeholderTextColor="#aab"
            multiline
            numberOfLines={3}
          />

          <FL text="Password" req />
          <TextInput
            style={inp("password")}
            {...fld("password")}
            placeholder="Minimum 6 characters"
            placeholderTextColor="#aab"
            secureTextEntry
          />

          <FL text="Confirm Password" req />
          <TextInput
            style={[
              inp("confirm"),
              form.confirm && form.password !== form.confirm
                ? s.inputErr
                : null,
              form.confirm && form.password === form.confirm ? s.inputOk : null,
            ].filter(Boolean)}
            {...fld("confirm")}
            placeholder="••••••••"
            placeholderTextColor="#aab"
            secureTextEntry
          />
          {form.confirm && form.password === form.confirm ? (
            <Text style={s.matchTxt}>✓ Passwords match</Text>
          ) : null}
        </>
      );
  };

  if (submitted) {
    return (
      <View style={s.successContainer}>
        <View style={s.successCard}>
          <View style={s.successIconWrap}>
            <Text style={s.successEmoji}>🎶</Text>
          </View>
          <Text style={s.successTitle}>Request Sent!</Text>
          <Text style={s.successBody}>
            {
              "Your request to join Jerusalem Youth Chorus has been sent to the admin.\n\nYou will be notified once your account is approved."
            }
          </Text>
          <View style={s.successDots}>
            {["#0fb8b8", "#c0342c", "#e8a820"].map((c) => (
              <View key={c} style={[s.successDot, { backgroundColor: c }]} />
            ))}
          </View>
          <Pressable
            style={s.successBtn}
            onPress={() => router.replace("/(auth)/login" as any)}
          >
            <Text style={s.successBtnTxt}>Back to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.hero}>
          <View style={s.ring}>
            <BirdLogo size={56} />
          </View>
          <View>
            <Text style={s.appName}>Jerusalem Youth Chorus</Text>
            <Text style={s.tagline}> 🎤 Singer Registration</Text>
          </View>
        </View>

        <View style={s.badge}>
          <Text style={s.badgeText}> 🎤 Singer Sign Up</Text>
        </View>

        <StepBar current={step} total={3} />

        {/* Form card */}
        <View style={s.card}>
          {error ? (
            <View style={s.errBox}>
              <Text style={s.errText}>⚠ {error}</Text>
            </View>
          ) : null}

          {renderStep()}

          {/* Navigation */}
          <View style={s.navRow}>
            {step > 1 ? (
              <Pressable style={s.backBtn} onPress={back}>
                <Text style={s.backTxt}>← Back</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Pressable
              style={({ pressed }) => [
                s.nextBtn,
                pressed && { opacity: 0.85 },
                loading && { opacity: 0.55 },
              ]}
              onPress={step === 3 ? handleSubmit : next}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={s.nextTxt}>
                  {step === 3 ? "Send Join Request 🎶" : "Next →"}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={s.footer}>
            <Text style={s.footerTxt}>Already have an account? </Text>
            <Link href={"/(auth)/login" as any} style={s.link}>
              Sign in
            </Link>
          </View>
        </View>

        <View style={s.dots}>
          {[COLORS.teal, COLORS.red, COLORS.yellow].map((c) => (
            <View key={c} style={[s.dot, { backgroundColor: c }]} />
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fafa" },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48, paddingBottom: 40 },

  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.teal,
    letterSpacing: 1.5,
  },
  tagline: { fontSize: 12, color: COLORS.gray, marginTop: 2 },

  badge: {
    backgroundColor: COLORS.tealLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: COLORS.teal },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0d1717",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0d1717",
    marginBottom: 14,
  },
  hint: { fontSize: 11, color: COLORS.gray, marginTop: -4, marginBottom: 8 },

  errBox: {
    backgroundColor: COLORS.redLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.red,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errText: { color: COLORS.red, fontSize: 13, fontWeight: "500" },

  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: "#0d1717",
    marginBottom: 14,
    backgroundColor: COLORS.grayLight,
  },
  inputErr: { borderColor: COLORS.red, backgroundColor: COLORS.redLight },
  inputOk: { borderColor: COLORS.success, backgroundColor: "#f0fff5" },
  matchTxt: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: -10,
    marginBottom: 12,
    fontWeight: "600",
  },
  sep: { height: 1, backgroundColor: COLORS.border, marginVertical: 18 },

  navRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  backBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  backTxt: { fontSize: 15, fontWeight: "600", color: COLORS.teal },
  nextBtn: {
    flex: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    backgroundColor: COLORS.teal,
    shadowColor: COLORS.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextTxt: { color: COLORS.white, fontSize: 15, fontWeight: "700" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerTxt: { color: COLORS.gray, fontSize: 14 },
  link: { fontSize: 14, fontWeight: "700", color: COLORS.teal },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },

  successContainer: {
    flex: 1,
    backgroundColor: "#f0fafa",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    width: "100%",
  },
  successIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#e6fafa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successEmoji: { fontSize: 44 },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0d1717",
    marginBottom: 12,
    textAlign: "center",
  },
  successBody: {
    fontSize: 15,
    color: "#687076",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  successDots: { flexDirection: "row", gap: 8, marginBottom: 28 },
  successDot: { width: 10, height: 10, borderRadius: 5 },
  successBtn: {
    backgroundColor: "#0fb8b8",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: "#0fb8b8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  successBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
