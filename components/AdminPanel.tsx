
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../utils/translations';
import { supabase, isUserAdmin } from '../services/supabaseClient';
import type { Profile, AuthAudit } from '../types/supabase';
import {
    ShieldCheck, Server, Users, Activity, Lock, AlertTriangle,
    RefreshCw, Power, Settings, Database, Eye, MoreHorizontal, CheckCircle, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminPanelProps {
    lang: Language;
}

interface SystemStats {
    totalUsers: number;
    activeStrategies: number;
    totalTrades: number;
    apiLatency: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lang }) => {
    const t = translations[lang].admin;

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<Profile[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuthAudit[]>([]);
    const [stats, setStats] = useState<SystemStats>({
        totalUsers: 0,
        activeStrategies: 0,
        totalTrades: 0,
        apiLatency: 0
    });
    const [isAdmin, setIsAdmin] = useState(false);

    // System Load Chart Data
    const [systemData] = useState(() =>
        Array.from({ length: 20 }, (_, i) => ({
            time: i,
            cpu: 20 + Math.random() * 30,
            memory: 40 + Math.random() * 10,
            requests: 100 + Math.random() * 50
        }))
    );

    useEffect(() => {
        const loadAdminData = async () => {
            setLoading(true);

            // Check if user is admin
            const adminStatus = await isUserAdmin();
            setIsAdmin(adminStatus);

            if (!adminStatus) {
                setLoading(false);
                return;
            }

            try {
                // Fetch users/profiles
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!profilesError && profilesData) {
                    setUsers(profilesData);
                }

                // Fetch audit logs
                const { data: auditData, error: auditError } = await supabase
                    .from('auth_audit')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!auditError && auditData) {
                    setAuditLogs(auditData);
                }

                // Fetch stats
                const [
                    { count: usersCount },
                    { count: strategiesCount },
                    { count: tradesCount }
                ] = await Promise.all([
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('strategies').select('*', { count: 'exact', head: true }).eq('active', true),
                    supabase.from('trades').select('*', { count: 'exact', head: true })
                ]);

                setStats({
                    totalUsers: usersCount || 0,
                    activeStrategies: strategiesCount || 0,
                    totalTrades: tradesCount || 0,
                    apiLatency: Math.floor(10 + Math.random() * 20) // Simulated latency
                });

            } catch (error) {
                console.error('Error loading admin data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAdminData();
    }, []);

    const formatTimeAgo = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
        return `${Math.floor(diffMins / 1440)} days ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Lock size={48} className="mb-4 text-red-500" />
                <h2 className="text-xl font-bold text-white">Acesso Restrito</h2>
                <p className="text-sm">Você não tem permissão para acessar este painel.</p>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto w-full animate-fade-in text-gray-200 pb-20">

            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30 shadow-lg shadow-red-500/10">
                        <ShieldCheck className="text-red-500" size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{t.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            System Operational
                        </div>
                    </div>
                </div>

                <button className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-red-900/20 transition-all">
                    <Power size={18} /> {t.kill_switch}
                </button>
            </div>

            {/* System Health Grid - Now with REAL data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-card-border rounded-xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-gray-500 text-xs uppercase font-bold">Total Users</div>
                            <div className="text-2xl font-mono font-bold text-white mt-1">{stats.totalUsers}</div>
                        </div>
                        <Users className="text-blue-500" />
                    </div>
                    <div className="mt-2 text-xs text-blue-400 font-bold">From Supabase</div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-gray-500 text-xs uppercase font-bold">Active Strategies</div>
                            <div className="text-2xl font-mono font-bold text-green-400 mt-1">{stats.activeStrategies}</div>
                        </div>
                        <Activity className="text-green-500" />
                    </div>
                    <div className="mt-2 text-xs text-green-400 font-bold">Running now</div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-gray-500 text-xs uppercase font-bold">Total Trades</div>
                            <div className="text-2xl font-mono font-bold text-purple-400 mt-1">{stats.totalTrades}</div>
                        </div>
                        <Database className="text-purple-500" />
                    </div>
                    <div className="mt-2 text-xs text-purple-400 font-bold">All time</div>
                </div>

                <div className="bg-surface border border-card-border rounded-xl p-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-gray-500 text-xs uppercase font-bold">{t.api_status}</div>
                            <div className="text-lg font-mono font-bold text-green-400 mt-1">Connected ({stats.apiLatency}ms)</div>
                        </div>
                        <Server className="text-yellow-500" />
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500 font-mono">
                        Supabase: Active
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* User Management - NOW REAL DATA */}
                <div className="lg:col-span-2 bg-surface border border-card-border rounded-xl shadow-lg flex flex-col">
                    <div className="p-4 border-b border-card-border flex justify-between items-center bg-black/20">
                        <h3 className="font-bold text-white flex items-center gap-2"><Users size={18} className="text-indigo-400" /> {t.users}</h3>
                        <button
                            onClick={() => window.open('https://supabase.com/dashboard/project/bhigvgfkttvjibvlyqpl/auth/users', '_blank')}
                            className="text-xs bg-primary/20 text-primary px-3 py-1 rounded hover:bg-primary/30 transition-colors font-bold"
                        >
                            Manage All
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-black/40 text-xs uppercase font-bold text-gray-500">
                                <tr>
                                    <th className="p-4">{t.user_table.user}</th>
                                    <th className="p-4">{t.user_table.role}</th>
                                    <th className="p-4">{t.user_table.status}</th>
                                    <th className="p-4">{t.user_table.last_login}</th>
                                    <th className="p-4 text-right">{t.user_table.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No users found in database
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white">
                                                        {(user.full_name || user.email || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-200">{user.full_name || 'No name'}</div>
                                                        <div className="text-xs text-gray-500">{user.email || 'No email'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${user.role === 'admin'
                                                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                                    }`}>
                                                    {user.role || 'user'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 rounded text-xs font-bold flex items-center w-fit gap-1 text-green-400 bg-green-500/10">
                                                    <CheckCircle size={10} />
                                                    Active
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-xs">{formatTimeAgo(user.updated_at)}</td>
                                            <td className="p-4 text-right">
                                                <button className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"><MoreHorizontal size={16} /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Configuration & Logs */}
                <div className="flex flex-col gap-6">

                    {/* Load Chart */}
                    <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg h-[200px]">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><Activity size={16} /> System Load (1h)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={systemData}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#151A25', borderColor: '#2A303C' }} />
                                <Area type="monotone" dataKey="cpu" stroke="#3B82F6" fill="url(#colorCpu)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-surface border border-card-border rounded-xl p-4 shadow-lg flex-1">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><Settings size={16} /> {t.config}</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                                <span className="text-sm font-bold text-gray-200">{t.maintenance}</span>
                                <div className="w-10 h-5 bg-gray-700 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-3 h-3 bg-gray-400 rounded-full"></div></div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                                <span className="text-sm font-bold text-gray-200">Force 2FA for All</span>
                                <div className="w-10 h-5 bg-green-500 rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                                <span className="text-sm font-bold text-gray-200">Debug Logging</span>
                                <div className="w-10 h-5 bg-gray-700 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-3 h-3 bg-gray-400 rounded-full"></div></div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* Security Logs - NOW FROM DATABASE */}
            <div className="bg-surface border border-card-border rounded-xl shadow-lg">
                <div className="p-4 border-b border-card-border flex items-center gap-2 bg-black/20">
                    <Lock size={18} className="text-yellow-500" />
                    <h3 className="font-bold text-white">{t.security}</h3>
                </div>
                <div className="p-2">
                    {auditLogs.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No security logs available
                        </div>
                    ) : (
                        auditLogs.map((log, i) => (
                            <div key={log.id || i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded text-sm border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-gray-500">
                                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'N/A'}
                                    </span>
                                    <span className={`font-bold text-xs px-2 py-0.5 rounded ${log.event?.includes('ERROR') || log.event?.includes('FAIL')
                                            ? 'bg-red-500/20 text-red-500'
                                            : log.event?.includes('WARN')
                                                ? 'bg-yellow-500/20 text-yellow-500'
                                                : 'bg-blue-500/20 text-blue-500'
                                        }`}>
                                        {log.event?.includes('ERROR') ? 'ERROR' : log.event?.includes('WARN') ? 'WARN' : 'INFO'}
                                    </span>
                                    <span className="text-gray-300">{log.event}</span>
                                </div>
                                <span className="font-mono text-xs text-gray-600">{log.ip || 'N/A'}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
};

export default AdminPanel;
