import { getChatProviderLabel, getChatProviderOptions, normalizeChatProvider } from './chatProviders'

export { getChatProviderLabel, getChatProviderOptions, normalizeChatProvider }

// Perfiles visuales y de contenido para adaptar el chat según el rol.
const ROLE_PROFILES = {
  admin: {
    label: 'Administrador',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo administrador',
    welcomeText: 'Usa el chat para soporte operativo, orientación de plataforma y respuestas accionables.',
    defaultFocus: 'gestión de plataforma',
    suggestedFocus: ['gestión de plataforma', 'soporte técnico', 'reportes', 'análisis'],
  },
  teacher: {
    label: 'Profesor',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo profesor',
    welcomeText: 'Pide planificación de clases, evaluaciones, actividades y explicaciones listas para el aula.',
    defaultFocus: 'plan de clase',
    suggestedFocus: ['plan de clase', 'actividades', 'evaluaciones', 'retroalimentación'],
  },
  student: {
    label: 'Estudiante',
    accent: 'from-[#9d31ff] to-[#ff318c]',
    border: 'border-[#9d31ff]/20',
    glow: 'shadow-[#9d31ff]/15',
    welcomeTitle: 'Modo tutor',
    welcomeText: 'Recibe explicaciones paso a paso, ejemplos y ejercicios para practicar matemáticas.',
    defaultFocus: 'resolver ejercicios',
    suggestedFocus: ['resolver ejercicios', 'repasar teoría', 'preparar examen', 'ejemplos'],
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

export function getChatTopicOptions() {
  return [
    { value: 'general', label: 'General' },
    { value: 'aritmetica', label: 'Aritmética' },
    { value: 'algebra', label: 'Álgebra' },
    { value: 'geometria', label: 'Geometría' },
    { value: 'trigonometria', label: 'Trigonometría' },
    { value: 'funciones', label: 'Funciones y Gráficas' },
    { value: 'estadistica', label: 'Probabilidad y Estadística' },
  ]
}

export function buildDefaultChatSettings(role, provider) {
  const profile = getChatRoleProfile(role)

  // Valores predeterminados específicos según el rol
  const defaultPresets = {
    admin: {
      tone: 'conciso',
      detailLevel: 'breve',
      focus: profile.defaultFocus || 'gestión de plataforma',
      language: 'espanol',
      provider: 'profesor_1',
      topic: 'general',
    },
    teacher: {
      tone: 'cercano',
      detailLevel: 'profundo',
      focus: profile.defaultFocus || 'plan de clase',
      language: 'espanol',
      provider: 'profesor_2',
      topic: 'general',
    },
    student: {
      tone: 'claro',
      detailLevel: 'medio',
      focus: profile.defaultFocus || 'resolver ejercicios',
      language: 'espanol',
      provider: 'profesor_1',
      topic: 'general',
    },
  }

  const rolePreset = { ...(defaultPresets[role] || defaultPresets.student) }

  // Si se provee un proveedor específico (por ejemplo, desde el perfil del usuario), lo usamos
  if (provider) {
    rolePreset.provider = normalizeChatProvider(provider)
  }

  return rolePreset
}

export function formatThreadLabel(thread) {
  if (!thread?.title) {
    return 'Chat'
  }

  return thread.title
}
