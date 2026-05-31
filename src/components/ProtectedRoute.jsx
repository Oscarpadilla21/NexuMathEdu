import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const isRoleAgnosticRoute =
    allowedRoles.length === 3 &&
    allowedRoles.includes('admin') &&
    allowedRoles.includes('teacher') &&
    allowedRoles.includes('student');

  // Si no hay sesion, la entrada correcta es el login.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    if (isRoleAgnosticRoute) {
      return children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-slate-600">Cargando sesion...</p>
      </div>
    );
  }

  if (!role && isRoleAgnosticRoute) {
    return children;
  }

  if (!role) {
    return <Navigate to="/perfil" replace />;
  }

  // Si la ruta exige roles concretos, bloqueamos cualquier otro.
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};
