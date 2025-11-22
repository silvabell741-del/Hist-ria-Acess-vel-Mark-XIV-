
import React, { useContext } from 'react';
import type { Page } from '../types';
import { Logo, ICONS } from '../constants/index';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
// FIX: Import StudentDataContext to be used with useContext.
import { StudentDataContext } from '../contexts/StudentDataContext';
import { TeacherDataContext } from '../contexts/TeacherDataContext';
import { AdminDataContext } from '../contexts/AdminDataContext';


const studentNavItems: { id: Page, label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'modules', label: 'Módulos' },
    { id: 'quizzes', label: 'Quizzes' },
    { id: 'activities', label: 'Atividades' },
    { id: 'achievements', label: 'Conquistas' },
    { id: 'boletim', label: 'Boletim' },
    { id: 'join_class', label: 'Turmas' },
];

const teacherNavItems: { id: Page, label: string }[] = [
    { id: 'teacher_main_dashboard', label: 'Dashboard' },
    { id: 'teacher_dashboard', label: 'Minhas Turmas' },
    { id: 'teacher_pending_activities', label: 'Pendências' },
    { id: 'modules', label: 'Módulos' },
    { id: 'teacher_create_module', label: 'Criar Módulo' },
    { id: 'teacher_create_activity', label: 'Criar Atividade' },
    { id: 'teacher_statistics', label: 'Estatísticas' },
    { id: 'teacher_school_records', label: 'Histórico Escolar' },
];

const adminNavItems: { id: Page, label: string }[] = [
    { id: 'admin_dashboard', label: 'Dashboard' },
    { id: 'admin_modules', label: 'Gerenciar Módulos' },
    { id: 'admin_quizzes', label: 'Gerenciar Quizzes' },
    { id: 'admin_achievements', label: 'Gerenciar Conquistas' },
    { id: 'admin_stats', label: 'Estatísticas' },
    { id: 'admin_tests', label: 'Testes' },
];


const iconMap: { [key in Page]?: React.ReactNode } = {
    // Student
    dashboard: ICONS['dashboard'],
    modules: ICONS['modules'],
    quizzes: ICONS['quizzes'],
    activities: ICONS['activities'],
    achievements: ICONS['achievements'],
    boletim: ICONS['boletim'],
    join_class: ICONS['join_class'],
    // Teacher
    teacher_main_dashboard: ICONS['dashboard'],
    teacher_dashboard: ICONS['teacher_dashboard'],
    teacher_pending_activities: ICONS['teacher_pending_activities'],
    teacher_create_module: ICONS['teacher_create_module'],
    teacher_create_activity: ICONS['teacher_create_activity'],
    teacher_statistics: ICONS['teacher_statistics'],
    teacher_school_records: ICONS['teacher_school_records'],
    // Admin
    admin_dashboard: ICONS['dashboard'],
    admin_users: ICONS['admin_users'],
    admin_modules: ICONS['modules'],
    admin_quizzes: ICONS['quizzes'],
    admin_achievements: ICONS['achievements'],
    admin_stats: ICONS['teacher_statistics'], // Re-using icon
    admin_tests: ICONS['admin_tests'],
}

export const Sidebar: React.FC = () => {
    const { currentPage, setCurrentPage, isMobileMenuOpen, toggleMobileMenu } = useNavigation();
    const { handleLogout: onLogout, userRole } = useAuth();
    
    const studentData = useContext(StudentDataContext);
    const teacherData = useContext(TeacherDataContext);
    const adminData = useContext(AdminDataContext);

    const notificationCount = userRole === 'aluno' ? studentData?.unreadNotificationCount 
        : userRole === 'professor' ? teacherData?.unreadNotificationCount 
        : adminData?.unreadNotificationCount || 0; // Default to 0 for admin/fallback
    
    const navItems = userRole === 'admin' ? adminNavItems 
                   : userRole === 'professor' ? teacherNavItems 
                   : studentNavItems;

    // Profile is now available for all roles
    const showProfileLink = true;
    const showNotificationsLink = userRole !== 'admin';
    
    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/60 z-20 lg:hidden transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={toggleMobileMenu}
                aria-hidden="true"
            ></div>

            <aside className={`w-64 bg-blue-950 text-slate-200 flex flex-col h-full border-r border-blue-900 dark:bg-slate-900 dark:border-slate-800 hc-bg-override hc-border-override fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b border-blue-900 dark:border-slate-800 hc-border-override">
                    <Logo />
                </div>
                <nav className="flex-1 px-4 py-5 space-y-2">
                    {navItems.map(item => (
                        <a
                            key={item.id}
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(item.id);
                            }}
                            aria-current={currentPage === item.id ? 'page' : undefined}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                                currentPage === item.id ? 'bg-blue-800 text-white font-semibold dark:bg-indigo-500' : 'hover:bg-blue-900 dark:hover:bg-white/10'
                            } hc-link-override`}
                        >
                            {iconMap[item.id]}
                            <span>{item.label}</span>
                        </a>
                    ))}
                </nav>
                <div className="px-4 py-5 border-t border-blue-900 dark:border-slate-800 space-y-2 hc-border-override">
                     {showNotificationsLink && (
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage('notifications');
                            }}
                            aria-current={currentPage === 'notifications' ? 'page' : undefined}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                                currentPage === 'notifications' ? 'bg-blue-800 text-white font-semibold dark:bg-indigo-500' : 'hover:bg-blue-900 dark:hover:bg-white/10'
                            } hc-link-override`}
                        >
                            <div className="flex items-center space-x-3">
                                {ICONS['notifications']}
                                <span>Notificações</span>
                            </div>
                            {notificationCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
                                    {notificationCount}
                                </span>
                            )}
                        </a>
                     )}
                     {showProfileLink && (
                         <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage('profile');
                            }}
                            aria-current={currentPage === 'profile' ? 'page' : undefined}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                                currentPage === 'profile' ? 'bg-blue-800 text-white font-semibold dark:bg-indigo-500' : 'hover:bg-blue-900 dark:hover:bg-white/10'
                            } hc-link-override`}
                        >
                            {ICONS.profile}
                            <span>Perfil</span>
                        </a>
                     )}
                    <button onClick={onLogout} className="flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 w-full text-left hover:bg-blue-900 dark:hover:bg-white/10 hc-link-override">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span>Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
};
