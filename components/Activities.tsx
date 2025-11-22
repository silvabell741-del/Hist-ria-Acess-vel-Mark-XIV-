
import React, { useState, useMemo } from 'react';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { QuizView } from './QuizView';
import { useStudentData } from '../contexts/StudentDataContext';
import { useAuth } from '../contexts/AuthContext';
import type { Activity, ActivitySubmission } from '../types';
import { SpinnerIcon } from '../constants/index';
import { cleanActivity } from '../utils/cleanActivity';

const ActivityDetailsModal: React.FC<{ activity: Activity; onClose: () => void }> = ({ activity, onClose }) => {
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

    // A dummy handler for now, as submitting activities is not yet implemented.
    const handleDummySubmit = async (quizId: string, quizTitle: string, score: number, total: number): Promise<number> => {
        console.log(`Activity "${activity.title}" submitted with score ${score}/${total}.`);
        // In a real app, this would call an API to save the submission.
        return 0; // Return 0 XP for activity quizzes for now.
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={activity.title}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span><span className="font-semibold">Turma:</span> {activity.className || 'Turma desconhecida'}</span>
                    <span><span className="font-semibold">Pontos:</span> {activity.points}</span>
                    {activity.dueDate && <span><span className="font-semibold">Prazo:</span> {new Date(activity.dueDate).toLocaleDateString('pt-BR')}</span>}
                </div>
                <hr className="dark:border-slate-700" />
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{activity.description}</p>
                
                {activity.imageUrl && (
                    <div className="py-4">
                        <img src={activity.imageUrl} alt={`Imagem para a atividade ${activity.title}`} className="rounded-lg shadow-md max-h-80 mx-auto" loading="lazy" />
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

// Helper function to check if a date is recent (within 3 days)
const isRecent = (dateInput?: string | any) => {
    if (!dateInput) return false;
    let date: Date;
    // Handle Firestore Timestamp if it passes through
    if (dateInput?.toDate) {
        date = dateInput.toDate();
    } else {
        date = new Date(dateInput);
    }
    
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
};

const ActivityCard: React.FC<{ activity: Activity; onClick: () => void }> = ({ activity, onClick }) => {
    const { user } = useAuth();
    const studentSubmission = activity.submissions?.find(s => s.studentId === user?.id);
    let statusText: string | null = null;
    let statusColor: string = '';

    if (studentSubmission) {
        statusText = studentSubmission.status;
        statusColor = statusText === 'Corrigido' 
            ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300';
    }

    const materiaColorMap: { [key: string]: string } = {
        'História': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
        'Geografia': 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
        'Ciências': 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
        'História Sergipana': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    };
    const materiaColor = activity.materia ? materiaColorMap[activity.materia] || 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700';

    // Badges Logic
    const isNew = !studentSubmission && isRecent(activity.createdAt);
    const isRecentlyGraded = studentSubmission?.status === 'Corrigido' && isRecent(studentSubmission.gradedAt);

    return (
        <Card className="flex flex-col h-full group dark:hover:bg-slate-700/50 cursor-pointer relative overflow-hidden" >
            <button onClick={onClick} className="text-left flex flex-col h-full w-full">
                {/* Badge "Nova" */}
                {isNew && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm z-10">
                        NOVA
                    </div>
                )}
                {/* Badge "Corrigida" */}
                {isRecentlyGraded && (
                    <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm z-10">
                        NOTA DISPONÍVEL
                    </div>
                )}

                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors hc-text-primary pr-4 line-clamp-2">{activity.title}</h3>
                        <div className="flex flex-col items-end flex-shrink-0 ml-2 space-y-2 mt-6"> 
                             {/* Spacing added to top to account for badges if present, though badge is absolute */}
                             {statusText && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                                    {statusText}
                                </span>
                            )}
                        </div>
                    </div>
                     <div className="flex items-center flex-wrap gap-2 mt-3 text-xs font-medium">
                        {activity.unidade && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{activity.unidade}</span>}
                        {activity.materia && <span className={`px-2 py-1 rounded ${materiaColor}`}>{activity.materia}</span>}
                        <span className={`px-2 py-1 rounded ${activity.type === 'Múltipla Escolha' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300'}`}>
                            {activity.type}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex-grow hc-text-secondary line-clamp-2">{activity.description}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{activity.className || 'Turma desconhecida'}</span>
                    <div className="space-x-4">
                        <span>{activity.points} pts</span>
                        {activity.dueDate && <span>Prazo: {new Date(activity.dueDate).toLocaleDateString('pt-BR')}</span>}
                    </div>
                </div>
            </button>
        </Card>
    );
};


const Activities: React.FC = () => {
    const { activities, studentClasses, hasMoreActivities, isLoadingMoreActivities, loadMoreActivities } = useStudentData();
    const { user } = useAuth();
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [selectedUnidade, setSelectedUnidade] = useState('all');
    const [selectedMateria, setSelectedMateria] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    const safeStudentClasses = studentClasses || [];

    const { unidadeOptions, materiaOptions } = useMemo(() => {
        const unidades = new Set<string>();
        const materias = new Set<string>();
        activities.forEach(a => {
            if (a.unidade) unidades.add(a.unidade);
            if (a.materia) materias.add(a.materia);
        });
        return {
            unidadeOptions: Array.from(unidades).sort(),
            materiaOptions: Array.from(materias).sort()
        };
    }, [activities]);

    const filteredActivities = useMemo(() => {
        return activities.filter(activity => {
            const classMatch = selectedClassId === 'all' || activity.classId === selectedClassId;
            const unidadeMatch = selectedUnidade === 'all' || activity.unidade === selectedUnidade;
            const materiaMatch = selectedMateria === 'all' || activity.materia === selectedMateria;
            
            const studentSubmission = activity.submissions?.find(s => s.studentId === user?.id);
            let status: string;
            if (!studentSubmission) {
                status = 'a_fazer';
            } else if (studentSubmission.status === 'Aguardando correção') {
                status = 'pendente';
            } else { // Corrigido
                status = 'corrigida';
            }
            
            const statusMatch = selectedStatus === 'all' || selectedStatus === status;

            return classMatch && unidadeMatch && materiaMatch && statusMatch;
        });
    }, [activities, selectedClassId, selectedUnidade, selectedMateria, selectedStatus, user]);
    
    const filterSelectClasses = "w-full md:w-auto p-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200";

    return (
        <div className="space-y-6">
            <p className="text-slate-500 dark:text-slate-400 hc-text-secondary">Complete suas atividades e envie suas respostas</p>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 flex flex-col md:flex-row flex-wrap items-center gap-4 hc-bg-override hc-border-override">
                <div className="w-full md:w-auto">
                    <label htmlFor="class-filter" className="sr-only">Filtrar por turma</label>
                    <select id="class-filter" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className={filterSelectClasses}>
                        <option value="all">Todas as turmas</option>
                        {safeStudentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-auto">
                    <label htmlFor="materia-filter" className="sr-only">Filtrar por matéria</label>
                    <select id="materia-filter" value={selectedMateria} onChange={e => setSelectedMateria(e.target.value)} className={filterSelectClasses}>
                        <option value="all">Todas as matérias</option>
                        {materiaOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-auto">
                    <label htmlFor="unidade-filter" className="sr-only">Filtrar por unidade</label>
                    <select id="unidade-filter" value={selectedUnidade} onChange={e => setSelectedUnidade(e.target.value)} className={filterSelectClasses}>
                        <option value="all">Todas as unidades</option>
                        {unidadeOptions.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-auto">
                    <label htmlFor="status-filter" className="sr-only">Filtrar por status</label>
                    <select id="status-filter" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className={filterSelectClasses}>
                        <option value="all">Todos os Status</option>
                        <option value="a_fazer">A fazer</option>
                        <option value="pendente">Pendente</option>
                        <option value="corrigida">Corrigida</option>
                    </select>
                </div>
            </div>

            {filteredActivities.length > 0 ? (
                <>
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredActivities.map(activity => (
                            <li key={activity.id}>
                                <ActivityCard 
                                    activity={activity} 
                                    onClick={() => setSelectedActivity(cleanActivity(activity))} 
                                />
                            </li>
                        ))}
                    </ul>
                    
                    {hasMoreActivities && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={loadMoreActivities}
                                disabled={isLoadingMoreActivities}
                                className="px-6 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-full hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
                            >
                                {isLoadingMoreActivities ? (
                                    <span className="flex items-center">
                                        <SpinnerIcon className="h-4 w-4 mr-2" /> Carregando...
                                    </span>
                                ) : (
                                    "Carregar atividades antigas"
                                )}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <Card className="text-center py-20">
                    <div className="flex justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Nenhuma atividade encontrada</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 hc-text-secondary">Tente ajustar os filtros ou aguarde seu professor postar novas atividades.</p>
                </Card>
            )}

            {selectedActivity && (
                <ActivityDetailsModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
            )}
        </div>
    );
};

export default Activities;