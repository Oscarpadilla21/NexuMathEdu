import MarkdownContent from './MarkdownContent'

export default function ChatMessageBubble({ message, isUser, accentClass }) {
  // Convertimos la hora de creacion en una marca legible para la burbuja.
  const time = message?.created_at ? new Date(message.created_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }) : ''

  return (
    // Mensajes del usuario a la derecha, resto del hilo a la izquierda.
    <article className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[96%] rounded-2xl px-3 py-2.5 shadow-sm sm:max-w-[86%] ${
          isUser
            ? `bg-gradient-to-br ${accentClass} text-white`
            : 'border border-[#e5e4e7] bg-white text-slate-800'
        }`}
      >
        <MarkdownContent content={message?.content} tone={isUser ? 'dark' : 'light'} />
        <div className={`mt-1 text-[10px] ${isUser ? 'text-white/75' : 'text-slate-400'}`}>{time}</div>
      </div>
    </article>
  )
}
