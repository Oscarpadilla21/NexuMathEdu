const ROLE_PROFILES = {
  admin: {
    label: 'Administrador',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo administrador',
    welcomeText: 'Usa el chat para soporte operativo, orientación de plataforma y respuestas accionables.',
    defaultFocus: 'gestion de plataforma',
    suggestedFocus: ['gestion de plataforma', 'soporte tecnico', 'reportes', 'analisis'],
  },
  teacher: {
    label: 'Profesor',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo profesor',
    welcomeText: 'Pide planificación de clases, evaluaciones, actividades y explicaciones listas para el aula.',
    defaultFocus: 'plan de clase',
    suggestedFocus: ['plan de clase', 'actividades', 'evaluaciones', 'retroalimentacion'],
  },
  student: {
    label: 'Estudiante',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo tutor',
    welcomeText: 'Recibe explicaciones paso a paso, ejemplos y ejercicios para practicar matemáticas.',
    defaultFocus: 'resolver ejercicios',
    suggestedFocus: ['resolver ejercicios', 'repasar teoria', 'preparar examen', 'ejemplos'],
  },
}

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

  return {
    tone: 'claro',
    detailLevel: 'medio',
    focus: profile.defaultFocus,
    language: 'espanol',
  }
}

export function formatThreadLabel(thread) {
  if (!thread?.title) {
    return 'Chat IA'
  }

  return thread.title
}
