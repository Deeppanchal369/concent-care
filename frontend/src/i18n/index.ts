import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./en/common.json";
import enAuth from "./en/auth.json";
import enPatient from "./en/patient.json";
import enDoctor from "./en/doctor.json";
import enNurse from "./en/nurse.json";
import enAdmin from "./en/admin.json";
import enDocuments from "./en/documents.json";
import enConsent from "./en/consent.json";
import enNotifications from "./en/notifications.json";
import enAi from "./en/ai.json";
import enErrors from "./en/errors.json";
import enHelp from "./en/help.json";

import guCommon from "./gu/common.json";
import guAuth from "./gu/auth.json";
import guPatient from "./gu/patient.json";
import guDoctor from "./gu/doctor.json";
import guNurse from "./gu/nurse.json";
import guAdmin from "./gu/admin.json";
import guDocuments from "./gu/documents.json";
import guConsent from "./gu/consent.json";
import guNotifications from "./gu/notifications.json";
import guAi from "./gu/ai.json";
import guErrors from "./gu/errors.json";
import guHelp from "./gu/help.json";

// Bundle every namespace under a single unified root object.
// This allows t("auth.registerTitle"), t("common.actions.next"), t("errors.NETWORK_ERROR"),
// as well as flat keys like t("appName") or t("loading") to resolve seamlessly.
const enBundle = {
  common: enCommon,
  auth: enAuth,
  patient: enPatient,
  doctor: enDoctor,
  nurse: enNurse,
  admin: enAdmin,
  documents: enDocuments,
  consent: enConsent,
  notifications: enNotifications,
  ai: enAi,
  errors: enErrors,
  help: enHelp,
  ...enCommon,
};

const guBundle = {
  common: guCommon,
  auth: guAuth,
  patient: guPatient,
  doctor: guDoctor,
  nurse: guNurse,
  admin: guAdmin,
  documents: guDocuments,
  consent: guConsent,
  notifications: guNotifications,
  ai: guAi,
  errors: guErrors,
  help: guHelp,
  ...guCommon,
};

const savedLanguage = (localStorage.getItem("cc_lang") as "en" | "gu") || "en";

// Ensure document lang attribute is set at startup
if (typeof document !== "undefined") {
  document.documentElement.lang = savedLanguage;
}

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enBundle,
      common: enCommon,
      auth: enAuth,
      patient: enPatient,
      doctor: enDoctor,
      nurse: enNurse,
      admin: enAdmin,
      documents: enDocuments,
      consent: enConsent,
      notifications: enNotifications,
      ai: enAi,
      errors: enErrors,
      help: enHelp,
    },
    gu: {
      translation: guBundle,
      common: guCommon,
      auth: guAuth,
      patient: guPatient,
      doctor: guDoctor,
      nurse: guNurse,
      admin: guAdmin,
      documents: guDocuments,
      consent: guConsent,
      notifications: guNotifications,
      ai: guAi,
      errors: guErrors,
      help: guHelp,
    },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  defaultNS: "translation",
  fallbackNS: ["common", "translation"],
  ns: [
    "translation",
    "common",
    "auth",
    "patient",
    "doctor",
    "nurse",
    "admin",
    "documents",
    "consent",
    "notifications",
    "ai",
    "errors",
    "help",
  ],
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
  returnEmptyString: false,
  parseMissingKeyHandler: (key: string) => {
    // Prevent raw dot-notation keys from displaying in UI
    const parts = key.split(".");
    const leaf = parts[parts.length - 1];
    return leaf.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
  },
});

export function setAppLanguage(lang: "en" | "gu") {
  localStorage.setItem("cc_lang", lang);
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
  i18n.changeLanguage(lang);
}

export default i18n;
