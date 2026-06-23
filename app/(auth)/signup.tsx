import { db } from "@/backend/firebase";
import { StudentSignupPayload, useAuth } from "@/src/context/AuthContext";
import { PhoneVerify } from "@/src/components/PhoneVerify";
import { COLORS } from "@/src/data/mockData";
import {
  isValidEmail,
  isValidIsraeliLocalMobile,
} from "@/src/utils/validation";
import { Link, useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
// login-bg.jpg is 1600x900 — derive hero height from its own aspect ratio so
// the full photo is visible (no cropping) instead of a fixed screen fraction.
const HERO_H = Math.round((SCREEN_W * 600) / 950);
// How far the sheet's rounded top initially overlaps the hero image at rest.
const CARD_OVERLAP = 15;
// Extra scroll travel (beyond a normal screen-filling scroll) reserved so the
// sheet can keep sliding up until it fully covers the hero image.
const SCROLL_TRAVEL = HERO_H - CARD_OVERLAP;

// ── Field formatting / validation helpers ──────────────────────────────────────
const PHONE_PREFIX = "+972";
const MIN_AGE = 10;
const MAX_AGE = 19;

// Strips the hardcoded "+972" prefix (and any non-digits) back to the local
// part the user actually typed, so the input can display just that part.
const localPhoneDigits = (full: string) =>
  (full.startsWith(PHONE_PREFIX) ? full.slice(PHONE_PREFIX.length) : full)
    .replace(/\D/g, "")
    .slice(0, 9);

// As the user types, keep only digits and rebuild "DD/MM/YYYY" — slashes are
// inserted automatically, the user never types them.
const formatBirthDate = (text: string) => {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const hasDigits = (text: string) => /\d/.test(text);
const stripDigits = (text: string) => text.replace(/[0-9]/g, "");

const isValidBirthDate = (text: string): boolean => {
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
};

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
  voice_type: string;
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
  const { signupStudent } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [voiceTypes, setVoiceTypes] = useState<
    { label: string; value: string }[]
  >([]);

  useEffect(() => {
    const loadVoiceTypes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "voice_types"));

        const types = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            label: `🎵 ${data.name}`,
            value: data.name.toLowerCase(),
          };
        });

        setVoiceTypes(types);
      } catch (error) {
        console.error("Failed to load voice types:", error);
      }
    };

    loadVoiceTypes();
  }, []);

  const scrollY = useRef(new Animated.Value(0)).current;

  const set = (k: keyof FormState) => (v: string) => {
    // Editing the phone after verifying it invalidates the OTP proof —
    // it was only ever proof of ownership for the exact number sent.
    if (k === "phone") setPhoneVerified(false);
    setForm((p) => ({ ...p, [k]: v }));
  };

  // "+972" is fixed in the UI — the user only ever types the local part, so
  // we rebuild the full E.164-ish value from just the digits they entered.
  const setPhoneLocal = (k: "phone" | "parent_phone") => (text: string) => {
    if (k === "phone") setPhoneVerified(false);
    const digits = text.replace(/\D/g, "").slice(0, 9);
    setForm((p) => ({ ...p, [k]: digits ? `${PHONE_PREFIX}${digits}` : "" }));
  };

  const setBirthDate = (text: string) => {
    setForm((p) => ({ ...p, birth_date: formatBirthDate(text) }));
  };

  // Address/neighborhood must be strict strings — digits are dropped as the
  // user types rather than merely flagged on submit.
  const setNoDigitsField = (k: "address" | "neighborhood") => (text: string) => {
    setForm((p) => ({ ...p, [k]: stripDigits(text) }));
  };

  const inp = (k: string) => [
    s.input,
    focused === k && {
      borderColor: COLORS.teal,
      backgroundColor: COLORS.white,
    },
  ];

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fld = (k: keyof FormState) => ({
    value: form[k] as string,
    onChangeText: set(k),
    onFocus: () => setFocused(k),
    onBlur: () => {
      setFocused(null);
      setTouched((p) => ({ ...p, [k]: true }));
    },
  });

  const phoneInvalid =
    touched.phone &&
    form.phone.trim().length > 0 &&
    !isValidIsraeliLocalMobile(localPhoneDigits(form.phone));

  const parentPhoneInvalid =
    touched.parent_phone &&
    form.parent_phone.trim().length > 0 &&
    !isValidIsraeliLocalMobile(localPhoneDigits(form.parent_phone));

  // ── Validation per step ───────────────────────────────────────────────────
  const validate = (): string | null => {
    if (step === 1) {
      if (!form.full_name.trim()) return "Full name is required";
      if (hasDigits(form.full_name)) return "Full name cannot contain numbers";
      if (!form.phone.trim()) return "Phone number is required";
      if (!isValidIsraeliLocalMobile(localPhoneDigits(form.phone)))
        return "Enter a valid 9-digit mobile number starting with 5, e.g. +972501234567";
      if (!phoneVerified)
        return "Please verify your phone number with the code we sent you";
      if (!form.email.trim()) return "Email is required";
      if (!isValidEmail(form.email)) return "Enter a valid email address";
      if (!form.birth_date.trim()) return "Date of birth is required";
      if (!isValidBirthDate(form.birth_date))
        return "Enter a valid date of birth (DD/MM/YYYY)";
      if (!form.gender) return "Please select your gender";
      if (!form.nationality) return "Please select your nationality";
      if (!form.age.trim()) return "Age is required";
      if (isNaN(Number(form.age))) return "Age must be a number";
      if (Number(form.age) < MIN_AGE || Number(form.age) > MAX_AGE)
        return `Age must be between ${MIN_AGE} and ${MAX_AGE}`;
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
      if (!isValidIsraeliLocalMobile(localPhoneDigits(form.parent_phone)))
        return "Enter a valid 9-digit parent mobile number starting with 5, e.g. +972501234567";
      if (!form.parent_name.trim()) return "Parent name is required";
      if (hasDigits(form.parent_name))
        return "Parent name cannot contain numbers";
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
      phoneVerified,
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
      voice_type: form.voice_type,
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

    try {
      const result = await signupStudent(payload);
      setLoading(false);
      if (result === "submitted") {
        setSubmitted(true);
      } else if (result === "rejected") {
        setError(
          "Your join request was previously rejected. Please contact the administrator.",
        );
      } else {
        setError(
          "Could not sign up. This phone number may already be registered.",
        );
      }
    } catch (err: any) {
      setLoading(false);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "An error occurred during signup. Please try again.";
      setError(message);
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
          <View style={s.phoneRow}>
            <View style={s.phonePrefix}>
              <Text style={s.phonePrefixTxt}>{PHONE_PREFIX}</Text>
            </View>
            <TextInput
              style={[
                s.phoneInput,
                focused === "phone" && {
                  borderColor: COLORS.teal,
                  backgroundColor: COLORS.white,
                },
                phoneInvalid ? s.inputErr : null,
              ]}
              value={localPhoneDigits(form.phone)}
              onChangeText={setPhoneLocal("phone")}
              onFocus={() => setFocused("phone")}
              onBlur={() => {
                setFocused(null);
                setTouched((p) => ({ ...p, phone: true }));
              }}
              placeholder="501234567"
              placeholderTextColor="#aab"
              keyboardType="number-pad"
              maxLength={9}
            />
          </View>
          {phoneInvalid ? (
            <Text style={s.fieldErrTxt}>
              ⚠ Enter a 9-digit mobile number starting with 5, e.g. 501234567
            </Text>
          ) : null}
          {!phoneInvalid && form.phone.trim() ? (
            <PhoneVerify
              phone={form.phone}
              verified={phoneVerified}
              onVerified={() => setPhoneVerified(true)}
            />
          ) : null}

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
            value={form.birth_date}
            onChangeText={setBirthDate}
            onFocus={() => setFocused("birth_date")}
            onBlur={() => {
              setFocused(null);
              setTouched((p) => ({ ...p, birth_date: true }));
            }}
            placeholder="00/00/0000"
            placeholderTextColor="#aab"
            keyboardType="number-pad"
            maxLength={10}
          />

          <FL text="Age" req />
          <Text style={s.hint}>Must be between {MIN_AGE} and {MAX_AGE}</Text>
          <TextInput
            style={inp("age")}
            value={form.age}
            onChangeText={(text) =>
              setForm((p) => ({ ...p, age: text.replace(/\D/g, "").slice(0, 2) }))
            }
            onFocus={() => setFocused("age")}
            onBlur={() => {
              setFocused(null);
              setTouched((p) => ({ ...p, age: true }));
            }}
            placeholder="e.g. 15"
            placeholderTextColor="#aab"
            keyboardType="number-pad"
            maxLength={2}
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
            value={form.address}
            onChangeText={setNoDigitsField("address")}
            onFocus={() => setFocused("address")}
            onBlur={() => {
              setFocused(null);
              setTouched((p) => ({ ...p, address: true }));
            }}
            placeholder="Street name"
            placeholderTextColor="#aab"
          />

          <FL text="Neighborhood" req />
          <TextInput
            style={inp("neighborhood")}
            value={form.neighborhood}
            onChangeText={setNoDigitsField("neighborhood")}
            onFocus={() => setFocused("neighborhood")}
            onBlur={() => {
              setFocused(null);
              setTouched((p) => ({ ...p, neighborhood: true }));
            }}
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
            options={voiceTypes}
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
            value={form.parent_name}
            onChangeText={(text) =>
              setForm((p) => ({ ...p, parent_name: stripDigits(text) }))
            }
            onFocus={() => setFocused("parent_name")}
            onBlur={() => {
              setFocused(null);
              setTouched((p) => ({ ...p, parent_name: true }));
            }}
            placeholder="Parent full name"
            placeholderTextColor="#aab"
          />
          <FL text="Parent Phone Number" req />
          <View style={s.phoneRow}>
            <View style={s.phonePrefix}>
              <Text style={s.phonePrefixTxt}>{PHONE_PREFIX}</Text>
            </View>
            <TextInput
              style={[
                s.phoneInput,
                focused === "parent_phone" && {
                  borderColor: COLORS.teal,
                  backgroundColor: COLORS.white,
                },
                parentPhoneInvalid ? s.inputErr : null,
              ]}
              value={localPhoneDigits(form.parent_phone)}
              onChangeText={setPhoneLocal("parent_phone")}
              onFocus={() => setFocused("parent_phone")}
              onBlur={() => {
                setFocused(null);
                setTouched((p) => ({ ...p, parent_phone: true }));
              }}
              placeholder="501234567"
              placeholderTextColor="#aab"
              keyboardType="number-pad"
              maxLength={9}
            />
          </View>
          {parentPhoneInvalid ? (
            <Text style={s.fieldErrTxt}>
              ⚠ Enter a 9-digit mobile number starting with 5, e.g. 501234567
            </Text>
          ) : null}
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

  // The hero drifts upward slower than the scroll (parallax) and stretches
  // when the user pulls down past the top. The sheet itself (rendered as
  // scroll content) slides up at normal scroll speed and is what visually
  // covers the hero as the user scrolls.
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-HERO_H, 0, HERO_H],
    outputRange: [HERO_H * 0.7, 0, -HERO_H * 0.2],
    extrapolate: "clamp",
  });
  const heroScale = scrollY.interpolate({
    inputRange: [-HERO_H, 0],
    outputRange: [2, 1],
    extrapolateRight: "clamp",
  });
  const heroOverlayOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_TRAVEL],
    outputRange: [0.1, 0.45],
    extrapolate: "clamp",
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Fixed hero image — sits behind the scrolling sheet */}
      <Animated.View
        style={[
          s.hero,
          { transform: [{ translateY: heroTranslateY }, { scale: heroScale }] },
        ]}
      >
        <Image
          source={require("../../assets/images/login-bg.jpg")}
          style={s.heroImg}
          resizeMode="cover"
        />
        <Animated.View
          style={[s.heroOverlay, { opacity: heroOverlayOpacity }]}
        />
      </Animated.View>

      {/* Scrolling sheet — its rounded top slides up over the hero on scroll */}
      <Animated.ScrollView
        style={s.scrollContainer}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <View style={s.sheet}>
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
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },

  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_H,
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },

  scrollContainer: { flex: 1 },
  scrollContent: {
    paddingTop: SCROLL_TRAVEL,
    // Reserve enough scroll room (even on tall screens / short content) for
    // the sheet to travel all the way from "peeking gap" to "fully covers
    // the hero", instead of relying on the form content being long enough.
    minHeight: SCREEN_H + SCROLL_TRAVEL,
  },

  sheet: {
    flexGrow: 1,
    minHeight: SCREEN_H,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    padding: 24,
    paddingBottom: 40,
  },

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
  fieldErrTxt: {
    fontSize: 12,
    color: COLORS.red,
    marginTop: -10,
    marginBottom: 12,
    fontWeight: "600",
  },

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
  phoneRow: { flexDirection: "row", marginBottom: 14 },
  phonePrefix: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 13,
    justifyContent: "center",
  },
  phonePrefixTxt: { fontSize: 15, color: COLORS.gray, fontWeight: "600" },
  phoneInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: 13,
    fontSize: 15,
    color: "#0d1717",
    backgroundColor: COLORS.grayLight,
  },
  matchTxt: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: -10,
    marginBottom: 12,
    fontWeight: "600",
  },
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
