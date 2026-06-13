import { SendHorizonal, WandSparkles, Calculator } from 'lucide-react'
import { useRef, useState } from 'react'

const QUICK_PROMPTS = [
  'Explícame el tema como si fuera mi primera vez.',
  'Dame un ejercicio resuelto paso a paso.',
  'Resume la idea principal en 3 puntos.',
]

const KEYBOARD_ROWS = [
  ['sin', 'cos', 'tan', '√', 'x²'],
  ['log', 'ln', 'π', 'e', '('],
  ['7', '8', '9', '÷', ')'],
  ['4', '5', '6', '×', '←'],
  ['1', '2', '3', '-', '+'],
  ['C', '0', '.', '±', '='],
]

export default function ChatComposer({ onSend, placeholder, disabled, sending }) {
  const [value, setValue] = useState('')
  const [showKeyboard, setShowKeyboard] = useState(false)
  const textareaRef = useRef(null)

  const submitMessage = async (text) => {
    const content = String(text || value).trim()
    if (!content || disabled || sending) return
    setValue('')
    setShowKeyboard(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await onSend(content)
  }

  const handleKeyboardInput = (key) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    if (key === '←') {
      if (start === end && start > 0) {
        setValue((prev) => prev.substring(0, start - 1) + prev.substring(end))
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(start - 1, start - 1)
        })
      } else if (start !== end) {
        setValue((prev) => prev.substring(0, start) + prev.substring(end))
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(start, start)
        })
      }
      return
    }

    if (key === 'C') {
      setValue('')
      return
    }

    let insertText = key
    if (key === '×') insertText = '*'
    else if (key === '÷') insertText = '/'
    else if (key === '√') insertText = 'sqrt('
    else if (key === 'x²') insertText = '^2'
    else if (key === 'π') insertText = 'pi'
    else if (['sin', 'cos', 'tan', 'log', 'ln'].includes(key)) insertText = key + '('

    const newValue = value.substring(0, start) + insertText + value.substring(end)
    setValue(newValue)

    requestAnimationFrame(() => {
      textarea.focus()
      const pos = start + insertText.length
      textarea.setSelectionRange(pos, pos)
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`
    })
  }

  // Auto-expandir textarea según contenido.
  const handleChange = (e) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }

  const handleKeyDown = (e) => {
    // Enviar con Enter (sin Shift) en escritorio.
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 640) {
      e.preventDefault()
      void submitMessage()
    }
  }

  return (
    <div className="bg-white/95 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2.5">
      {/* Quick prompts — solo visibles en sm+ para no consumir espacio en móvil */}
      <div className="mb-2 hidden flex-wrap gap-1.5 sm:flex">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => submitMessage(prompt)}
            disabled={disabled || sending}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e4e7] bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm transition hover:border-[#9d31ff]/25 hover:bg-[#f8faff] hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <WandSparkles className="h-3 w-3 shrink-0 text-[#9d31ff]" />
            <span className="truncate max-w-[160px]">{prompt}</span>
          </button>
        ))}
      </div>

      {/* Formulario principal */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submitMessage()
        }}
        className="flex items-end gap-1 rounded-2xl border border-[#e5e4e7] bg-[#fafafa] px-2 py-2 shadow-sm transition focus-within:border-[#9d31ff]/30 focus-within:ring-2 focus-within:ring-[#9d31ff]/10 sm:gap-2 sm:rounded-3xl sm:px-3 sm:py-3"
      >
        <button
          type="button"
          onClick={() => setShowKeyboard(!showKeyboard)}
          disabled={disabled || sending}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11 sm:rounded-2xl ${
            showKeyboard
              ? 'border-[#9d31ff] bg-[#9d31ff] text-white shadow-sm'
              : 'border-[#e5e4e7] bg-white text-slate-500 hover:border-[#9d31ff]/30 hover:text-[#9d31ff]'
          }`}
          title="Teclado matematico"
        >
          <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="max-h-[180px] min-h-[36px] flex-1 resize-none bg-transparent py-1 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 sm:min-h-[40px]"
        />
        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#9d31ff] to-[#ff318c] text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-4"
        >
          <SendHorizonal className="h-4 w-4" />
          <span className="hidden text-sm font-semibold sm:inline">
            {sending ? 'Enviando…' : 'Enviar'}
          </span>
        </button>
      </form>

      {/* Teclado numerico cientifico */}
      {showKeyboard && (
        <div className="mt-2 rounded-2xl border border-[#e5e4e7] bg-white p-2 shadow-sm sm:p-2.5">
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
            {KEYBOARD_ROWS.flat().map((key) => {
              if (!key) return <div key="empty" />
              const isNumber = /^[0-9]$/.test(key)
              const isOperator = ['×', '÷', '-', '+', '±', '='].includes(key)
              const isFunction = ['sin', 'cos', 'tan', 'log', 'ln', '√', 'x²', 'π', 'e'].includes(key)
              const isSpecial = ['←', 'C'].includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyboardInput(key)}
                  disabled={disabled || sending}
                  className={`flex h-9 items-center justify-center rounded-xl text-xs font-semibold transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:text-sm ${
                    key === '='
                      ? 'bg-gradient-to-r from-[#9d31ff] to-[#ff318c] text-white shadow-sm hover:brightness-110'
                      : isSpecial
                        ? 'border border-[#ffd4e7] bg-[#fff5fb] text-[#d92d7a] hover:bg-[#ffeef4]'
                        : isFunction
                          ? 'border border-[#ece8f6] bg-[#f1ecfb] text-[#7a22cc] hover:bg-[#e6ddfa]'
                          : isOperator
                            ? 'border border-[#ece8f6] bg-[#f8faff] text-[#9d31ff] hover:bg-[#eef2ff]'
                            : isNumber
                              ? 'border border-[#ece8f6] bg-white text-slate-800 hover:bg-[#f8faff]'
                              : 'border border-[#ece8f6] bg-white text-slate-700 hover:bg-[#f8faff]'
                  }`}
                >
                  {key}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Hint de teclado en escritorio */}
      <p className="mt-1.5 hidden text-center text-[10px] text-slate-400 sm:block">
        Presiona <kbd className="rounded bg-slate-100 px-1 font-mono text-slate-500">Enter</kbd> para enviar · <kbd className="rounded bg-slate-100 px-1 font-mono text-slate-500">Shift + Enter</kbd> para nueva línea
      </p>
    </div>
  )
}
