
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { useStudentData } from '../contexts/StudentDataContext';
import { useNavigation } from '../contexts/NavigationContext';

const WelcomeBanner: React.FC = () => (
    <div className="p-8 rounded-xl bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow-lg hc-bg-override hc-border-override">
        <h2 className="text-3xl font-bold hc-text-override">👋 Bem-vindo de volta!</h2>
        <p className="mt-2 opacity-90 hc-text-override">Continue sua jornada de aprendizado</p>
    </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; value: string | number; label: string; }> = ({ icon, value, label }) => (
    <Card>
        <div className="flex items-center space-x-2">
            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">{label}</p>
            {icon}
        </div>
        <p className="font-bold text-slate-800 dark:text-slate-100 mt-1 hc-text-primary responsive-stat-value">{value}</p>
    </Card>
);

const QuickActionCard: React.FC<{ icon: React.ReactNode; title: string; description: string; onClick: () => void; iconBg: string; iconColor: string; }> = ({ icon, title, description, onClick, iconBg, iconColor }) => (
    <button onClick={onClick} className="w-full h-full text-left group">
        <Card className="flex flex-col items-center text-center h-full group-hover:shadow-md group-hover:-translate-y-1 transition-all duration-200 dark:group-hover:bg-slate-700">
            <div className={`p-4 rounded-full ${iconBg}`}>
                <div className={`h-6 w-6 ${iconColor}`}>{icon}</div>
            </div>
            <h3 className="mt-4 font-bold text-slate-800 dark:text-slate-200 hc-text-primary">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">{description}</p>
        </Card>
    </button>
);

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />
);

const SafeImage: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    if (hasError || !src) {
        return (
            <div className={`${className} flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500`}>
                <div className="text-center p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    <p className="text-xs mt-1 font-semibold">Imagem indisponível</p>
                </div>
            </div>
        );
    }
    
    return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setHasError(true)} crossOrigin="anonymous" />;
};


