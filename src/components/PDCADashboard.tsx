/**
 * PDCA Dashboard — Painel visual dos Agentes de IA
 */
import React, { useState, useEffect } from 'react';
import { Bot, Play, Pause, RotateCcw, TrendingUp, TrendingDown, Award, Zap, Brain, Target, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AIAgent,
  getAgents,
  toggleAgent,
  resetAgent,
  updateAgentThreshold,
  onAgentsChange,
  initPDCAService,
} from '../services/pdcaAgentService';

const PHASE_COLORS: Record<string, string> = {
  PLAN: 'text-blue-400 bg-blue-500/10',
  DO: 'text-yellow-400 bg-yellow-500/10',
  CHECK: 'text-purple-400 bg-purple-500/10',
  ACT: 'text-green-400 bg-green-500/10',
  IDLE: 'text-gray-400 bg-gray-500/10',
};

export default function PDCADashboard() {
  const [agents, setAgents] = useState<AIAgent[]>(() => {
    initPDCAService();
    return getAgents();
  });
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAgentsChange(setAgents);
    return unsub;
  }, []);

  // Leaderboard
  const ranked = [...agents].filter(a => a.cycles > 0).sort((a, b) => b.totalPnL - a.totalPnL);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-purple-500/10">
            <Brain className="text-purple-400" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Agentes IA — PDCA</h2>
            <p className="text-xs text-gray-500">Plan • Do • Check • Act — Ciclo adaptativo de trading</p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0B0E14] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">{agents.filter(a => a.active).length}</div>
            <div className="text-xs text-gray-500">Agentes Ativos</div>
          </div>
          <div className="bg-[#0B0E14] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{agents.reduce((s, a) => s + a.cycles, 0)}</div>
            <div className="text-xs text-gray-500">Ciclos Total</div>
          </div>
          <div className="bg-[#0B0E14] rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${agents.reduce((s, a) => s + a.totalPnL, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${agents.reduce((s, a) => s + a.totalPnL, 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">PnL Total</div>
          </div>
          <div className="bg-[#0B0E14] rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {agents.reduce((s, a) => s + a.cycles, 0) > 0
                ? ((agents.reduce((s, a) => s + a.wins, 0) / agents.reduce((s, a) => s + a.cycles, 0)) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="text-xs text-gray-500">Win Rate Geral</div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {ranked.length > 0 && (
        <div className="bg-[#151A25] border border-[#2A303C] rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
            <Award size={14} className="text-yellow-400" /> Leaderboard
          </h3>
          <div className="space-y-2">
            {ranked.map((agent, i) => (
              <div key={agent.id} className="flex items-center justify-between bg-[#0B0E14] rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                    #{i + 1}
                  </span>
                  <div>
                    <span className="text-sm text-white font-bold">{agent.name}</span>
                    <span className="text-[10px] text-gray-500 ml-2">{agent.cycles} ciclos</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{agent.winRate.toFixed(0)}% WR</span>
                  <span className={`text-sm font-bold ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${agent.totalPnL.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className="bg-[#151A25] border border-[#2A303C] rounded-xl p-4 hover:border-[#3A404C] transition-all">
            {/* Agent Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot size={18} className={agent.active ? 'text-cyan-400' : 'text-gray-600'} />
                <div>
                  <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                  <p className="text-[10px] text-gray-500">{agent.strategy}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${PHASE_COLORS[agent.phase]}`}>
                  {agent.phase}
                </span>
                <button
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-1.5 rounded ${agent.active ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:bg-white/5'}`}
                  title={agent.active ? 'Desativar' : 'Ativar'}
                >
                  {agent.active ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center">
                <div className="text-sm font-bold text-white">{agent.cycles}</div>
                <div className="text-[9px] text-gray-600">Ciclos</div>
              </div>
              <div className="text-center">
                <div className={`text-sm font-bold ${agent.winRate >= 50 ? 'text-green-400' : agent.winRate > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {agent.winRate.toFixed(0)}%
                </div>
                <div className="text-[9px] text-gray-600">Win Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-sm font-bold ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${agent.totalPnL.toFixed(2)}
                </div>
                <div className="text-[9px] text-gray-600">PnL</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-purple-400">{agent.sharpeRatio.toFixed(2)}</div>
                <div className="text-[9px] text-gray-600">Sharpe</div>
              </div>
            </div>

            {/* Expandable Details */}
            <button
              onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
              className="w-full flex items-center justify-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 py-1"
            >
              {expandedAgent === agent.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expandedAgent === agent.id ? 'Menos' : 'Detalhes'}
            </button>

            {expandedAgent === agent.id && (
              <div className="mt-2 space-y-2 border-t border-[#2A303C]/50 pt-2">
                {/* Threshold */}
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-gray-500">Threshold: {agent.confidenceThreshold}%</label>
                  <input
                    type="range"
                    min={40}
                    max={95}
                    value={agent.confidenceThreshold}
                    onChange={(e) => updateAgentThreshold(agent.id, parseInt(e.target.value))}
                    className="w-24 h-1 accent-cyan-400"
                  />
                </div>

                {/* Adaptive Params */}
                <div className="text-[10px] text-gray-600 space-y-0.5">
                  <div>Threshold Inicial: {agent.adaptiveParams.initialThreshold}% → Atual: {agent.adaptiveParams.adjustedThreshold.toFixed(1)}%</div>
                  <div>Cooldown: {(agent.adaptiveParams.cooldownMs / 1000).toFixed(0)}s</div>
                  <div>Leverage Mult: {agent.adaptiveParams.leverageMultiplier.toFixed(1)}x</div>
                </div>

                {/* Last Cycle */}
                {agent.lastCycle && (
                  <div className="bg-[#0B0E14] rounded-lg p-2 mt-1">
                    <div className="text-[10px] text-gray-500 font-bold">Último Ciclo</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {agent.lastCycle.planSymbol} {agent.lastCycle.planSignal} ({agent.lastCycle.planConfidence?.toFixed(0)}%)
                      → {agent.lastCycle.checkResult === 'WIN' ? '✅ WIN' : '❌ LOSS'}
                      {agent.lastCycle.checkPnL !== undefined && ` $${agent.lastCycle.checkPnL.toFixed(2)}`}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => resetAgent(agent.id)}
                    className="flex items-center gap-1 text-[10px] text-red-400 hover:bg-red-500/10 px-2 py-1 rounded"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
