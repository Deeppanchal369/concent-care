import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Shell from "./components/Shell";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PatientDetail from "./pages/PatientDetail";
import Admin from "./pages/Admin";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated Clinical & Workstation Pages */}
      <Route path="/dashboard" element={<RequireAuth><Shell><Dashboard /></Shell></RequireAuth>} />
      <Route path="/patient/:id" element={<RequireAuth><Shell><PatientDetail /></Shell></RequireAuth>} />
      <Route path="/patients/:id" element={<RequireAuth><Shell><PatientDetail /></Shell></RequireAuth>} />
      <Route path="/admin" element={<RequireAdmin><Shell><Admin /></Shell></RequireAdmin>} />

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
