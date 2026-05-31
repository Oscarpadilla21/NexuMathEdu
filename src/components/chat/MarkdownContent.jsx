import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const baseClassName = 'space-y-3 text-[13px] leading-6 sm:text-sm'

export default function MarkdownContent({ content, tone = 'light' }) {
  const textClass = tone === 'dark' ? 'text-white' : 'text-slate-800'
  const headingClass = tone === 'dark' ? 'text-white' : 'text-slate-900'
  const mutedClass = tone === 'dark' ? 'text-white/90' : 'text-slate-600'

  return (
    <div className={baseClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap break-words">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-inherit">{children}</strong>,
          em: ({ children }) => <em className="italic text-inherit">{children}</em>,
          h1: ({ children }) => <h1 className={`text-lg font-semibold ${headingClass}`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`text-base font-semibold ${headingClass}`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`text-sm font-semibold ${headingClass}`}>{children}</h3>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="break-words">{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className={`min-w-full border-collapse rounded-2xl border text-left text-sm ${tone === 'dark' ? 'border-white/20' : 'border-[#ece8f6]'}`}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={tone === 'dark' ? 'bg-white/10' : 'bg-[#f8faff]'}>{children}</thead>,
          th: ({ children }) => (
            <th className={`border-b px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] ${tone === 'dark' ? 'border-white/20 text-white/80' : 'border-[#ece8f6] text-slate-500'}`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`border-b px-3 py-2 align-top ${tone === 'dark' ? 'border-white/10 text-white' : 'border-[#ece8f6] text-slate-800'}`}>
              {children}
            </td>
          ),
          code: ({ inline, children }) =>
            inline ? (
              <code className={`rounded px-1.5 py-0.5 text-[12px] font-medium ${tone === 'dark' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {children}
              </code>
            ) : (
              <pre className={`overflow-x-auto rounded-2xl px-4 py-3 text-[12px] leading-6 ${tone === 'dark' ? 'bg-black/30 text-white' : 'bg-slate-950 text-slate-100'}`}>
                <code>{children}</code>
              </pre>
            ),
          blockquote: ({ children }) => (
            <blockquote className={`border-l-4 pl-4 ${tone === 'dark' ? 'border-white/30 text-white/90' : 'border-[#9d31ff]/30 text-slate-600'}`}>{children}</blockquote>
          ),
          a: ({ children, href }) => (
            <a
              className={`font-medium underline underline-offset-2 ${tone === 'dark' ? 'text-white decoration-white/50' : 'text-[#9d31ff] decoration-[#9d31ff]/40'}`}
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}
