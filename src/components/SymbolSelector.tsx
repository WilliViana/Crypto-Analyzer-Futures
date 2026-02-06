import React, { useState } from 'react';
import { X, Search, Check, Layers, Filter } from 'lucide-react';

interface PairData { symbol: string; baseAsset: string; quoteAsset: string; }
interface SymbolSelectorProps { allPairs: PairData[]; availableQuotes: string[]; selectedSymbols: string[]; onSave: (symbols: string[]) => void; onClose: () => void; }

export default function SymbolSelector({ allPairs, availableQuotes, selectedSymbols, onSave, onClose }: SymbolSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>(availableQuotes.includes('USDT') ? 'USDT' : availableQuotes[0] || '');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedSymbols);

  const currentList = allPairs.filter(p => p.quoteAsset === activeTab && p.symbol.includes(search.toUpperCase()));
  const toggleSymbol = (symbol: string) => { if (tempSelected.includes(symbol)) { setTempSelected(prev => prev.filter(s => s !== symbol)); } else { setTempSelected(prev => [...prev, symbol]); } };
  const handleSelectAllInTab = () => { const tabSymbols = currentList.map(p => p.symbol); const allSelected = tabSymbols.every(s => tempSelected.includes(s)); if (allSelected) { setTempSelected(prev => prev.filter(s => !tabSymbols.includes(s))); } else { const newSelection = new Set([...tempSelected, ...tabSymbols]); setTempSelected(Array.from(newSelection)); } };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#1A1F2E] border border-[#2A303C] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[85vh]">
        <div className="p-6 border-b border-[#2A303C] bg-[#151A25] flex justify-between items-center shrink-0">
          <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="text-indigo-500" size={20}/> Seleção de Ativos</h2><p className="text-xs text-gray-400 mt-1">{tempSelected.length} pares selecionados.</p></div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20}/></button>
        </div>
        <div className="flex overflow-x-auto border-b border-[#2A303C] bg-[#12161f] shrink-0 scrollbar-hide">
            {availableQuotes.map(quote => (<button key={quote} onClick={() => setActiveTab(quote)} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === quote ? 'border-indigo-500 text-white bg-indigo-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{quote} Markets</button>))}
        </div>
        <div className="p-4 border-b border-[#2A303C] flex gap-4 shrink-0 bg-[#1A1F2E]">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-gray-500" size={16} /><input type="text" placeholder={`Buscar em ${activeTab}...`} className="w-full bg-[#0B0E14] border border-[#2A303C] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button onClick={handleSelectAllInTab} className="px-4 py-2 bg-[#2A303C] hover:bg-[#353C4B] text-xs font-bold text-white rounded-lg border border-white/5">Todos ({activeTab})</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 custom-scrollbar content-start">
          {currentList.map(pair => { const isSelected = tempSelected.includes(pair.symbol); return (<button key={pair.symbol} onClick={() => toggleSymbol(pair.symbol)} className={`flex items-center justify-between px-3 py-3 rounded-lg text-xs font-bold transition-all border group ${isSelected ? 'bg-indigo-600/20 border-indigo-500/50 text-white' : 'bg-[#0B0E14] border-transparent text-gray-400'}`}><div className="flex flex-col items-start"><span>{pair.baseAsset}</span><span className="text-[9px] opacity-50 font-normal">/{pair.quoteAsset}</span></div>{isSelected && <Check size={14} className="text-indigo-400"/>}</button>) })}
        </div>
        <div className="p-6 border-t border-[#2A303C] bg-[#151A25] flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-500">Total: <span className="text-white font-bold">{tempSelected.length}</span></div>
          <div className="flex gap-3"><button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button><button onClick={() => onSave(tempSelected)} disabled={tempSelected.length === 0} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2"><Check size={16}/> Salvar</button></div>
        </div>
      </div>
    </div>
  );
}