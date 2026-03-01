import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface Props {
  content: string;
  isUser?: boolean;
}

export default function MarkdownMessage({ content, isUser = false }: Props) {
  if (isUser) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>;
  }

  return (
    <div className={`markdown-body text-sm leading-relaxed`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-gray-900 mb-2 mt-3 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-gray-800 mb-1.5 mt-2.5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-gray-700 mb-1 mt-2 first:mt-0">{children}</h3>
          ),

          // Paragraph
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 text-gray-800 leading-relaxed">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="mb-2 space-y-1 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 space-y-1 pl-1 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-gray-800">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span>{children}</span>
            </li>
          ),

          // Inline code
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code className={`${className} text-xs`}>{children}</code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono border border-indigo-100">
                {children}
              </code>
            );
          },

          // Code block
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 rounded-xl p-3 overflow-x-auto mb-2 text-xs">
              {children}
            </pre>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-indigo-400 pl-3 italic text-gray-600 mb-2 bg-indigo-50/50 rounded-r-lg py-1">
              {children}
            </blockquote>
          ),

          // Bold & italic
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-700">{children}</em>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="border-gray-200 my-3" />
          ),

          // Table
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5 bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5 border border-gray-100 text-gray-700">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
