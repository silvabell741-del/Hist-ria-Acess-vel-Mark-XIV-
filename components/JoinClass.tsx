
import React, { useState, useMemo } from 'react';
import type { TeacherClass, ClassNotice, Activity, ActivitySubmission, Module } from '../types';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { QuizView } from './QuizView';
import { useStudentData } from '../contexts/StudentDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { ICONS, SpinnerIcon } from '../constants/index';
import { cleanActivity } from '../utils/cleanActivity';

// --- Local Components for Class Details ---

const NoticeListItem: React.FC<{ notice: ClassNotice }> = ({ notice }) => (
    <div className="flex items-start space-x-4 p-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0 hc-border-override">
        <div className="flex-shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 12.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
        </div>
        <div>
            <p className="text-sm text-slate-700 dark:text-slate-200 hc-text-primary">{notice.text}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 hc-text-secondary">
                Postado por {notice.author} - {new Date(notice.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
        </div>
    </div>
);

const ActivityListItem: React.FC<{ activity: Activity, onClick: () => void }> = ({ activity, onClick }) => (
    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
        <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{activity.title}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                {activity.unidade && `${activity.unidade} • `}
                {activity.materia && <span className="font-medium text-indigo-600 dark:text-indigo-400">{activity.materia} • </span>}
                {activity.points} pts • Prazo: {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString('pt-BR') : 'N/D'}
            </p>
        </div>
        <button onClick={onClick} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 hc-button-override">
            Abrir
        </button>
    </div>
);

const ModuleListItem: React.FC<{ module: Module, onStart: () => void }> = ({ module, onStart }) => {
    const buttonText = module.progress === 100 ? 'Revisar' : (module.progress && module.progress > 0 ? 'Continuar' : 'Iniciar');

    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden flex items-center group transition-shadow hover:shadow-md">
            <img 
                src={module.coverImageUrl || 'https://images.unsplash.com/photo-1519781542343-dc12c611d9e5?q=80&w=800&auto=format&fit=crop'} 
                alt={`Capa do módulo ${module.title}`} 
                className="w-32 h-24 object-cover flex-shrink-0"
                loading="lazy"
            />
            <div className="p-4 flex-grow">
                <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{module.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {module.series} • {module.materia} {module.duration && `• ${module.duration}`}
                </p>
            </div>
            <button 
                onClick={onStart} 
                className="mr-4 px-4 py-2 text-sm font-semibold text-green-600 bg-green-100 rounded-lg hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30 hc-button-override whitespace-nowrap"
            >
                {buttonText}
            </button>
        </div>
    );
};

const ClassAccordion: React.FC<{
    classData: TeacherClass;
    classActivities: Activity[];
    classModules: Module[];
    isExpanded: boolean;
    onToggleExpand: () => void;
    onActivityClick: (activity: Activity) => void;
    onLoadHistory: (classId: string) => Promise<void>;
}> = ({ classData, classActivities, classModules, isExpanded, onToggleExpand, onActivityClick, onLoadHistory }) => {
    type Tab = 'notices' | 'activities' | 'modules';
    const [activeTab, setActiveTab] = useState<Tab>('notices');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('Todas');
    
    const { startModule } = useNavigation();

    // UX FASE 3: Usar contadores desnormalizados (metadados) se disponíveis, senão usar o tamanho local.
    const totalActivityCount = classData.activityCount ?? classActivities.length;
    const totalModuleCount = classData.moduleCount ?? classModules.length;
    const totalNoticeCount = classData.noticeCount ?? classData.notices?.length ?? 0;

    const tabs: { id: Tab; label: string; count: number, icon: React.ReactNode }[] = [
        { id: 'notices', label: 'Avisos', count: totalNoticeCount, icon: ICONS.notifications },
        { id: 'activities', label: 'Atividades', count: totalActivityCount, icon: ICONS.activities },
        { id: 'modules', label: 'Módulos', count: totalModuleCount, icon: ICONS.modules },
    ];

    const handleLoadHistory = async () => {
        if (isLoadingHistory) return;
        setIsLoadingHistory(true);
        await onLoadHistory(classData.id);
        setIsLoadingHistory(false);
    };

    // FASE 4: Extração de Matérias e Filtragem
    const availableSubjects = useMemo(() => {
        const subjects = new Set<string>();
        
        // 1. Extrair das atividades existentes (fonte da verdade para o que tem conteúdo)
        classActivities.forEach(a => {
            if (a.materia) subjects.add(a.materia);
        });

        // 2. Adicionar matérias configuradas na turma (se existirem), mesmo sem atividades ainda
        if (classData.subjects) {
            Object.values(classData.subjects).forEach(s => subjects.add(s as string));
        }

        return Array.from(subjects).sort();
    }, [classActivities, classData.subjects]);

    const filteredActivities = useMemo(() => {
        if (selectedSubject === 'Todas') return classActivities;
        return classActivities.filter(a => a.materia === selectedSubject);
    }, [classActivities, selectedSubject]);

    return (
        <Card className="!p-0 overflow-hidden transition-all duration-300">
            <button 
                type="button"
                className="w-full text-left p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 flex justify-between items-center focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700/50 transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500" 
                onClick={onToggleExpand} 
                aria-expanded={isExpanded} 
                aria-controls={`class-content-${classData.id}`}
            >
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{classData.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">
                        <span>{classData.code}</span>
                    </div>
                </div>
                <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
            </button>

            {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 hc-border-override" id={`class-content-${classData.id}`}>
                    <div className="px-4 bg-slate-100/60 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700 hc-bg-override hc-border-override">
                        <div className="flex space-x-4 -mb-px overflow-x-auto" role="tablist" aria-label={`Conteúdo da turma ${classData.name}`}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    id={`tab-${classData.id}-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    role="tab"
                                    aria-selected={activeTab === tab.id}
                                    aria-controls={`tabpanel-${classData.id}-${tab.id}`}
                                    className={`flex items-center space-x-2 py-3 px-1 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                                            : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    } hc-link-override`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    <span className="text-xs bg-slate-200 dark:bg-slate-600 rounded-full px-2 py-0.5">{tab.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div role="tabpanel" id={`tabpanel-${classData.id}-${activeTab}`} aria-labelledby={`tab-${classData.id}-${activeTab}`} className="p-4">
                        {activeTab === 'notices' && (
                            (classData.notices?.length || 0) > 0 ? (
                                <ul className="-m-4"><li className="divide-y divide-slate-200 dark:divide-slate-700">{(classData.notices || []).map(notice => <NoticeListItem key={notice.id} notice={notice} />)}</li></ul>
                            ) : <p className="text-center text-sm text-slate-500 py-8">Nenhum aviso postado.</p>
                        )}
                        {activeTab === 'activities' && (
                            <>
                                {/* FASE 4: Filtros de Matéria */}
                                {availableSubjects.length > 0 && (
                                    <div className="mb-4 flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                                        <button
                                            onClick={() => setSelectedSubject('Todas')}
                                            className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                                                selectedSubject === 'Todas'
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            Todas
                                        </button>
                                        {availableSubjects.map(subject => (
                                            <button
                                                key={subject}
                                                onClick={() => setSelectedSubject(subject)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                                                    selectedSubject === subject
                                                        ? 'bg-indigo-600 text-white shadow-md'
                                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                {subject}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* UX FASE 3: Aviso visual se estiver mostrando apenas uma parte do histórico */}
                                {classActivities.length > 0 && totalActivityCount > classActivities.length && (
                                    <div className="flex justify-end mb-3">
                                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                            Mostrando {classActivities.length} de {totalActivityCount} recentes
                                        </span>
                                    </div>
                                )}

                                {filteredActivities.length > 0 ? (
                                    <ul className="space-y-3">{filteredActivities.map(activity => <li key={activity.id}><ActivityListItem activity={activity} onClick={() => onActivityClick(activity)} /></li>)}</ul>
                                ) : (
                                    <p className="text-center text-sm text-slate-500 py-8">
                                        {selectedSubject === 'Todas' ? 'Nenhuma atividade disponível (recente).' : `Nenhuma atividade encontrada para ${selectedSubject}.`}
                                    </p>
                                )}
                                
                                {/* Se houver mais atividades no servidor do que as carregadas localmente */}
                                {totalActivityCount > classActivities.length && (
                                    <div className="mt-4 text-center border-t border-slate-100 dark:border-slate-700 pt-3">
                                        <button 
                                            onClick={handleLoadHistory}
                                            disabled={isLoadingHistory}
                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors disabled:opacity-50 flex items-center justify-center w-full"
                                        >
                                            {isLoadingHistory ? (
                                                <>
                                                    <SpinnerIcon className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                                                    Carregando histórico...
                                                </>
                                            ) : 'Ver histórico completo'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        {activeTab === 'modules' && (
                            <>
                                {classModules.length > 0 ? (
                                    <ul className="space-y-3">{classModules.map(module => <li key={module.id}><ModuleListItem module={module} onStart={() => startModule(module)} /></li>)}</ul>
                                ) : <p className="text-center text-sm text-slate-500 py-8">Nenhum módulo para esta turma.</p>}
                            </>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
};

const ActivityDetailsModal: React.FC<{ activity: Activity & { className: string }; onClose: () => void }> = ({ activity, onClose }) => {
    const { handleActivitySubmit } = useStudentData();
    const { user } = useAuth();
    const [submissionText, setSubmissionText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const studentSubmission = useMemo(() => {
        if (!user?.id) return undefined;
        return activity.submissions?.find(s => s.studentId === user.id);
    }, [activity.submissions, user]);
    
    const handleSubmit = async () => {
        if (!submissionText.trim() || isSubmitting) return;
        setIsSubmitting(true);
        await handleActivitySubmit(activity.id, submissionText);
        setIsSubmitting(false);
        onClose();
    };

    const handleDummySubmit = async (quizId: string, quizTitle: string, score: number, total: number): Promise<number> => {
        console.log(`Activity "${activity.title}" submitted with score ${score}/${total}.`);
        return 0;
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={activity.title}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span><span className="font-semibold">Turma:</span> {activity.className}</span>
                    <span><span className="font-semibold">Pontos:</span> {activity.points}</span>
                    {activity.dueDate && <span><span className="font-semibold">Prazo:</span> {new Date(activity.dueDate).toLocaleDateString('pt-BR')}</span>}
                </div>
                <hr className="dark:border-slate-700" />
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{activity.description}</p>
                
                {activity.imageUrl && (
                    <div className="py-4">
                        <img src={activity.imageUrl} alt={`Imagem para a atividade ${activity.title}`} className="rounded-lg shadow-md max-h-80 mx-auto" />
                    </div>
                )}

                {activity.type === 'Tarefa (Texto)' && (
                    <div className="pt-4">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Sua Resposta</h3>
                        {studentSubmission ? (
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border dark:border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">Sua resposta enviada:</p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${studentSubmission.status === 'Corrigido' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                                        {studentSubmission.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600 whitespace-pre-wrap">{studentSubmission.content}</p>
                                
                                {studentSubmission.status === 'Corrigido' && (
                                     <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">Feedback do Professor</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nota: <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{studentSubmission.grade} / {activity.points}</span></p>
                                        {studentSubmission.feedback && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/30 p-3 rounded">{studentSubmission.feedback}</p>}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <textarea
                                    rows={8}
                                    placeholder="Escreva sua resposta aqui..."
                                    value={submissionText}
                                    onChange={(e) => setSubmissionText(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={!submissionText.trim() || isSubmitting}
                                    className="mt-4 w-full px-4 py-2 bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600"
                                >
                                    {isSubmitting ? <SpinnerIcon className="h-5 w-5 mr-2" /> : null}
                                    {isSubmitting ? 'Enviando...' : 'Enviar Resposta'}
                                </button>
                            </>
                        )}
                    </div>
                )}
                
                {activity.type === 'Múltipla Escolha' && activity.questions && (
                     <div className="pt-4">
                        <QuizView
                            quiz={{
                                id: activity.id,
                                title: activity.title,
                                description: activity.description,
                                questions: activity.questions,
                                visibility: 'specific_class',
                                classId: activity.classId,
                            }}
                            onQuizComplete={handleDummySubmit}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

const JoinClass: React.FC = () => {
    const { studentClasses, handleJoinClass, handleLeaveClass, activities, modules, fetchClassSpecificHistory } = useStudentData();
    const [classCode, setClassCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [selectedActivity, setSelectedActivity] = useState<(Activity & { className: string }) | null>(null);
    
    const safeStudentClasses = studentClasses || [];

    const onJoin = async () => {
        if (!classCode.trim() || isJoining) return;
        setIsJoining(true);
        const success = await handleJoinClass(classCode.trim().toUpperCase());
        setIsJoining(false);
        if (success) {
            setClassCode('');
        }
    };

    const onLeave = (classId: string) => {
        if (window.confirm("Tem certeza que deseja sair desta turma? Você perderá o acesso ao conteúdo exclusivo.")) {
            handleLeaveClass(classId);
        }
    };
    
    const handleActivityClick = (activity: Activity) => {
        const className = safeStudentClasses.find(c => c.id === activity.classId)?.name || 'Turma desconhecida';
        // Limpa o objeto antes de definir no estado
        const cleaned = cleanActivity({ ...activity, className });
        setSelectedActivity(cleaned);
    };

    return (
        <div className="space-y-8">
            <p className="text-slate-500 dark:text-slate-400 -mt-6 hc-text-secondary">Use o código fornecido pelo seu professor para entrar em uma turma e acessar o conteúdo.</p>

            <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-blue-900/30">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-blue-500 text-white rounded-full p-4 mb-4">
                        {ICONS.join_class}
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 hc-text-primary">Entrar em Nova Turma</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 hc-text-secondary">Código da Turma</p>
                    <div className="flex w-full max-w-sm">
                        <input 
                            type="text" 
                            value={classCode}
                            onChange={(e) => setClassCode(e.target.value)}
                            placeholder="Digite o código (ex: ABC123XY)"
                            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                        <button 
                            onClick={onJoin}
                            disabled={isJoining}
                            className="w-28 px-6 py-2 bg-indigo-200 text-indigo-800 font-semibold rounded-r-lg hover:bg-indigo-300 transition dark:bg-indigo-500/40 dark:text-indigo-200 dark:hover:bg-indigo-500/60 hc-button-primary-override disabled:opacity-50 flex justify-center items-center"
                        >
                            {isJoining ? <SpinnerIcon /> : 'Entrar'}
                        </button>
                    </div>
                </div>
            </Card>

            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 hc-text-primary">Minhas Turmas ({safeStudentClasses.length})</h2>
                {safeStudentClasses.length > 0 ? (
                    <ul className="space-y-4">
                        {safeStudentClasses.map(cls => {
                             // FASE 1: FILTRAGEM DE DADOS GLOBAIS
                             // Aqui pegamos as atividades/módulos já carregados no contexto global
                             // e filtramos especificamente para esta turma.
                             const classActivities = activities.filter(a => a.classId === cls.id);
                             const classModules = modules.filter(m => m.classIds?.includes(cls.id));
                             return (
                                 <li key={cls.id}>
                                    <ClassAccordion
                                        classData={cls}
                                        classActivities={classActivities}
                                        classModules={classModules}
                                        isExpanded={expandedClassId === cls.id}
                                        onToggleExpand={() => setExpandedClassId(prev => prev === cls.id ? null : cls.id)}
                                        onActivityClick={handleActivityClick}
                                        onLoadHistory={fetchClassSpecificHistory}
                                    />
                                 </li>
                             );
                        })}
                    </ul>
                ) : (
                     <Card className="text-center py-12">
                         <p className="text-slate-500 dark:text-slate-400 hc-text-secondary">Você não está em nenhuma turma.</p>
                    </Card>
                )}
            </div>
            
            {selectedActivity && (
                <ActivityDetailsModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
            )}
        </div>
    );
};

export default JoinClass;
