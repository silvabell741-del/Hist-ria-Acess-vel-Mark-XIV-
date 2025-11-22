
import React, { lazy, Suspense, useContext, useEffect, useState, useRef } from 'react';
import type { Page, Role, User } from './types';
import { LoginPage } from './components/LoginPage';
import { RoleSelectionPage } from './components/RoleSelectionPage';
import { YearSelectionPage } from './components/YearSelectionPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Card } from './components/common/Card';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { StudentDataProvider, useStudentData, StudentDataContext } from './contexts/StudentDataContext';
import { TeacherDataProvider, useTeacherData, TeacherDataContext } from './contexts/TeacherDataContext';
import { AdminDataProvider, AdminDataContext } from './contexts/AdminDataContext';
import { ToastProvider } from './contexts/ToastContext';

// Lazy-loaded page components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Modules = lazy(() => import('./components/Modules'));
const Quizzes = lazy(() => import('./components/Quizzes'));
const Activities = lazy(() => import('./components/Activities'));
const Achievements = lazy(() => import('./components/Achievements'));
const JoinClass = lazy(() => import('./components/JoinClass'));
const Profile = lazy(() => import('./components/Profile'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const ModuleViewPage = lazy(() => import('./components/ModuleViewPage'));
const Boletim = lazy(() => import('./components/Boletim'));
// Teacher Components
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const TeacherMainDashboard = lazy(() => import('./components/TeacherMainDashboard'));
const ModuleCreator = lazy(() => import('./components/ModuleCreator'));
const CreateActivity = lazy(() => import('./components/CreateActivity'));
const TeacherStatistics = lazy(() => import('./components/TeacherStatistics'));
// FIX: Corrected import path casing to 'PendingActivities' to match the existing PascalCase file.
const PendingActivities = lazy(() => import('./components/PendingActivities'));
const SchoolRecords = lazy(() => import('./components/SchoolRecords'));
const ClassView = lazy(() => import('./components/ClassView'));
// Admin Components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminManageUsers = lazy(() => import('./components/AdminManageUsers'));
const AdminManageModules = lazy(() => import('./components/AdminManageModules'));
const AdminManageQuizzes = lazy(() => import('./components/AdminManageQuizzes'));
const AdminManageAchievements = lazy(() => import('./components/AdminManageAchievements'));
const AdminStats = lazy(() => import('./components/AdminStats'));
const AdminTests = lazy(() => import('./components/AdminTests'));
const QuizCreator = lazy(() => import('./components/QuizCreator'));
const CreateAchievement = lazy(() => import('./components/CreateAchievement'));
// New Admin Exclusive Components
const AdminCreateModule = lazy(() => import('./components/AdminCreateModule'));
const AdminCreateQuiz = lazy(() => import('./components/AdminCreateQuiz'));


const PAGE_TITLES: Record<Exclude<Page, 'module_view' | 'class_view' | 'teacher_create_module' | 'teacher_create_activity' | 'admin_create_quiz' | 'admin_create_achievement' | 'teacher_pending_activities' | 'admin_create_module'>, string> = {
    dashboard: 'Dashboard',
    modules: 'Módulos',
    quizzes: 'Quizzes',
    activities: 'Atividades',
    achievements: 'Conquistas',
    join_class: 'Turmas',
    profile: 'Meu Perfil',
    notifications: 'Notificações',
    boletim: 'Boletim',
    teacher_dashboard: 'Minhas Turmas',
    teacher_main_dashboard: 'Dashboard',
    teacher_statistics: 'Estatísticas do Professor',
    teacher_school_records: 'Histórico Escolar',
    admin_dashboard: 'Painel do Administrador',
    admin_users: 'Gerenciar Usuários',
    admin_modules: 'Gerenciar Módulos',
    admin_quizzes: 'Gerenciar Quizzes',
    admin_achievements: 'Gerenciar Conquistas',
    admin_stats: 'Estatísticas da Plataforma',
    admin_tests: 'Painel de Testes',
};

const LoadingSpinner: React.FC = () => (
    <div role="status" className="flex justify-center items-center h-full pt-16">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="sr-only">Carregando conteúdo...</span>
    </div>
);

const useKeyboardShortcuts = () => {
    const { userRole } = useAuth();
    const { setCurrentPage } = useNavigation();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore shortcuts if user is typing in an input, textarea, etc.
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                return;
            }

            if (event.altKey) {
                const key = event.key.toLowerCase();
                let targetPage: Page | null = null;
                
                if (userRole === 'aluno') {
                    switch(key) {
                        case 'd': targetPage = 'dashboard'; break;
                        case 'm': targetPage = 'modules'; break;
                        case 'q': targetPage = 'quizzes'; break;
                        case 'a': targetPage = 'activities'; break;
                        case 'c': targetPage = 'achievements'; break; // 'c' for conquistas
                        case 't': targetPage = 'join_class'; break; // 't' for turmas
                        case 'p': targetPage = 'profile'; break;
                        case 'n': targetPage = 'notifications'; break;
                        case 'b': targetPage = 'boletim'; break;
                    }
                } else if (userRole === 'professor') {
                     switch(key) {
                        case 'd': targetPage = 'teacher_main_dashboard'; break;
                        case 'm': targetPage = 'teacher_dashboard'; break; // 'm' for minhas turmas
                        case 'i': targetPage = 'teacher_pending_activities'; break;
                        case 'b': targetPage = 'modules'; break; // b for biblioteca de módulos
                        case 'c': targetPage = 'teacher_create_module'; break;
                        case 'a': targetPage = 'teacher_create_activity'; break;
                        case 'e': targetPage = 'teacher_statistics'; break;
                        case 'h': targetPage = 'teacher_school_records'; break;
                        case 'p': targetPage = 'profile'; break;
                        case 'n': targetPage = 'notifications'; break;
                    }
                } else if (userRole === 'admin') {
                     switch(key) {
                        case 'd': targetPage = 'admin_dashboard'; break;
                        case 'u': targetPage = 'admin_users'; break; 
                        case 'm': targetPage = 'admin_modules'; break; 
                        case 'q': targetPage = 'admin_quizzes'; break; 
                        case 'c': targetPage = 'admin_achievements'; break;
                        case 'e': targetPage = 'admin_stats'; break;
                        case 't': targetPage = 'admin_tests'; break;
                        case 'p': targetPage = 'profile'; break;
                    }
                }

                if (targetPage) {
                    event.preventDefault();
                    setCurrentPage(targetPage);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [userRole, setCurrentPage]);
};


const MainLayout: React.FC = () => {
    useKeyboardShortcuts();
    const { userRole } = useAuth();
    const { currentPage, activeModule, activeClass, editingModule, editingQuiz, editingAchievement, setCurrentPage, toggleMobileMenu } = useNavigation();
    
    const [isScrolled, setIsScrolled] = useState(false);
    const mainContentRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const mainEl = mainContentRef.current;
        if (!mainEl) return;

        const handleScroll = () => {
            setIsScrolled(mainEl.scrollTop > 20);
        };

        mainEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            mainEl.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Effect for page navigation accessibility: reset scroll and focus heading
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTop = 0;
        }
        // Focus on the H1 to announce page change
        const heading = document.getElementById('page-main-heading');
        if (heading) {
            heading.focus({ preventScroll: true });
        }
    }, [currentPage]);


    const renderPage = () => {
        if (userRole === 'admin') {
            switch (currentPage) {
                case 'admin_dashboard': return <AdminDashboard />;
                case 'admin_users': return <AdminManageUsers />;
                case 'admin_modules': return <AdminManageModules />;
                case 'admin_quizzes': return <AdminManageQuizzes />;
                case 'admin_achievements': return <AdminManageAchievements />;
                case 'admin_stats': return <AdminStats />;
                case 'admin_tests': return <AdminTests />;
                // Use generic creator for teacher, but exclusive for admin
                case 'teacher_create_module': return <ModuleCreator />; // Not used by admin anymore
                case 'admin_create_module': return <AdminCreateModule />;
                case 'admin_create_quiz': return <AdminCreateQuiz />;
                case 'admin_create_achievement': return <CreateAchievement />;
                case 'profile': return <Profile />;
                default:
                    setCurrentPage('admin_dashboard');
                    return <AdminDashboard />;
            }
        }

        if (userRole === 'professor') {
            switch (currentPage) {
                case 'teacher_main_dashboard':
                    return <TeacherMainDashboard />;
                case 'teacher_dashboard':
                    return <TeacherDashboard />;
                case 'teacher_pending_activities':
                    return <PendingActivities />;
                case 'modules':
                    return <Modules />;
                case 'teacher_create_module':
                    return <ModuleCreator />;
                case 'teacher_create_activity':
                    return <CreateActivity />;
                case 'teacher_statistics':
                     return <TeacherStatistics />;
                case 'teacher_school_records':
                    return <SchoolRecords />;
                case 'class_view':
                    return <ClassView />;
                case 'profile':
                    return <Profile />;
                case 'notifications':
                    return <NotificationsPage />;
                case 'module_view':
                    if (activeModule) {
                        return <ModuleViewPage />;
                    }
                    // Fallback if module view is active but no module is selected
                    setCurrentPage('modules');
                    return <Modules />;
                default:
                     setCurrentPage('teacher_main_dashboard');
                     return <TeacherMainDashboard />;
            }
        }
        
        // Student View
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard />;
            case 'modules':
                return <Modules />;
            case 'quizzes':
                return <Quizzes />;
            case 'activities':
                return <Activities />;
            case 'achievements':
                return <Achievements />;
            case 'join_class':
                return <JoinClass />;
            case 'profile':
                return <Profile />;
            case 'notifications':
                return <NotificationsPage />;
            case 'boletim':
                return <Boletim />;
            case 'module_view':
                if (activeModule) {
                    return <ModuleViewPage />;
                }
                // Fallback if module view is active but no module is selected
                setCurrentPage('modules');
                return <Modules />;
            default:
                return <Dashboard />;
        }
    };
    
    const pageTitle = currentPage === 'module_view' ? activeModule?.title ?? 'Módulo' 
                    : currentPage === 'class_view' ? activeClass?.name ?? 'Turma'
                    : currentPage === 'teacher_create_module' ? (editingModule ? 'Editar Módulo' : 'Criar Módulo')
                    : currentPage === 'admin_create_module' ? (editingModule ? 'Editar Módulo (Admin)' : 'Criar Módulo (Admin)')
                    : currentPage === 'teacher_create_activity' ? 'Criar Atividade'
                    : currentPage === 'admin_create_quiz' ? (editingQuiz ? 'Editar Quiz (Admin)' : 'Criar Quiz (Admin)')
                    : currentPage === 'admin_create_achievement' ? (editingAchievement ? 'Editar Conquista' : 'Criar Conquista')
                    : currentPage === 'teacher_pending_activities' ? 'Pendências de Correção'
                    : PAGE_TITLES[currentPage as Exclude<Page, 'module_view' | 'class_view' | 'teacher_create_module' | 'teacher_create_activity' | 'admin_create_quiz' | 'admin_create_achievement' | 'teacher_pending_activities' | 'admin_create_module'>];

    // Dynamic Title Effect
    useEffect(() => {
        document.title = `${pageTitle} - História Acessível`;
    }, [pageTitle]);

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 hc-bg-override">
            {/* Skip to Main Content Link for Accessibility */}
            <a 
                href="#main-content" 
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-indigo-600 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
                Pular para o conteúdo principal
            </a>

            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <button
                    onClick={toggleMobileMenu}
                    className="lg:hidden fixed top-3 left-3 z-40 p-2 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm text-slate-600 dark:text-slate-300 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 hc-bg-override hc-button-override"
                    aria-label="Abrir menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <Header title={pageTitle} isScrolled={isScrolled} />
                <main id="main-content" ref={mainContentRef} className="flex-1 overflow-y-auto py-6 sm:py-8 lg:py-10 px-3 sm:px-4 lg:px-6 relative" tabIndex={-1}>
                    <Suspense fallback={<LoadingSpinner />}>
                        {renderPage()}
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

