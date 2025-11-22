import React, { useState, useEffect, useMemo, useContext } from 'react';
import type { ModuleProgress } from '../types';
import { Card } from './common/Card';
import { useSettings, Theme } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
// FIX: Import StudentDataContext to be used with useContext.
import { StudentDataContext } from '../contexts/StudentDataContext';


const StatCard: React.FC<{ icon: React.ReactNode, value: string | number, label: string }> = React.memo(({ icon, value, label }) => (
    <Card className="flex items-center p-4 space-x-4">
        <div className="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 p-3 rounded-lg">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 hc-text-primary">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">{label}</p>
        </div>
    </Card>
));

const ModuleProgressItem: React.FC<{ item: ModuleProgress }> = React.memo(({ item }) => (
    <div className="py-4">
        <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hc-text-primary">{item.name}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === 'Concluído' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                {item.status}
            </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
                className={`h-2 rounded-full ${item.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                style={{ width: `${item.progress}%` }}
            ></div>
        </div>
    </div>
));

const schoolYears = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];


const Profile: React.FC = () => {
    const { user, userRole, updateUser } = useAuth();
    
    // Conditionally access student data to avoid errors for non-student roles.
    const studentData = useContext(StudentDataContext);

    if (userRole === 'aluno' && studentData === undefined) {
        throw new Error('Profile component must be wrapped by StudentDataProvider for students.');
    }

    const userStats = userRole === 'aluno' ? studentData?.userStats : null;
    const modules = userRole === 'aluno' ? studentData?.modules ?? [] : [];

    const { theme, setTheme, isHighContrastText, setIsHighContrastText } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [series, setSeries] = useState(user?.series || '');
    
    const moduleProgress = useMemo((): ModuleProgress[] => {
        return modules
            .filter(m => (m.progress || 0) > 0)
            .map(m => ({
                id: m.id,
                name: m.title,
                progress: m.progress || 0,
                status: m.progress === 100 ? 'Concluído' : 'Em andamento'
            }));
    }, [modules]);

    useEffect(() => {
        setName(user?.name || '');
        setSeries(user?.series || '');
    }, [user]);

    const handleSave = () => {
        if (!user) return;
        updateUser({ ...user, name, series });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setName(user?.name || '');
        setSeries(user?.series || '');
        setIsEditing(false);
    }

     const themes: { id: Theme; label: string }[] = [
        { id: 'light', label: 'Claro' },
        { id: 'dark', label: 'Escuro' },
        { id: 'sepia', label: 'Sépia' },
        { id: 'mn', label: 'MN' },
        { id: 'high-contrast', label: 'Alto Contraste' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <p className="text-slate-500 dark:text-slate-400 -mt-6 hc-text-secondary">Gerencie suas informações e acompanhe seu progresso</p>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override">
                        Editar Perfil
                    </button>
                )}
            </div>

            <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 hc-text-primary">Informações Pessoais</h2>
                <div className="flex justify-between items-center mb-4">
                    
                    {isEditing && (
                        <div className="flex space-x-2">
                            <button onClick={handleCancel} className="px-4 py-1.5 text-sm bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 dark:hover:bg-slate-500 hc-button-override">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override">Salvar</button>
                        </div>
                    )}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Nome Completo</label>
                        {isEditing ? (
                             <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                        ) : (
                            <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.name ?? 'Carregando...'}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Email</label>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.email ?? 'Carregando...'}</p>
                    </div>
                     {userRole === 'aluno' && (
                        <div>
                            <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Ano Escolar</label>
                            {isEditing ? (
                                <select value={series} onChange={e => setSeries(e.target.value)} className="w-full font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                                    {schoolYears.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            ) : (
                                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-text-primary hc-border-override">{user?.series ?? 'Não definido'}</p>
                            )}
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Papel no Sistema</label>
                        <p className="font-semibold text-blue-600 dark:text-blue-400 mt-1 p-2 border-b border-b-slate-200 dark:border-b-slate-600 hc-link-override hc-border-override capitalize">{userRole ?? 'N/A'}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 hc-text-primary">Preferências de Acessibilidade</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400 hc-text-secondary">Tema de cores</label>
                        <div className="mt-1 flex space-x-1 rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                            {themes.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    aria-pressed={theme === t.id}
                                    className={`flex-1 px-4 py-1.5 text-sm font-semibold rounded-md transition ${
                                        theme === t.id
                                            ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-white'
                                            : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10'
                                    } hc-button-override`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700 hc-border-override">
                        <label htmlFor="high-contrast-text-toggle" className="text-sm font-medium text-slate-700 dark:text-slate-300 hc-text-secondary">
                            Texto em Alto Contraste
                        </label>
                        <button
                            id="high-contrast-text-toggle"
                            type="button"
                            role="switch"
                            aria-checked={isHighContrastText}
                            onClick={() => setIsHighContrastText(!isHighContrastText)}
                            className={`${isHighContrastText ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800`}
                        >
                            <span className="sr-only">Ativar texto em alto contraste</span>
                            <span className={`${isHighContrastText ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`} />
                        </button>
                    </div>
                </div>
            </Card>
            
            {userRole === 'aluno' && userStats && (
                <>
                    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <li><StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} value={moduleProgress.filter(p => p.status === 'Concluído').length} label="Módulos Concluídos" /></li>
                        <li><StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 21v-4.5a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 16.5V21" /><path d="M10 3v2.5a1.5 1.5 0 001.5 1.5h1A1.5 1.5 0 0014 5.5V3" /><path d="M6 3v2.5A1.5 1.5 0 007.5 7h1A1.5 1.5 0 0010 5.5V3" /><path d="M14 3v2.5a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5V3" /><path d="M3 10.5v.5a1.5 1.5 0 001.5 1.5h15a1.5 1.5 0 001.5-1.5v-.5" /></svg>} value={userStats.level} label="Nível Atual" /></li>
                        <li><StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M5 21v-4M3 19h4M21 3v4M19 5h4M21 21v-4M19 19h4M12 5V3M12 21v-2" /><path d="M12 18a6 6 0 100-12 6 6 0 000 12z" /></svg>} value={userStats.xp} label="Pontos de XP" /></li>
                    </ul>

                    <Card>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 hc-text-primary">Meu Progresso nos Módulos</h2>
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700 hc-border-override">
                            {moduleProgress.map(item => <li key={item.id}><ModuleProgressItem item={item} /></li>)}
                        </ul>
                    </Card>
                </>
            )}

             <Card>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 hc-text-primary">Atalhos de Teclado</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 hc-text-secondary">Navegue mais rápido usando as teclas <kbd className="font-sans px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Alt</kbd> + <kbd className="font-sans px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Letra</kbd>.</p>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-300 hc-text-primary">
                    {userRole === 'aluno' ? (
                        <>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">D</kbd> - Dashboard</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">M</kbd> - Módulos</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">Q</kbd> - Quizzes</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">A</kbd> - Atividades</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">C</kbd> - Conquistas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">T</kbd> - Turmas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">P</kbd> - Perfil</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">N</kbd> - Notificações</li>
                        </>
                    ) : (
                        <>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">D</kbd> - Dashboard</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">M</kbd> - Minhas Turmas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">B</kbd> - Módulos</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">C</kbd> - Criar Módulo</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">A</kbd> - Criar Atividade</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">E</kbd> - Estatísticas</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">P</kbd> - Perfil</li>
                            <li><kbd className="inline-block w-6 text-center font-sans font-semibold">N</kbd> - Notificações</li>
                        </>
                    )}
                </ul>
            </Card>
        </div>
    );
};

export default Profile;