import React from 'react';

function parseMarkdown(text) {
  if (!text) return '';

  // Convert markdown to HTML
  let html = text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Unordered lists
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>)(\s*<br\/>)*(\s*<li>)/g, '$1$3');
  html = html.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/g, '<ul>$1</ul>');

  return `<p>${html}</p>`;
}

function AIOutput({ data, loading, title }) {
  if (loading) {
    return (
      <div className="ai-output-container">
        <div className="ai-output-header">
          <span className="ai-badge">AI</span>
          <h3>{title || 'AI Analysis'}</h3>
        </div>
        <div className="ai-loading">
          <div className="spinner"></div>
          <span>Analyzing data with AI...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const content = data?.choices?.[0]?.message?.content || 'No analysis available.';
  const model = data?.model || 'AI';
  const usage = data?.usage;

  return (
    <div className="ai-output-container">
      <div className="ai-output-header">
        <span className="ai-badge">AI</span>
        <h3>{title || 'AI Analysis'}</h3>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>
          Model: {model} {usage ? `| Tokens: ${usage.total_tokens}` : ''}
        </span>
      </div>
      <div
        className="ai-output-body"
        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
      />
    </div>
  );
}

export default AIOutput;