const AppContent = () => {
    const { authState, user, userRole, createUserProfile, authError } = useAuth();
    const [onboardingStep, setOnboardingStep] = useState<'role' | 'year'>('role');
    const [selectedRoleForOnboarding, setSelectedRoleForOnboarding] = useState<Role | null>(null);
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

    // This shows the loading spinner while the initial session is being checked.
    if (authState === 'loading') {
        return <LoadingSpinner />;
    }
    
    // This shows the login page if not authenticated, passing any initial auth error.
    if (authState === 'unauthenticated') {
        return <LoginPage initialError={authError} />;
    }
    
    // If authenticated but no profile/role exists, this is a new user. Start onboarding.
    if (user && !user.role) {
        const handleProfileCreationError = (error: any) => {
            const detailedMessage = `Erro do Firebase: ${error.message}.`;
            let likelyCause = `Causa provável: As Regras de Segurança (Security Rules) do seu Firestore estão impedindo a criação de novos perfis.`;
            if (error.code === 'permission-denied') {
                likelyCause = `Causa provável: Permissão negada. As Regras de Segurança (Security Rules) do seu Firestore não permitem que um novo usuário crie seu próprio perfil.`;
            }
            const solution = `Solução: Vá para o console do Firebase -> Firestore Database -> Aba "Regras" e garanta que a regra para a coleção "users" permita a criação de documentos por usuários autenticados, por exemplo:\n\nmatch /users/{userId} {\n  allow create: if request.auth != null && request.auth.uid == userId;\n  allow read, update: if request.auth != null && request.auth.uid == userId;\n}`;
            setOnboardingError(`${detailedMessage}\n\n${likelyCause}\n\n${solution}`);
        };

        switch (onboardingStep) {
            case 'role':
                return <RoleSelectionPage error={onboardingError} onRoleSelected={async (role) => {
                    setOnboardingError(null);
                    try {
                        if (role === 'aluno') {
                            setSelectedRoleForOnboarding('aluno');
                            setOnboardingStep('year');
                        } else {
                            await createUserProfile(role, undefined);
                        }
                    } catch (error) {
                        handleProfileCreationError(error);
                    }
                }} />;
            case 'year':
                return <YearSelectionPage error={onboardingError} onYearSelected={async (year) => {
                    setOnboardingError(null);
                    if (selectedRoleForOnboarding) {
                        try {
                            await createUserProfile(selectedRoleForOnboarding, year);
                        } catch (error) {
                            handleProfileCreationError(error);
                        }
                    }
                }} />;
            default:
                return <RoleSelectionPage error={onboardingError} onRoleSelected={async (role) => {
                    setOnboardingError(null);
                    try {
                       await createUserProfile(role, undefined);
                    } catch(error) {
                        handleProfileCreationError(error);
                    }
                }} />;
        }
    }

    // If fully authenticated with a profile, show the main app layout
    if (user && user.role) {
         return (
            <NavigationProvider children={
                userRole === 'aluno' ? (
                    <StudentDataProvider children={<MainLayout />} />
                ) : userRole === 'professor' ? (
                    <TeacherDataProvider children={<MainLayout />} />
                ) : (
                    <AdminDataProvider children={<MainLayout />} />
                )
            } />
        );
    }
    
    // Fallback loading state - should ideally not be reached if logic is correct
    return <LoadingSpinner />;
};


const App = () => {
    return (
        <SettingsProvider children={
            <AuthProvider children={
                <ToastProvider children={
                    <AppContent />
                } />
            } />
        } />
    );
};

export default App;
