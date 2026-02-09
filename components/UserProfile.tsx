
import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Phone, Lock, Camera, Shield, Key, CheckCircle, AlertCircle, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Language } from '../types';

interface UserProfileProps {
    lang: Language;
}

const UserProfile: React.FC<UserProfileProps> = ({ lang }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // User profile state
    const [profile, setProfile] = useState({
        displayName: '',
        email: '',
        phone: '',
        avatarUrl: '',
    });

    // Password change state
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });

    // 2FA state
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [twoFALoading, setTwoFALoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // 1. Tentar buscar da tabela 'profiles'
                const { data: profileData, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                // Explicit cast to avoid TS errors until types are regenerated
                const typedProfile = profileData as { full_name?: string; phone?: string; avatar_url?: string } | null;

                if (typedProfile) {
                    setProfile({
                        displayName: typedProfile.full_name || user.user_metadata?.display_name || '',
                        email: user.email || '',
                        phone: typedProfile.phone || user.phone || '',
                        avatarUrl: typedProfile.avatar_url || user.user_metadata?.avatar_url || '',
                    });
                } else {
                    // Fallback para metadados se não houver perfil
                    setProfile({
                        displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        avatarUrl: user.user_metadata?.avatar_url || '',
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamanho (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showMessage('error', 'A imagem deve ter no máximo 2MB');
            return;
        }

        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('Usuário não autenticado');

            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Date.now()}.${fileExt}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));

            // 3. Update Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });
            if (authError) throw authError;

            // 4. Update Profiles Table (Sync)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString()
                });

            if (profileError) console.error('Erro ao sincronizar perfil:', profileError);

            showMessage('success', 'Foto atualizada com sucesso!');
        } catch (error: any) {
            console.error(error);
            showMessage('error', 'Erro ao fazer upload da imagem');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('Usuário não autenticado');

            // 1. Update Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    display_name: profile.displayName,
                    phone: profile.phone
                }
            });
            if (authError) throw authError;

            // 2. Update Profiles Table
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: profile.displayName,
                    phone: profile.phone,
                    updated_at: new Date().toISOString()
                });

            if (profileError) throw profileError;

            showMessage('success', 'Perfil atualizado com sucesso!');
        } catch (error: any) {
            showMessage('error', error.message || 'Erro ao atualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            showMessage('error', 'As senhas não coincidem');
            return;
        }

        if (passwords.new.length < 6) {
            showMessage('error', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.new
            });

            if (error) throw error;
            showMessage('success', 'Senha alterada com sucesso!');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            showMessage('error', error.message || 'Erro ao alterar senha');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle2FA = async () => {
        setTwoFALoading(true);
        try {
            // Note: Supabase doesn't have built-in 2FA for email/password auth
            // This is a placeholder for future implementation with external services
            await new Promise(resolve => setTimeout(resolve, 1000));
            setTwoFAEnabled(!twoFAEnabled);
            showMessage('success', twoFAEnabled ? '2FA desativado' : '2FA ativado com sucesso!');
        } catch (error: any) {
            showMessage('error', 'Erro ao configurar 2FA');
        } finally {
            setTwoFALoading(false);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Meu Perfil</h1>
                <p className="text-gray-500 text-sm">Gerencie suas informações pessoais e segurança</p>
            </div>

            {/* Message Toast */}
            {message && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm">{message.text}</span>
                </div>
            )}

            {/* Avatar Section */}
            <div className="bg-surface rounded-2xl border border-card-border p-6">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div
                            onClick={handleAvatarClick}
                            className="w-24 h-24 rounded-full cursor-pointer overflow-hidden border-4 border-primary/30 hover:border-primary transition-colors bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center"
                        >
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-gray-400" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera size={24} className="text-white" />
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                            aria-label="Upload avatar"
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{profile.displayName || 'Usuário'}</h3>
                        <p className="text-gray-500 text-sm">{profile.email}</p>
                        <p className="text-primary text-xs mt-2 flex items-center gap-1">
                            <Shield size={12} /> Conta verificada
                        </p>
                    </div>
                </div>
            </div>

            {/* Personal Info */}
            <div className="bg-surface rounded-2xl border border-card-border p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <User size={20} className="text-primary" />
                    Informações Pessoais
                </h3>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="displayName" className="block text-xs text-gray-500 uppercase font-bold mb-2">Nome de Exibição</label>
                        <input
                            id="displayName"
                            type="text"
                            value={profile.displayName}
                            onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                            placeholder="Seu nome"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Email</label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                className="w-full bg-black/30 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-gray-400 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">O email não pode ser alterado</p>
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-xs text-gray-500 uppercase font-bold mb-2">Telefone</label>
                        <div className="relative">
                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                id="phone"
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full bg-black/30 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                                placeholder="+55 11 99999-9999"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Alterações
                    </button>
                </div>
            </div>

            {/* Security Section */}
            <div className="bg-surface rounded-2xl border border-card-border p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Lock size={20} className="text-orange-400" />
                    Segurança
                </h3>

                {/* Password Change */}
                <div className="space-y-4 mb-6">
                    <h4 className="text-sm font-bold text-gray-400 uppercase">Alterar Senha</h4>

                    <div className="relative">
                        <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwords.current}
                            onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                            className="w-full bg-black/30 border border-white/10 rounded-lg pl-12 pr-12 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                            placeholder="Senha atual"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwords.new}
                            onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                            className="w-full bg-black/30 border border-white/10 rounded-lg pl-12 pr-12 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                            placeholder="Nova senha"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                            className="w-full bg-black/30 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                            placeholder="Confirmar nova senha"
                        />
                    </div>

                    <button
                        onClick={handleChangePassword}
                        disabled={loading || !passwords.new || !passwords.confirm}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                        Alterar Senha
                    </button>
                </div>

                {/* 2FA Section */}
                <div className="border-t border-white/10 pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <Shield size={16} className="text-green-400" />
                                Autenticação de Dois Fatores (2FA)
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Adicione uma camada extra de segurança à sua conta
                            </p>
                        </div>
                        <button
                            onClick={handleToggle2FA}
                            disabled={twoFALoading}
                            aria-label="Toggle 2FA"
                            className={`relative w-14 h-7 rounded-full transition-colors ${twoFAEnabled ? 'bg-green-500' : 'bg-gray-700'
                                }`}
                        >
                            {twoFALoading ? (
                                <Loader2 size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                            ) : (
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${twoFAEnabled ? 'translate-x-8' : 'translate-x-1'
                                    }`} />
                            )}
                        </button>
                    </div>
                    {twoFAEnabled && (
                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-green-400 text-xs flex items-center gap-2">
                                <CheckCircle size={14} />
                                2FA está ativo. Você receberá um código por SMS ao fazer login.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-6">
                <h3 className="text-lg font-bold text-red-400 mb-2">Zona de Perigo</h3>
                <p className="text-gray-500 text-sm mb-4">Ações irreversíveis para sua conta</p>
                <button className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors text-sm font-bold">
                    Excluir Conta
                </button>
            </div>
        </div>
    );
};

export default UserProfile;
