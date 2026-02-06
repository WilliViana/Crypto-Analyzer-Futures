
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Wallet, Globe, LineChart, PieChart as PieChartIcon, Layers, Shield, X, Info, ExternalLink, Calculator } from 'lucide-react';
import { Language, RealAccountData, Trade } from '../types';
import { translations } from '../utils/translations';

interface WalletDashboardProps {
  lang: Language;
  realPortfolio: RealAccountData;
  trades?: Trade[]; // Trades para vincular a estratégia à posição
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const WalletDashboard: React.FC<WalletDashboardProps> = React.memo(({ lang, realPortfolio, trades = [] }) => {
  const t = translations[lang].wallet;
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  // Derivar Saldo em Carteira (Wallet Balance) subtraindo o PnL do Equity Total (Margin Balance)
  const walletBalance = realPortfolio.totalBalance - realPortfolio.unrealizedPnL;

  const assets = useMemo(() => {
    return realPortfolio.assets.map(asset => ({
        ...asset,
        allocation: realPortfolio.totalBalance > 0 
            ? parseFloat(((asset.value / realPortfolio.totalBalance) * 100).toFixed(2)) 
            : 0
    }));
  }, [realPortfolio]);

  const allocationData = useMemo(() => {
      if (assets.length === 0) return [];
      return assets.map(a => ({ name: a.symbol, value: a.allocation }));
  }, [assets]);

  // Função robusta para encontrar a estratégia de origem
  const getStrategyForAsset = (symbol: string) => {
      if (!trades || trades.length === 0) return 'Manual / Externo';

      // Normaliza o símbolo do ativo (ex: BTCUSDT -> BTC)
      const assetSymbol = symbol.toUpperCase().replace('USDT', '');
      
      // Procura o trade ABERTO mais recente que corresponda ao símbolo
      const trade = [...trades].reverse().find(t => {
          const tradeSymbol = t.symbol.toUpperCase().replace('USDT', '');
          return t.status === 'OPEN' && tradeSymbol === assetSymbol;
      });
      
      return trade?.strategyName || 'Manual / Externo';
  };

  const AssetModal = ({ asset, onClose }: { asset: any, onClose: () => void }) => {
      const strategyName = getStrategyForAsset(asset.symbol);
      const side = asset.amount > 0 ? 'LONG' : 'SHORT';
      const pnlColor = asset.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400';
      const pnlSign = asset.unrealizedPnL > 0 ? '+' : '';

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-[#151A25] border border-[#2A303C] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
                  <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-6 border-b border-[#2A303C]">
                      <div className="flex justify-between items-start">
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${asset.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{side}</span>
                                  <h3 className="text-xl font-bold text-white">{asset.symbol}</h3>
                              </div>
                              <span className="text-gray-400 text-xs uppercase tracking-wide font-bold">Detalhes da Posição</span>
                          </div>
                          <button onClick={onClose} className="bg-black/20 hover:bg-white/10 p-2 rounded-full text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
                      </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* Cartão de Estratégia */}
                      <div className="p-4 bg-black/30 border border-white/5 rounded-xl flex items-center gap-4">
                          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                              <Shield size={24} />
                          </div>
                          <div>
                              <div className="text-[10px] uppercase font-bold text-gray-500">Origem da Ordem</div>
                              <div className="text-white font-bold text-sm flex items-center gap-2">
                                {strategyName}
                                {strategyName !== 'Manual / Externo' && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                              <div className="text-[10px] text-gray-500 uppercase font-bold">Preço Médio</div>
                              <div className="text-white font-mono font-bold">${asset.price.toLocaleString()}</div>
                          </div>
                          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                              <div className="text-[10px] text-gray-500 uppercase font-bold">Tamanho (Contratos)</div>
                              <div className="text-white font-mono font-bold">{Math.abs(asset.amount).toFixed(4)}</div>
                          </div>
                          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                              <div className="text-[10px] text-gray-500 uppercase font-bold">Investido (Margem)</div>
                              <div className="text-white font-mono font-bold">${(asset.initialMargin || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                          </div>
                          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                              <div className="text-[10px] text-gray-500 uppercase font-bold">PnL Não Realizado</div>
                              <div className={`${pnlColor} font-mono font-bold`}>
                                  {pnlSign}{asset.unrealizedPnL.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-2">
                          <div className="text-[10px] text-gray-500">Valor Nocional: <span className="text-white font-mono">${asset.value.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                          <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                              <ExternalLink size={12} /> Ver na Binance
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto w-full animate-fade-in text-gray-200">
        {selectedAsset && <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
        
        {/* Header / Metrics Row */}
        <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                 <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                     <Wallet className="text-primary" size={32} />
                 </div>
                 <div>
                     <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Carteira de Futuros</h2>
                     <div className="flex items-center gap-2 text-xs text-gray-400">
                         <div className={`w-2 h-2 rounded-full ${realPortfolio.isSimulated ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div> 
                         Sincronizado via {realPortfolio.isSimulated ? 'Binance Testnet' : 'Binance Mainnet'}
                     </div>
                 </div>
            </div>

            <div className="flex flex-wrap gap-4 lg:gap-8 flex-1 justify-end">
                 {/* Card de Saldo Explicativo */}
                 <div className="bg-black/30 rounded-lg p-4 min-w-[240px] border border-white/5 relative overflow-hidden group">
                     <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Calculator size={64} />
                     </div>
                     <div className="text-[10px] uppercase font-bold text-gray-500 flex justify-between mb-1">
                        <span>{t.total_balance} (Equity)</span>
                        <span title="Saldo em Carteira + PnL Flutuante">
                           <Info size={12} className="text-gray-600" />
                        </span>
                     </div>
                     <div className="text-3xl font-mono font-bold text-white mt-1">
                         ${realPortfolio.totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                     </div>
                     
                     {/* Breakdown Visual do Saldo */}
                     <div className="mt-3 flex items-center gap-2 text-[10px] font-mono border-t border-white/10 pt-2">
                        <span className="text-gray-400" title="Saldo Disponível na Carteira">${walletBalance.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                        <span className="text-gray-600">+</span>
                        <span className={`${realPortfolio.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} title="PnL Flutuante">
                            {realPortfolio.unrealizedPnL >= 0 ? '+' : ''}{realPortfolio.unrealizedPnL.toLocaleString(undefined, {maximumFractionDigits: 0})} (PnL)
                        </span>
                     </div>
                 </div>
                 
                 <div className="bg-black/30 rounded-lg p-4 min-w-[200px] border border-white/5">
                     <div className="text-[10px] uppercase font-bold text-gray-500">PnL Flutuante Real</div>
                     <div className={`text-3xl font-mono font-bold mt-1 ${realPortfolio.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {realPortfolio.unrealizedPnL >= 0 ? '+' : ''}${realPortfolio.unrealizedPnL.toLocaleString(undefined, {minimumFractionDigits: 2})}
                     </div>
                     <div className="text-[10px] text-gray-500 mt-2 uppercase">Resultado das Posições Abertas</div>
                 </div>

                 <div className="bg-black/30 rounded-lg p-4 min-w-[150px] border border-white/5 flex flex-col justify-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Status da API</div>
                    <div className="flex items-center gap-2 text-green-500 font-bold text-xs">
                        <Globe size={14} /> ONLINE
                    </div>
                 </div>
            </div>
        </div>

        {/* Charts Row - REAL DATA ONLY */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[400px]">
            <div className="xl:col-span-2 bg-[#151A25] border border-[#2A303C] rounded-xl p-6 shadow-lg flex flex-col justify-center items-center">
                <h3 className="text-sm font-bold text-white mb-auto w-full flex items-center gap-2 uppercase tracking-tight">
                    <LineChart size={18} className="text-primary" /> Histórico de PnL
                </h3>
                <div className="text-gray-500 text-xs italic">
                    Visualização histórica indisponível no modo Lite.
                </div>
                <div className="mb-auto"></div>
            </div>

            <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-6 shadow-lg flex flex-col">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
                    <PieChartIcon size={18} className="text-purple-500" /> Alocação de Posições
                </h3>
                <div className="flex-1 w-full min-h-0">
                    {allocationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={allocationData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {allocationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#151A25', borderColor: '#2A303C' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-xs italic">
                            Nenhuma posição aberta.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Holdings Table - REAL DATA ONLY */}
        <div className="bg-[#151A25] border border-[#2A303C] rounded-xl shadow-lg flex flex-col">
            <div className="p-4 border-b border-[#2A303C] flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                    <Layers size={18} className="text-blue-400" /> Posições Abertas (Real)
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-black/20 text-[10px] uppercase font-bold text-gray-500">
                        <tr>
                            <th className="p-4">Contrato</th>
                            <th className="p-4">Estratégia</th>
                            <th className="p-4 text-right">Tamanho</th>
                            <th className="p-4 text-right">Entrada</th>
                            <th className="p-4 text-right">Investido</th>
                            <th className="p-4 text-right">PnL Aberto</th>
                            <th className="p-4 text-right">Alocação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-xs">
                        {assets.length > 0 ? assets.map((asset) => (
                            <tr 
                                key={asset.symbol} 
                                onClick={() => setSelectedAsset(asset)}
                                className="hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                                <td className="p-4 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                                        {asset.symbol[0]}
                                    </div>
                                    <div className="font-bold text-white group-hover:text-primary transition-colors">{asset.symbol}</div>
                                </td>
                                <td className="p-4">
                                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-300 font-bold uppercase tracking-wider">
                                        {getStrategyForAsset(asset.symbol)}
                                    </span>
                                </td>
                                <td className={`p-4 text-right font-bold ${asset.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {asset.amount.toFixed(4)}
                                </td>
                                <td className="p-4 text-right">${asset.price.toLocaleString()}</td>
                                <td className="p-4 text-right text-white font-bold">
                                    ${(asset.initialMargin || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className={`p-4 text-right font-bold ${asset.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {asset.unrealizedPnL >= 0 ? '+' : ''}${asset.unrealizedPnL.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-gray-300 font-bold">{asset.allocation}%</span>
                                        <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="bg-primary h-full" style={{ width: `${asset.allocation}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="p-10 text-center text-gray-600 italic">
                                    Nenhuma posição de futuros em aberto detectada na API.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
});

export default WalletDashboard;
