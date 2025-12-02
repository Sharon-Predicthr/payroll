'use client';

import { useState } from 'react';

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, 'You: ' + input]);
    setMessages(prev => [...prev, 'AI: (placeholder response)']);
    setInput('');
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>AI Assistant (Placeholder)</h1>
      <div style={{ border: '1px solid #ccc', padding: '1rem', height: 300, overflowY: 'auto', marginBottom: '1rem' }}>
        {messages.map((m, i) => <div key={i}>{m}</div>)}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          style={{ flex: 1, padding: '0.5rem' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask something about payroll..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </main>
  );
}
