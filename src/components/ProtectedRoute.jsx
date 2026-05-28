import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, role, loading } = useAuth();

  // Evitamos redirigir antes de conocer la sesion real.
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  // Si no hay sesion, la entrada correcta es el login.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta exige roles concretos, bloqueamos cualquier otro.
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};
