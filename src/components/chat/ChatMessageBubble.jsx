export default function ChatMessageBubble({ message, isUser, accentClass }) {
  const time = message?.created_at ? new Date(message.created_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }) : ''

  return (
    <article className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[96%] rounded-2xl px-3 py-2.5 shadow-sm sm:max-w-[86%] ${
          isUser
            ? `bg-gradient-to-br ${accentClass} text-white`
            : 'border border-[#e5e4e7] bg-white text-slate-800'
        }`}
      >
        <div className="whitespace-pre-wrap break-words text-[13px] leading-5 sm:text-sm">{message?.content}</div>
        <div className={`mt-1 text-[10px] ${isUser ? 'text-white/75' : 'text-slate-400'}`}>{time}</div>
      </div>
    </article>
  )
}
