import { useState } from 'react'
import { NavLink } from 'react-router-dom'

export default function DashboardHeader({
  subtitle,
  userName,
  userLabel,
  navItems = [],
  onLogout,
  variant = 'dark',
  showSubtitle = true,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    // Barra superior comun para las pantallas con navegacion por rol.
    <header
      className={`sticky top-0 z-50 border-b shadow-xl ${
        variant === 'gradient'
          ? 'border-white/10 bg-gradient-to-r from-[#9d31ff] via-[#c438e2] to-[#ff318c] text-white'
          : 'border-white/5 bg-slate-900 text-white'
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex min-w-max flex-col justify-center">
            <div className="flex items-center gap-1">
              <h1 className="text-lg leading-none tracking-tight sm:text-xl">
                <span className="font-extrabold text-white">Nexu</span>
                <span className="font-light text-indigo-400">ChatEdu</span>
                <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-pink-500" />
              </h1>
            </div>
            {showSubtitle && subtitle && (
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 sm:text-[11px]">
                {subtitle}
              </p>
            )}
          </div>

          {/* Boton hamburguesa para menu responsive. */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95 ${
              variant === 'gradient' ? 'bg-white/15 hover:bg-white/20' : 'bg-white/5 hover:bg-white/10'
            }`}
            aria-label="Menú"
          >
            <div className="flex flex-col gap-1.5">
              <span className={`h-0.5 w-5 rounded-full bg-white transition-all ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`h-0.5 w-5 rounded-full bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 w-5 rounded-full bg-white transition-all ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
            </div>
          </button>
        </div>

        {/* Panel flotante con enlaces y salida de sesion. */}
        <div
          className={`absolute left-4 right-4 top-[72px] transition-all duration-300 ${
            menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 pointer-events-none opacity-0'
          }`}
        >
          <div
            className={`rounded-2xl border p-3 shadow-2xl backdrop-blur-xl ${
              variant === 'gradient'
                ? 'border-white/20 bg-white/95 text-slate-900'
                : 'border-white/10 bg-slate-900/95 text-white'
            }`}
          >
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to || item.href}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      variant === 'gradient'
                        ? isActive
                          ? 'bg-[#9d31ff] text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                        : isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className={`mt-4 border-t px-2 pb-2 pt-4 ${variant === 'gradient' ? 'border-slate-200' : 'border-white/10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold ${variant === 'gradient' ? 'text-slate-800' : 'text-slate-200'}`}>{userName || 'Usuario'}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${variant === 'gradient' ? 'text-slate-500' : 'text-slate-400'}`}>{userLabel || 'Invitado'}</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      variant === 'gradient'
                        ? 'bg-[#ff318c]/10 text-[#9d31ff] hover:bg-[#9d31ff] hover:text-white'
                        : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                    }`}
                  >
                    Salir
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
