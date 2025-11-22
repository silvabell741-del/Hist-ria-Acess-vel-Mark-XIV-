
import React, { useState, useMemo } from 'react';
import { useTeacherData, PendingActivity } from '../contexts/TeacherDataContext';
import { Card } from './common/Card';
import { SubmissionsModal } from './common/SubmissionsModal';
import type { Activity } from '../types';
import { ICONS } from '../constants/index';
import { db } from './firebaseClient';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

const PendingActivityItem: React.FC<{ item: PendingActivity; onView: () => void }> = ({ item, onView }) => (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors duration-200 cursor-pointer" onClick={onView}>
        <div>
            <p className="font-semibold text-indigo-600 dark:text-indigo-400 hc-link-override">{item.title}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">{item.className}</p>
        </div>
        <div className="text-center flex items-center space-x-4">
            <div className="text-right">
                <p className="font-bold text-xl text-yellow-600 dark:text-yellow-400">{item.pendingCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 hc-text-secondary">Pendente(s)</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
    </div>
);

const PendingActivities: React.FC = () => {
    const { teacherClasses, allPendingActivities, handleGradeActivity } = useTeacherData();
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

    // Use the centralized `allPendingActivities` list and filter it locally.
    const pendingActivities = useMemo((): PendingActivity[] => {
        if (selectedClassId === 'all') {
            return allPendingActivities;
        }
        return allPendingActivities.filter(activity => activity.classId === selectedClassId);
    }, [allPendingActivities, selectedClassId]);

    const handleOpenResponses = async (pendingItem: PendingActivity) => {
        setIsLoadingSubmissions(true);
        try {
            // 1. Fetch full Activity Document
            const activityRef = doc(db, "activities", pendingItem.id);
            const activitySnap = await getDoc(activityRef);
            
            if (!activitySnap.exists()) {
                alert("Atividade não encontrada.");
                return;
            }

            const activityData = activitySnap.data();
            let className = pendingItem.className;
            
            // 2. Validate Class Name (Fetch if missing/unknown)
            if (!className || className === "Turma desconhecida") {
                 if (activityData.classId) {
                     const classSnap = await getDoc(doc(db, "classes", activityData.classId));
                     if (classSnap.exists()) {
                         className = classSnap.data().name;
                     }
                 }
            }

            // 3. Fetch Submissions Subcollection (Source of truth)
            const subRef = collection(db, "activities", pendingItem.id, "submissions");
            const q = query(subRef, orderBy("submissionDate", "asc")); // Oldest first for grading queue
            const subSnap = await getDocs(q);

            const submissions = subSnap.docs.map(d => {
                const data = d.data();
                // Safe date parsing
                let subDateStr = '';
                if (data.submissionDate?.toDate) {
                    subDateStr = data.submissionDate.toDate().toISOString();
                } else if (typeof data.submissionDate === 'string') {
                    subDateStr = data.submissionDate;
                }

                return {
                    studentId: d.data().studentId || d.id,
                    ...data,
                    submissionDate: subDateStr,
                    gradedAt: data.gradedAt?.toDate ? data.gradedAt.toDate().toISOString() : data.gradedAt
                };
            });

            // 4. Construct full object for Modal
            const fullActivity: any = {
                id: pendingItem.id,
                ...activityData,
                className: className,
                submissions: submissions
            };

            setSelectedActivity(fullActivity);

        } catch (error) {
            console.error("Error fetching submissions:", error);
            alert("Erro ao carregar submissões.");
        } finally {
            setIsLoadingSubmissions(false);
        }
    };

    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Pendências de Correção</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">Atividades enviadas por alunos que aguardam sua avaliação.</p>
            </div>

            <Card className="!p-4">
                <div className="flex justify-end items-center">
                    <label htmlFor="class-filter" className="text-sm font-medium text-slate-600 dark:text-slate-300 mr-2">Filtrar por turma:</label>
                    <select
                        id="class-filter"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                        <option value="all">Todas as Turmas</option>
                        {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </Card>

            <Card className="!p-0">
                <div className="divide-y divide-slate-200 dark:divide-slate-700 hc-border-override">
                    {isLoadingSubmissions && <div className="p-4 text-center text-indigo-600">Carregando submissões...</div>}
                    {!isLoadingSubmissions && pendingActivities.length > 0 ? (
                        pendingActivities.map(item => (
                            <PendingActivityItem 
                                key={`${item.id}-${item.classId}`} 
                                item={item} 
                                onView={() => handleOpenResponses(item)} 
                            />
                        ))
                    ) : !isLoadingSubmissions && (
                         <div className="text-center py-20">
                            <div className="inline-block bg-green-100 dark:bg-green-500/20 rounded-full p-5">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Tudo em dia!</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm hc-text-secondary">Nenhuma atividade pendente de correção.</p>
                        </div>
                    )}
                </div>
            </Card>

            {selectedActivity && (
                <SubmissionsModal
                    isOpen={!!selectedActivity}
                    onClose={() => setSelectedActivity(null)}
                    activity={selectedActivity}
                    onGradeActivity={handleGradeActivity}
                />
            )}
        </div>
    );
};

export default PendingActivities;
