'use client';

import { useMemo } from 'react';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Minimal, safe markdown renderer (escape-first) supporting:
 * fenced code, inline code, bold, italic, links, lists, blockquotes, line breaks.
 */
function renderMarkdown(src: string): string {
  const blocks: string[] = [];
  let text = src.replace(/\r\n/g, '\n');

  // fenced code blocks
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    blocks.push(
      `<pre><code data-lang="${escapeHtml(lang)}">${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`,
    );
    return `\u0000BLOCK${blocks.length - 1}\u0000`;
  });

  // escape the rest
  text = escapeHtml(text);

  // inline code
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // bold / italic
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // links
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // block-level: group list items, paragraphs
  const lines = text.split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${paragraph.join('<br/>')}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      flushParagraph();
      closeList();
    } else if (/^[-*] /.test(trimmed)) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${trimmed.slice(2)}</li>`);
    } else if (/^\d+\. /.test(trimmed)) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${trimmed.replace(/^\d+\. /, '')}</li>`);
    } else if (trimmed.startsWith('&gt; ')) {
      flushParagraph();
      closeList();
      out.push(`<blockquote>${trimmed.slice(5)}</blockquote>`);
    } else {
      closeList();
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  closeList();

  text = out.join('');

  // restore code blocks
  text = text.replace(/\u0000BLOCK(\d+)\u0000/g, (_m, i) => blocks[Number(i)]);

  return text;
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className={`chat-md break-words ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
