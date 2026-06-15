import React, { createContext, useContext, useState } from "react";

type Language = "en" | "he";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "he",
  setLanguage: () => {},
  isRTL: true,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("he");

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, isRTL: language === "he" }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
