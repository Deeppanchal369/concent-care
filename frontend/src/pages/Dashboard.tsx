import { Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import PatientHome from "./home/PatientHome";
import DoctorHome from "./home/DoctorHome";
import NurseHome from "./home/NurseHome";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t("auth.sessionExpired") || "Please sign in to access your clinical workstation."}
        </p>
        <Link
          to="/login"
          className="btn-tactile mt-4 inline-block bg-teal text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs"
        >
          {t("common.actions.login")}
        </Link>
      </div>
    );
  }

  switch (user.role) {
    case "PATIENT":
      return <PatientHome />;
    case "DOCTOR":
      return <DoctorHome />;
    case "NURSE":
      return <NurseHome />;
    case "ADMIN":
      return <Navigate to="/admin" replace />;
    default:
      return (
        <div className="text-center py-20 text-slate-500 text-xs">
          Unknown role: {user.role}
        </div>
      );
  }
}
