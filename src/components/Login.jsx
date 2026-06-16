import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRouteForRole } from '../utils/roleRoutes';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const navigate = useNavigate();
  const { login, isAuthenticated, role, loading: authLoading } = useAuth();

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('nexumathedu:session-expired') === 'true') {
        setSessionExpired(true);
        window.sessionStorage.removeItem('nexumathedu:session-expired');
      }
    } catch (e) {
      console.warn('Could not read session-expired flag from sessionStorage', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(getRouteForRole(role, isAuthenticated), { replace: true });
      return;
    }

    if (isAuthenticated && !authLoading) {
      navigate('/perfil', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, role]);

  // No mostrar pantalla de carga aquí; si está autenticado, se redirige automáticamente.

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8faff]">
        <div className="rounded-3xl border border-white/20 bg-white px-6 py-5 text-sm text-slate-600 shadow-2xl">
          Verificando sesión...
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8faff]">
        <div className="rounded-3xl border border-white/20 bg-white px-6 py-5 text-sm text-slate-600 shadow-2xl">
          Redirigiendo...
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSessionExpired(false);

    try {
      await login(email, password);
    } catch (err) {
      setError(err?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8faff] relative overflow-hidden">
      {/* Elementos decorativos de fondo (Blobs) */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      {/* Contenedor Principal */}
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">

        {/* Sección superior con gradiente */}
        <div className="bg-gradient-to-r from-[#9d31ff] to-[#ff318c] p-10 flex flex-col items-center text-white">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md mb-4">
            <Lock size={28} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Bienvenido</h2>
          <p className="text-white/80 text-sm mt-1">Ingresa a tu cuenta para continuar</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {sessionExpired && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Tu sesión ha expirado por inactividad. Por favor, ingresa tus credenciales de nuevo.
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label className="flex items-center text-xs font-semibold text-purple-600 uppercase tracking-wider gap-2">
              <Mail size={14} /> Correo electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                  setSessionExpired(false)
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-400 focus:bg-white outline-none transition-all text-gray-700"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-pink-400"></div>
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="flex items-center text-xs font-semibold text-purple-600 uppercase tracking-wider gap-2">
              <Lock size={14} /> Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                  setSessionExpired(false)
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-400 focus:bg-white outline-none transition-all text-gray-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {isAuthenticated && !authLoading && !role && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Tu sesión inició, pero no pudimos determinar tu rol. Cierra sesión e intenta de nuevo. Si el problema continúa, contacta al administrador.
            </div>
          )}

          {/* Boton de inicio de sesion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-[#9d31ff] to-[#ff318c] text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-200 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
