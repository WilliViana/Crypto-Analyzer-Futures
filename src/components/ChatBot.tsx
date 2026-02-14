
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { TradingChatSession } from '../services/geminiService';
import { Language, MarketData } from '../types';
import { translations } from '../utils/translations';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  lang: Language;
  marketData: MarketData;
  symbol: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ lang, marketData, symbol }) => {
  const t = translations[lang].chatbot;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Keep chat session ref to persist history
  const chatSessionRef = useRef<TradingChatSession | null>(null);

  // Initialize session on mount or lang change
  useEffect(() => {
    chatSessionRef.current = new TradingChatSession(lang);
    setMessages([{ id: 'init', role: 'model', text: t.initial }]);
  }, [lang]);

  useEffect(() => {
    if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatSessionRef.current) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Pass marketData for context-aware response
      const responseText = await chatSessionRef.current.sendMessage(userMsg.text, marketData, symbol);
      
      const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText 
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: t.error };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 h-[500px] bg-[#151A25] border border-[#2A303C] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up pointer-events-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-4 border-b border-[#2A303C] flex justify-between items-center backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                <Bot size={18} className="text-indigo-400" />
              </div>
              <div>
                <span className="font-bold text-gray-200 block text-sm">{t.title}</span>
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Live Context: {symbol}
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-900/20' 
                    : 'bg-[#1E232F] border border-[#2A303C] text-gray-200 rounded-bl-none shadow-md'
                }`}>
                  {msg.role === 'model' && <Sparkles size={12} className="text-purple-400 mb-1" />}
                  <div dangerouslySetInnerHTML={{ 
                      __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>') 
                  }} />
                </div>
              </div>
            ))}
            {isTyping && (
               <div className="flex justify-start">
                <div className="bg-[#1E232F] border border-[#2A303C] text-gray-200 rounded-2xl rounded-bl-none p-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span className="text-xs text-gray-400 italic">{t.thinking}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-[#151A25] border-t border-[#2A303C]">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t.placeholder}
                className="flex-1 bg-black/40 border border-[#2A303C] rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-600 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 pointer-events-auto border border-white/10 ${
          isOpen ? 'bg-[#151A25] text-gray-400 rotate-90 hover:text-white' : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:scale-110 hover:shadow-indigo-500/50'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
};

export default ChatBot;
