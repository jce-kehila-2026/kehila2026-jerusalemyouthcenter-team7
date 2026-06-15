import React, { createContext, useContext, useState } from "react";

type Language = "en" | "he";

const translations: Record<Language, Record<string, string>> = {
  en: {
    settings: "Settings",
    security: "Security",
    changePassword: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    update: "Update",
    passwordTooShort: "Password must be at least 6 characters.",
    passwordsDoNotMatch: "Passwords do not match.",
    passwordUpdated: "Password updated successfully.",
    wrongCurrentPassword: "Current password is incorrect.",
  },
  he: {
    settings: "הגדרות",
    security: "אבטחה",
    changePassword: "שינוי סיסמה",
    currentPassword: "סיסמה נוכחית",
    newPassword: "סיסמה חדשה",
    confirmNewPassword: "אימות סיסמה חדשה",
    update: "עדכן",
    passwordTooShort: "הסיסמה חייבת להכיל לפחות 6 תווים.",
    passwordsDoNotMatch: "הסיסמאות אינן תואמות.",
    passwordUpdated: "הסיסמה עודכנה בהצלחה.",
    wrongCurrentPassword: "הסיסמה הנוכחית שגויה.",
  },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "he",
  setLanguage: () => {},
  isRTL: true,
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("he");

  const t = (key: string) => translations[language][key] ?? key;

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, isRTL: language === "he", t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
