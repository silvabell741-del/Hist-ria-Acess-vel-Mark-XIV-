import React from 'react';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
// FIX: Changed useData from DataContext to useTeacherData from TeacherDataContext to get correct context data.
import { useTeacherData } from '../contexts/TeacherDataContext';
import { useNavigation } from '../contexts/NavigationContext';

const WelcomeBanner: React.FC = () => (
    <div className="p-8 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hc-bg-override hc-border-override">
        <h2 className="text-3xl font-bold hc-text-override">👋 Bem-vindo(a), Professor(a)!</h2>
        <p className="mt-2 opacity-90 hc-text-override">Gerencie suas turmas e acompanhe o desenvolvimento dos seus alunos.</p>
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

const TeacherMainDashboard: React.FC = () => {
    // Consume the pre-calculated dashboardStats from the context.
    const { dashboardStats, isLoading } = useTeacherData();
    const { setCurrentPage } = useNavigation();
    
    // The stats are now directly available, no local calculation needed.
    const stats = dashboardStats;
    
    return (
        <div className="space-y-8">
            <WelcomeBanner />

            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                            icon={<div className="h-4 w-4 text-indigo-500 dark:text-indigo-400">{ICONS.teacher_dashboard}</div>}
                            value={stats.totalClasses}
                            label="Total de Turmas"
                        /></li>
                        <li><StatCard
                            icon={<div className="h-4 w-4 text-blue-500 dark:text-blue-400">{ICONS.students}</div>}
                            value={stats.totalStudents}
                            label="Total de Alunos"
                        /></li>
                        <li><StatCard
                            icon={<div className="h-4 w-4 text-green-500 dark:text-green-400">{ICONS.modules}</div>}
                            value={stats.totalModulesCreated}
                            label="Módulos Criados"
                        /></li>
                         <li><StatCard
                            icon={<div className="h-4 w-4 text-yellow-500 dark:text-yellow-400">{ICONS.teacher_pending_activities}</div>}
                            value={stats.totalPendingSubmissions}
                            label="Correções Pendentes"
                        /></li>
                    </>
                )}
            </ul>
            
             <Card>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">Ações Rápidas</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <li><QuickActionCard 
                        icon={ICONS.teacher_dashboard}
                        title="Gerenciar Turmas"
                        description="Ver detalhes das turmas"
                        onClick={() => setCurrentPage('teacher_dashboard')}
                        iconBg="bg-blue-100 dark:bg-blue-500/20"
                        iconColor="text-blue-600 dark:text-blue-300"
                    /></li>
                    <li><QuickActionCard 
                        icon={ICONS.teacher_create_module}
                        title="Criar Módulo"
                        description="Adicionar novo conteúdo"
                        onClick={() => setCurrentPage('teacher_create_module')}
                        iconBg="bg-purple-100 dark:bg-purple-500/20"
                        iconColor="text-purple-600 dark:text-purple-300"
                    /></li>
                    <li><QuickActionCard 
                        icon={ICONS.teacher_statistics}
                        title="Ver Estatísticas"
                        description="Analisar desempenho"
                        onClick={() => setCurrentPage('teacher_statistics')}
                        iconBg="bg-amber-100 dark:bg-amber-500/20"
                        iconColor="text-amber-600 dark:text-amber-300"
                    /></li>
                </ul>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">Avisos Recentes</h2>
                <div className="text-center py-10 text-slate-500 dark:text-slate-400 hc-text-secondary">
                    <p>Funcionalidade de avisos recentes em breve.</p>
                </div>
            </Card>

        </div>
    );
};

export default TeacherMainDashboard;