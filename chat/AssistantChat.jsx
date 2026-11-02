import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import Avatar from './Avatar';
import AdminDashboard from './AdminDashboard';

export default function AssistantChat({ onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    let unsub = () => {};
    (async () => {
      try {
        const convos = await base44.agents.listConversations({ agent_name: 'j_connect_assistant' });
        let conv = convos && convos.length > 0 ? convos[0] : null;
        if (!conv) {
          conv = await base44.agents.createConversation({
            agent_name: 'j_connect_assistant',
            metadata: { name: 'J-Connect Assistant', description: 'Your in-app guide' }
          });
        }
        setConversation(conv);
        setMessages(conv.messages || []);
        setLoading(false);
        unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages(data.messages || []);
          setSending(false);
        });
      } catch (e) {
        setLoading(false);
      }
    })();
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending) return;
    const text = input.trim();
    const lower = text.toLowerCase().trim();
    if (lower === 'hey bot' || lower === 'hey j-connect bot' || lower === 'hey j connect bot' || lower === 'hey jconnect bot') {
      if (currentUser?.role === 'admin') {
        setShowAdmin(true);
        setInput('');
        return;
      }
    }
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: text });
    } catch (e) {
      setSending(false);
    }
  };

  if (showAdmin && currentUser?.role === 'admin') {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1120' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onClose} className="p-2.5 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={26} />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
          <Sparkles size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white">J-Connect Assistant</h2>
          <p className="text-xs text-purple-400/80">Online · Here to help</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
              <Sparkles size={28} className="text-white" />
            </div>
            <p className="text-white font-semibold mb-1">Welcome to J-Connect! 👋</p>
            <p className="text-sm text-white/50 max-w-xs">
              Ask me anything about the app, its features, or request a personal tour with our Founder & CEO.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                  style={isUser
                    ? { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', color: '#fff' }
                    : { backgroundColor: '#2A164B', color: '#fff' }}>
                  {isUser
                    ? <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    : <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none">{msg.content || ''}</ReactMarkdown>}
                  {msg.tool_calls?.map((tc, i) => (
                    <div key={i} className="mt-2 text-xs text-white/60 flex items-center gap-1">
                      <Sparkles size={11} /> Working...
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: '#2A164B' }}>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-white/5" style={{ backgroundColor: '#13152a' }}>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask about features or request a tour..."
            className="flex-1 px-4 py-2.5 rounded-full text-sm text-white placeholder:text-white/35 focus:outline-none border border-white/10"
            style={{ backgroundColor: '#1e2140' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}