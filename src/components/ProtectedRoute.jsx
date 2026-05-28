import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, role } = useAuth();

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
