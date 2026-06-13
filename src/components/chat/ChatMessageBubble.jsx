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
        className={`max-w-[92%] rounded-xl px-2.5 py-1.5 shadow-sm sm:max-w-[80%] ${
          isUser
            ? `bg-gradient-to-br ${accentClass} text-white`
            : 'border border-[#e5e4e7] bg-white text-slate-800'
        }`}
      >
        <MarkdownContent content={message?.content} tone={isUser ? 'dark' : 'light'} />
        <div className={`mt-0.5 text-[9px] ${isUser ? 'text-white/65' : 'text-slate-400'}`}>{time}</div>
      </div>
    </article>
  )
}
