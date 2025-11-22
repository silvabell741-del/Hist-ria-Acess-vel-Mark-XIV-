
import React, { createContext, useState, useCallback, useContext, ReactNode, useEffect } from 'react';
import type { Module, Quiz, Page, Achievement, TeacherClass } from '../types';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';

interface NavigationState {
    currentPage: Page;
    activeModule: Module | null;
    activeClass: TeacherClass | null;
    editingModule: Module | null;
    editingQuiz: Quiz | null;
    editingAchievement: Achievement | null;
    isMobileMenuOpen: boolean;
}

interface NavigationActions {
    setCurrentPage: (page: Page) => void;
    startModule: (module: Module) => void;
    exitModule: () => void;
    openClass: (classData: TeacherClass) => void;
    exitClass: () => void;
    startEditingModule: (module: Module) => void;
    exitEditingModule: () => void;
    startEditingQuiz: (quiz: Quiz) => void;
    exitEditingQuiz: () => void;
    startEditingAchievement: (achievement: Achievement) => void;
    exitEditingAchievement: () => void;
    toggleMobileMenu: () => void;
    closeMobileMenu: () => void;
}

// Separate state and actions for better context usage and performance
const NavigationStateContext = createContext<NavigationState | undefined>(undefined);
const NavigationActionsContext = createContext<NavigationActions | undefined>(undefined);

// FIX: Refactored the provider component to a standard function declaration to resolve errors where the 'children' prop was not being correctly recognized by the type system.
export function NavigationProvider({ children }: { children?: ReactNode }) {
    const { authState, userRole } = useAuth();
    const location = useLocation();

    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [activeModule, setActiveModule] = useState<Module | null>(null);
    const [activeClass, setActiveClass] = useState<TeacherClass | null>(null);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (authState === 'authenticated') {
            if (userRole === 'admin') {
                setCurrentPage('admin_dashboard');
            } else if (userRole === 'professor') {
                setCurrentPage('teacher_main_dashboard');
            } else {
                setCurrentPage('dashboard');
            }
        }
    }, [authState, userRole]);


    const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);
    const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

    // Effect to close the mobile menu whenever the route or page changes
    useEffect(() => {
        closeMobileMenu();
    }, [location.pathname, currentPage, closeMobileMenu]);

    // Effect to reset non-URL state on authentication changes (e.g., logout)
    useEffect(() => {
        if (authState !== 'authenticated') {
            setActiveModule(null);
            setActiveClass(null);
            setEditingModule(null);
            setEditingQuiz(null);
            setEditingAchievement(null);
        }
    }, [authState]);
    
    const startModule = useCallback((module: Module) => {
        setActiveModule(module);
        setCurrentPage('module_view');
    }, []);

    const exitModule = useCallback(() => {
        setActiveModule(null);
        setCurrentPage('modules');
    }, []);

    const openClass = useCallback((classData: TeacherClass) => {
        setActiveClass(classData);
        setCurrentPage('class_view');
    }, []);

    const exitClass = useCallback(() => {
        setActiveClass(null);
        setCurrentPage('teacher_dashboard');
    }, []);

    const startEditingModule = useCallback((module: Module) => {
        setEditingModule(module);
        // Redirect based on role
        if (userRole === 'admin') {
            setCurrentPage('admin_create_module');
        } else {
            setCurrentPage('teacher_create_module');
        }
    }, [userRole]);

    const exitEditingModule = useCallback(() => {
        setEditingModule(null);
        setCurrentPage(userRole === 'admin' ? 'admin_modules' : 'teacher_dashboard');
    }, [userRole]);

    const startEditingQuiz = useCallback((quiz: Quiz) => {
        setEditingQuiz(quiz);
        // Redirect based on role (only admins currently edit quizzes here, but good practice)
        if (userRole === 'admin') {
            setCurrentPage('admin_create_quiz');
        } else {
             // Fallback, though teachers usually create via activities
             setCurrentPage('admin_create_quiz'); 
        }
    }, [userRole]);

    const exitEditingQuiz = useCallback(() => {
        setEditingQuiz(null);
        setCurrentPage('admin_quizzes');
    }, []);
    
    const startEditingAchievement = useCallback((achievement: Achievement) => {
        setEditingAchievement(achievement);
        setCurrentPage('admin_create_achievement');
    }, []);

    const exitEditingAchievement = useCallback(() => {
        setEditingAchievement(null);
        setCurrentPage('admin_achievements');
    }, []);

    const stateValue: NavigationState = { currentPage, activeModule, activeClass, editingModule, editingQuiz, editingAchievement, isMobileMenuOpen };
    const actionsValue: NavigationActions = { 
        setCurrentPage,
        startModule, 
        exitModule, 
        openClass,
        exitClass,
        startEditingModule, 
        exitEditingModule, 
        startEditingQuiz, 
        exitEditingQuiz, 
        startEditingAchievement,
        exitEditingAchievement,
        toggleMobileMenu, 
        closeMobileMenu 
    };

    return (
        <NavigationStateContext.Provider value={stateValue}>
            <NavigationActionsContext.Provider value={actionsValue}>
                {children}
            </NavigationActionsContext.Provider>
        </NavigationStateContext.Provider>
    );
};

// Custom hooks to consume the separated contexts. These are now internal to the module.
const useNavigationState = (): NavigationState => {
    const context = useContext(NavigationStateContext);
    if (context === undefined) {
        throw new Error('useNavigationState must be used within a NavigationProvider');
    }
    return context;
};

const useNavigationActions = (): NavigationActions => {
    const context = useContext(NavigationActionsContext);
    if (context === undefined) {
        throw new Error('useNavigationActions must be used within a NavigationProvider');
    }
    return context;
};

// This is the single hook exported for components to use, resolving potential circular dependencies.
export const useNavigation = (): NavigationState & NavigationActions => {
    const state = useNavigationState();
    const actions = useNavigationActions();
    return { ...state, ...actions };
};