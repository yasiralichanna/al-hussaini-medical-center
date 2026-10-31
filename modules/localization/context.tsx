"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  translations,
  serviceNames,
  type Language,
  type TranslationKey,
} from "./translations";
const Context = createContext({
  lang: "en" as Language,
  setLang: (_: Language) => {},
  t: (k: TranslationKey) => translations.en[k] as string,
  sn: (id: string, fallback = "") => serviceNames.en[id] || fallback,
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("en");
  useEffect(() => {
    const saved = localStorage.getItem("clinic-language");
    if (saved === "ur" || saved === "sd") setLang(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    localStorage.setItem("clinic-language", lang);
  }, [lang]);
  return (
    <Context.Provider
      value={{
        lang,
        setLang,
        t: (k) => translations[lang][k],
        sn: (id, fallback = "") =>
          lang === "en" && fallback
            ? fallback
            : serviceNames[lang][id] || fallback,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
