import { SendHorizonal, WandSparkles } from 'lucide-react'
import { useState } from 'react'

const QUICK_PROMPTS = [
  'Explícame el tema como si fuera mi primera vez.',
  'Dame un ejercicio resuelto paso a paso.',
  'Resume la idea principal en 3 puntos.',
]

export default function ChatComposer({ onSend, placeholder, disabled, sending }) {
  const [value, setValue] = useState('')

  const submitMessage = async (text) => {
    const content = String(text || value).trim()
    if (!content || disabled || sending) {
      return
    }

    setValue('')
    await onSend(content)
  }

  return (
    <div className="border-t border-[#e5e4e7] bg-white/95 p-4 backdrop-blur">
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => submitMessage(prompt)}
            disabled={disabled || sending}
            className="inline-flex items-center gap-2 rounded-full border border-[#e5e4e7] bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-[#9d31ff]/25 hover:bg-[#f8faff] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <WandSparkles className="h-3.5 w-3.5" />
            {prompt}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submitMessage()
        }}
        className="flex items-end gap-3 rounded-3xl border border-[#e5e4e7] bg-[#fafafa] p-3 shadow-sm"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="min-h-[56px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizonal className="h-4 w-4" />
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  )
}
