import { useState } from 'react'
import { NavLink } from 'react-router-dom'

// Iconos extraídos para mayor claridad
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
)

export default function DashboardHeader({
  subtitle,
  userLabel,
  navItems = [],
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-xl border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo Estilizado */}
          <div className="flex flex-col justify-center min-w-max">
            <div className="flex items-center gap-1">
              <h1 className="text-lg leading-none tracking-tight sm:text-xl">
                <span className="font-extrabold text-white">Nexu</span>
                <span className="font-light text-indigo-400">ChatEdu</span>
                <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-pink-500"></span>
              </h1>
            </div>
            {subtitle && (
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 sm:text-[11px]">
                {subtitle}
              </p>
            )}
          </div>

          {/* Botón de Menú */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-white/10 active:scale-95"
            aria-label="Menú"
          >
            <div className="flex flex-col gap-1.5">
              <span className={`h-0.5 w-5 rounded-full bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`h-0.5 w-5 rounded-full bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 w-5 rounded-full bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Menú Desplegable Mejorado */}
        <div
          className={`absolute left-4 right-4 top-[72px] transition-all duration-300 ${
            menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <div className="rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to || item.href}
                  className={({ isActive }) => 
                    `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4 pb-2 px-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Usuario</span>
                  <span className="text-sm font-medium text-slate-200">{userLabel || 'Invitado'}</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
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