const Dashboard: React.FC = () => {
    const { modules, quizzes, achievements, isLoading } = useStudentData();
    const { startModule, setCurrentPage } = useNavigation();
    
    // FIX: A module's student-facing status is derived from its progress. 
    // The `status` field is for admin/teacher management.
    const modulesInProgress = modules.filter(m => m.progress && m.progress > 0 && m.progress < 100);
    const modulesCompleted = modules.filter(m => m.progress === 100).length;
    const quizzesCompleted = quizzes.filter(q => (q.attempts || 0) > 0).length;
    const achievementsUnlocked = achievements.filter(a => a.unlocked).length;
    const recentAchievements = achievements.filter(a => a.unlocked).slice(0, 2);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <WelcomeBanner />
            </div>

            <ul className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 {isLoading ? (
                    <>
                        <li key="sk-1"><Skeleton className="h-28" /></li>
                        <li key="sk-2"><Skeleton className="h-28" /></li>
                        <li key="sk-3"><Skeleton className="h-28" /></li>
                        <li key="sk-4"><Skeleton className="h-28" /></li>
                    </>
                ) : (
                    <>
                        <li><StatCard
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            value={modulesCompleted}
                            label="Módulos Concluídos"
                        /></li>
                        <li><StatCard
                            icon={<div className="h-4 w-4 text-blue-500 dark:text-blue-400">{ICONS.stats_progress}</div>}
                            value={modulesInProgress.length}
                            label="Em Progresso"
                        /></li>
                        <li><StatCard
                            icon={<div className="h-4 w-4 text-purple-500 dark:text-purple-400">{ICONS.activities}</div>}
                            value={quizzesCompleted}
                            label="Quizzes Feitos"
                        /></li>
                        <li><StatCard
                            icon={<div className="h-4 w-4 text-yellow-500 dark:text-yellow-400">{ICONS.achievements}</div>}
                            value={achievementsUnlocked}
                            label="Conquistas"
                        /></li>
                    </>
                )}
            </ul>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Continue From Where You Left Off */}
                    <Card>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center mb-4 hc-text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400 hc-link-override" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                            Continue de Onde Parou
                        </h2>
                        {isLoading ? (
                            <Skeleton className="h-48 w-full" />
                        ) : modulesInProgress.length > 0 ? (
                            modulesInProgress.slice(0,1).map(module => {
                                const materiaColorMap: { [key: string]: string } = {
                                    'História': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
                                    'Geografia': 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
                                };
                                const materiaColor = module.materia ? materiaColorMap[module.materia] || 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700';
                                
                                return (
                                <div key={module.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl overflow-hidden flex flex-col sm:flex-row items-stretch group transition-shadow hover:shadow-md border border-slate-200 dark:border-slate-700">
                                    <div className="w-full sm:w-48 flex-shrink-0">
                                        <SafeImage
                                            src={module.coverImageUrl || 'https://images.unsplash.com/photo-1519781542343-dc12c611d9e5?q=80&w=800&auto=format&fit=crop'}
                                            alt={`Capa do módulo ${module.title}`}
                                            className="w-full h-32 sm:h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-4 sm:p-5 flex flex-col flex-grow w-full">
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{module.title}</h3>
                                        <div className="flex items-center flex-wrap gap-2 mt-2 text-xs font-medium">
                                            {module.series && <span className="px-2 py-1 rounded bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{module.series}</span>}
                                            {module.materia && <span className={`px-2 py-1 rounded ${materiaColor}`}>{module.materia}</span>}
                                        </div>
                                        <div className="mt-4 flex-grow">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Progresso</span>
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{module.progress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2" role="progressbar" aria-valuenow={module.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso: ${module.progress}%`}>
                                                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${module.progress}%` }}></div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => startModule(module)} 
                                            className="mt-5 w-full sm:w-auto px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition hc-button-primary-override"
                                        >
                                            Continuar
                                        </button>
                                    </div>
                                </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg hc-border-override">
                                <div className="inline-block bg-slate-100 dark:bg-slate-700/50 rounded-full p-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                                <p className="mt-3 text-slate-500 dark:text-slate-400 hc-text-secondary">Nenhum módulo em progresso</p>
                                <button onClick={() => setCurrentPage('modules')} className="mt-4 px-5 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override">
                                    Explorar Módulos
                                </button>
                            </div>
                        )}
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">Ações Rápidas</h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <li><QuickActionCard 
                                icon={ICONS.teacher_create_module}
                                title="Módulos"
                                description="Explore o conteúdo"
                                onClick={() => setCurrentPage('modules')}
                                iconBg="bg-blue-100 dark:bg-blue-500/20"
                                iconColor="text-blue-600 dark:text-blue-300"
                            /></li>
                            <li><QuickActionCard 
                                icon={ICONS.quizzes}
                                title="Quizzes"
                                description="Teste seus conhecimentos"
                                onClick={() => setCurrentPage('quizzes')}
                                iconBg="bg-purple-100 dark:bg-purple-500/20"
                                iconColor="text-purple-600 dark:text-purple-300"
                            /></li>
                            <li><QuickActionCard 
                                icon={ICONS.achievements}
                                title="Conquistas"
                                description="Veja suas medalhas"
                                onClick={() => setCurrentPage('achievements')}
                                iconBg="bg-amber-100 dark:bg-amber-500/20"
                                iconColor="text-amber-600 dark:text-amber-300"
                            /></li>
                        </ul>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    <Card>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center mb-4 hc-text-primary">
                            <div className="h-5 w-5 mr-2">{ICONS.achievements}</div>
                            Conquistas Recentes
                        </h2>
                        <ul className="space-y-3">
                            {recentAchievements.map(ach => (
                                <li key={ach.id} className="p-3 bg-yellow-50 border border-yellow-200/60 rounded-lg flex items-center space-x-3 dark:bg-yellow-500/10 dark:border-yellow-500/20 hc-bg-override hc-border-override">
                                    <div className="text-yellow-500 dark:text-yellow-400">{ICONS.achievements}</div>
                                    <div>
                                        <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-200 hc-text-primary">{ach.title}</p>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-400 hc-text-secondary">{ach.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
