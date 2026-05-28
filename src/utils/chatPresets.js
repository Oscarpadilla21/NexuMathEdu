// Perfiles visuales y de contenido para adaptar el chat segun el rol.
const ROLE_PROFILES = {
  admin: {
    label: 'Administrador',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo administrador',
    welcomeText: 'Usa el chat para soporte operativo, orientacion de plataforma y respuestas accionables.',
    defaultFocus: 'gestion de plataforma',
    suggestedFocus: ['gestion de plataforma', 'soporte tecnico', 'reportes', 'analisis'],
  },
  teacher: {
    label: 'Profesor',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo profesor',
    welcomeText: 'Pide planificacion de clases, evaluaciones, actividades y explicaciones listas para el aula.',
    defaultFocus: 'plan de clase',
    suggestedFocus: ['plan de clase', 'actividades', 'evaluaciones', 'retroalimentacion'],
  },
  student: {
    label: 'Estudiante',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo tutor',
    welcomeText: 'Recibe explicaciones paso a paso, ejemplos y ejercicios para practicar matematicas.',
    defaultFocus: 'resolver ejercicios',
    suggestedFocus: ['resolver ejercicios', 'repasar teoria', 'preparar examen', 'ejemplos'],
  },
}

// Opciones reutilizables para el selector de tono y detalle.
const DEFAULT_TONES = ['claro', 'cercano', 'conciso', 'riguroso']
const DEFAULT_DETAIL_LEVELS = ['breve', 'medio', 'profundo']

export function getChatRoleProfile(role) {
  return ROLE_PROFILES[role] || ROLE_PROFILES.student
}

export function getChatToneOptions() {
  return DEFAULT_TONES
}

export function getChatDetailLevels() {
  return DEFAULT_DETAIL_LEVELS
}

export function buildDefaultChatSettings(role) {
  const profile = getChatRoleProfile(role)

  // Estado inicial que se usa al abrir el chat o al restablecer ajustes.
  return {
    tone: 'claro',
    detailLevel: 'medio',
    focus: profile.defaultFocus,
    language: 'espanol',
  }
}

export function formatThreadLabel(thread) {
  if (!thread?.title) {
    return 'Chat'
  }

  return thread.title
}
