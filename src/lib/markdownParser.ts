// Simple markdown parser for chat messages
// Handles: **bold**, *italic*, `code`, and line breaks

export function parseMarkdown(text: string): string {
  if (!text) return '';
  
  let parsed = text;
  
  // Handle bold **text**
  parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  
  // Handle italic *text*
  parsed = parsed.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
  
  // Handle inline code `text`
  parsed = parsed.replace(/`(.+?)`/g, '<code class="bg-gray-700 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-sm">$1</code>');
  
  // Handle line breaks
  parsed = parsed.replace(/\n/g, '<br />');
  
  return parsed;
}

// Core Markdown processing utilities
