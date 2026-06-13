const CHAT_PROVIDER_DEFINITIONS = [
  {
    value: 'profesor_1',
    label: 'Profesor 1',
    description: 'Proveedor principal del chat.',
    urlEnvName: 'CHAT_COMPLETIONS_URL',
    defaultUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyEnvNames: ['CHAT_API_KEY', 'GROQ_API_KEY'],
    modelEnvName: 'CHAT_MODEL',
    defaultModel: 'llama-3.1-8b-instant',
  },
  {
    value: 'profesor_2',
    label: 'Profesor 2',
    description: 'Proveedor alterno para cambiar de enfoque sin perder contexto.',
    urlEnvName: 'CEREBRAS_CHAT_COMPLETIONS_URL',
    defaultUrl: 'https://api.cerebras.ai/v1/chat/completions',
    apiKeyEnvNames: ['CEREBRAS_API_KEY'],
    modelEnvName: 'CHAT_MODEL',
    defaultModel: 'llama3.1-8b',
  },
]

export function getChatProviderDefinitions() {
  return CHAT_PROVIDER_DEFINITIONS
}

export function getChatProviderOptions() {
  return CHAT_PROVIDER_DEFINITIONS.map(({ value, label, description }) => ({
    value,
    label,
    description,
  }))
}

export function getChatProviderLabel(provider) {
  return CHAT_PROVIDER_DEFINITIONS.find((option) => option.value === provider)?.label || 'Profesor 1'
}

export function normalizeChatProvider(provider) {
  return CHAT_PROVIDER_DEFINITIONS.some((option) => option.value === provider) ? provider : 'profesor_1'
}
