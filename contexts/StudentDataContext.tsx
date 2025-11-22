
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { db } from '../components/firebaseClient';
import { 
    collection, query, where, onSnapshot, doc, updateDoc, 
    increment, getDoc, setDoc, serverTimestamp, arrayUnion, runTransaction, getDocs, orderBy, deleteDoc, writeBatch, limit, startAfter, QueryDocumentSnapshot, Timestamp 
} from 'firebase/firestore';
import type { Module, Quiz, Achievement, Activity, TeacherClass, Notification, GradeReport, UserStats, ClassGradeReport, Unidade } from '../types';
import { createNotification } from '../utils/createNotification';
import { fetchGlobalAchievements, fetchUserAchievementsDoc } from '../utils/achievements';

export interface StudentDataContextType {
    modules: Module[];
    quizzes: Quiz[];
    achievements: Achievement[];
    activities: Activity[];
    studentClasses: TeacherClass[];
    notifications: Notification[];
    gradeReport: GradeReport;
    userStats: UserStats;
    unreadNotificationCount: number;
    isLoading: boolean;
    hasMoreActivities: boolean;
    isLoadingMoreActivities: boolean;
    
    refreshData: (forceRefresh?: boolean) => Promise<void>;
    loadMoreActivities: () => Promise<void>;
    fetchClassSpecificHistory: (classId: string) => Promise<void>;
    handleQuizComplete: (quizId: string, title: string, score: number, total: number) => Promise<number>;
    handleActivitySubmit: (activityId: string, content: string) => Promise<void>;
    handleJoinClass: (code: string) => Promise<boolean>;
    handleLeaveClass: (classId: string) => void;
    handleMarkAllNotificationsRead: () => Promise<void>;
    handleMarkNotificationAsRead: (id: string) => Promise<void>;
    handleModuleProgressUpdate: (moduleId: string, progress: number) => Promise<void>;
    handleModuleComplete: (moduleId: string) => Promise<void>;
}

export const StudentDataContext = createContext<StudentDataContextType | undefined>(undefined);

const ACTIVITIES_PER_PAGE = 10;

export function StudentDataProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { addToast } = useToast();
    
    const [modules, setModules] = useState<Module[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [studentClasses, setStudentClasses] = useState<TeacherClass[]>([]);
    
    // FASE 2: Separação de estados para notificações Híbridas
    const [privateNotifications, setPrivateNotifications] = useState<Notification[]>([]);
    const [broadcastNotifications, setBroadcastNotifications] = useState<Notification[]>([]);
    
    // FASE 3: Estado para Recibos de Leitura (Read Receipts)
    const [readReceipts, setReadReceipts] = useState<Set<string>>(new Set());
    
    const [userStats, setUserStats] = useState<UserStats>({ xp: 0, level: 1, xpForNextLevel: 100, levelName: 'Iniciante' });
    
    const [isLoading, setIsLoading] = useState(true);
    
    // Pagination States
    const [lastActivityDoc, setLastActivityDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMoreActivities, setHasMoreActivities] = useState(false);
    const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);

    // Notification Listener 1: Private Messages (Direct) + Read Receipts Listener
    useEffect(() => {
        if (!user || user.role !== 'aluno') return;

        // 1. Listener de Notificações Privadas
        const notifQuery = query(
            collection(db, "notifications"), 
            where("userId", "==", user.id), 
            where("read", "==", false), 
            orderBy("timestamp", "desc"),
            limit(20)
        );
        
        const unsubNotif = onSnapshot(notifQuery, (snap) => {
            const validNotifs: Notification[] = [];
            const now = Date.now();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

            snap.docs.forEach(d => {
                const data = d.data();
                let dateObj: Date;
                if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
                else if (typeof data.timestamp === 'string') dateObj = new Date(data.timestamp);
                else dateObj = new Date();

                if (isNaN(dateObj.getTime())) dateObj = new Date();

                if (now - dateObj.getTime() <= sevenDaysMs) {
                    validNotifs.push({ id: d.id, ...data, timestamp: dateObj.toISOString() } as Notification);
                }
            });

            setPrivateNotifications(validNotifs);
        });

        // 2. Listener de Recibos de Leitura (FASE 3)
        // Monitora a subcoleção read_notifications do usuário
        const receiptsQuery = collection(db, "users", user.id, "read_notifications");
        const unsubReceipts = onSnapshot(receiptsQuery, (snap) => {
            const ids = new Set(snap.docs.map(d => d.id));
            setReadReceipts(ids);
        });

        return () => {
            unsubNotif();
            unsubReceipts();
        };
    }, [user]);

    // Notification Listener 2: Broadcasts (Class-wide) - FASE 2
    useEffect(() => {
        if (!user || user.role !== 'aluno' || studentClasses.length === 0) {
            setBroadcastNotifications([]);
            return;
        }

        // Firestore 'in' query limita a 10 itens. Pegamos as primeiras 10 turmas.
        const myClassIds = studentClasses.map(c => c.id).slice(0, 10);

        if (myClassIds.length === 0) return;

        const broadcastQuery = query(
            collection(db, "broadcasts"),
            where("classId", "in", myClassIds),
            where("expiresAt", ">", Timestamp.now()) 
        );

        const unsubBroadcast = onSnapshot(broadcastQuery, (snap) => {
            const fetchedBroadcasts: Notification[] = [];
            
            snap.docs.forEach(d => {
                const data = d.data();
                let dateObj: Date;
                if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
                else if (typeof data.timestamp === 'string') dateObj = new Date(data.timestamp);
                else dateObj = new Date();

                fetchedBroadcasts.push({
                    id: d.id,
                    title: data.title,
                    summary: data.summary,
                    urgency: 'medium', 
                    deepLink: data.deepLink || { page: 'dashboard' },
                    read: false, // Será sobrescrito no useMemo combinando com readReceipts
                    timestamp: dateObj.toISOString(),
                    userId: user.id 
                } as Notification);
            });

            setBroadcastNotifications(fetchedBroadcasts);
        });

        return () => unsubBroadcast();
    }, [user, studentClasses]);

    // Merge Notifications (Híbrido) + Aplicação dos Read Receipts (Fase 3)
    const notifications = useMemo(() => {
        const combined = [...privateNotifications, ...broadcastNotifications];
        
        // Processa estado de leitura
        const processed = combined.map(n => ({
            ...n,
            // Se for privada, usa n.read. Se for broadcast (ou privada), verifica o Set de recibos.
            // A lógica "OU" garante que se qualquer fonte disser que está lida, ela aparece como lida.
            read: n.read || readReceipts.has(n.id)
        }));

        // Ordenação unificada por data (mais recente primeiro)
        return processed.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [privateNotifications, broadcastNotifications, readReceipts]);


    // Separate function to fetch activities with pagination
    const fetchStudentActivities = useCallback(async (classIds: string[], startAfterDoc?: QueryDocumentSnapshot | null) => {
        if (classIds.length === 0) return { activities: [], lastDoc: null, hasMore: false };

        // Firestore 'in' query restriction: max 10 items.
        const classChunk = classIds.slice(0, 10);

        try {
            let q = query(
                collection(db, "activities"), 
                where("classId", "in", classChunk), 
                where("isVisible", "==", true),
                orderBy("createdAt", "desc"),
                limit(ACTIVITIES_PER_PAGE)
            );

            if (startAfterDoc) {
                q = query(q, startAfter(startAfterDoc));
            }

            // Tenta cache primeiro se for primeira página
            let snap;
            if (!startAfterDoc) {
                try {
                    snap = await getDocs(q, { source: 'cache' });
                    if (snap.empty) throw new Error('Cache empty');
                } catch {
                    snap = await getDocs(q);
                }
            } else {
                snap = await getDocs(q);
            }

            const fetchedActivities: Activity[] = [];
            
            snap.docs.forEach(d => {
                const data = d.data();
                fetchedActivities.push({ id: d.id, ...data } as Activity);
            });

            return {
                activities: fetchedActivities,
                lastDoc: snap.docs[snap.docs.length - 1] || null,
                hasMore: snap.docs.length === ACTIVITIES_PER_PAGE
            };

        } catch (error) {
            console.error("Error fetching paginated activities:", error);
            return { activities: [], lastDoc: null, hasMore: false };
        }
    }, []);

    const loadMoreActivities = async () => {
        if (!lastActivityDoc || isLoadingMoreActivities || studentClasses.length === 0) return;
        
        setIsLoadingMoreActivities(true);
        const classIds = studentClasses.map(c => c.id);
        
        const result = await fetchStudentActivities(classIds, lastActivityDoc);
        
        setActivities(prev => {
            // Avoid duplicates just in case
            const newIds = new Set(result.activities.map(a => a.id));
            return [...prev, ...result.activities.filter(a => !newIds.has(a.id))];
        });
        setLastActivityDoc(result.lastDoc);
        setHasMoreActivities(result.hasMore);
        setIsLoadingMoreActivities(false);
    };

    // Fetch specific class history (Phase 2 - Deep Dive)
    const fetchClassSpecificHistory = useCallback(async (classId: string) => {
        if (!user) return;
        try {
            const q = query(
                collection(db, "activities"),
                where("classId", "==", classId),
                where("isVisible", "==", true),
                orderBy("createdAt", "desc"),
                limit(50) // Deep dive: load last 50 items for this class
            );
            
            // Tenta cache primeiro
            let snap;
            try {
                snap = await getDocs(q, { source: 'cache' });
                if(snap.empty) throw new Error('Cache miss');
            } catch {
                snap = await getDocs(q);
            }
            
            // Get class name for consistency
            const cls = studentClasses.find(c => c.id === classId);
            const className = cls ? cls.name : 'Turma';

            const fetchedActivities = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    className: data.className || className
                } as Activity;
            });

            setActivities(prev => {
                const existingIds = new Set(prev.map(a => a.id));
                const uniqueNew = fetchedActivities.filter(a => !existingIds.has(a.id));
                
                if (uniqueNew.length === 0) return prev;
                
                // Merge and sort descending
                const merged = [...prev, ...uniqueNew].sort((a, b) => {
                    const tA = a.createdAt ? (new Date(a.createdAt).getTime() || 0) : 0;
                    const tB = b.createdAt ? (new Date(b.createdAt).getTime() || 0) : 0;
                    return tB - tA;
                });
                return merged;
            });

        } catch (error) {
            console.error("Error fetching class history:", error);
            addToast("Erro ao carregar histórico da turma.", "error");
        }
    }, [user, studentClasses, addToast]);

    // Main Data Fetching Function (Pull-based with Cache-Then-Network)
    const refreshData = useCallback(async (forceRefresh = false) => {
        if (!user || user.role !== 'aluno') {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        try {
            // 2. Fetch Classes First
            const classesQuery = query(
                collection(db, "classes"), 
                where("studentIds", "array-contains", user.id)
            );
            
            let classesSnap;
            let isCache = false;

            // Estratégia Cache-Primeiro para Classes
            if (!forceRefresh) {
                try {
                    classesSnap = await getDocs(classesQuery, { source: 'cache' });
                    if (!classesSnap.empty) isCache = true;
                } catch (e) { /* Cache miss */ }
            }

            if (!isCache || classesSnap?.empty) {
                classesSnap = await getDocs(classesQuery);
            }

            const myClasses = classesSnap!.docs.map(d => {
                const data = d.data();
                const notices = (Array.isArray(data.notices) ? data.notices : []).map((n: any) => ({
                    ...n,
                    timestamp: n.timestamp?.toDate ? n.timestamp.toDate().toISOString() : n.timestamp
                }));
                return { id: d.id, ...data, notices } as TeacherClass;
            });
            
            setStudentClasses(myClasses);
            const myClassIds = myClasses.map(c => c.id);

            // 3. Fetch Content: Quizzes e Módulos
            let quizzesQuery = query(collection(db, "quizzes"), where("status", "==", "Ativo"));
            let modulesQuery = query(collection(db, "modules"), where("status", "==", "Ativo"), where("visibility", "==", "public"));

            if (user.series) {
                quizzesQuery = query(quizzesQuery, where("series", "array-contains", user.series));
                modulesQuery = query(modulesQuery, where("series", "array-contains", user.series));
            }

            // Queries Array
            const queries = [
                quizzesQuery,
                modulesQuery,
                collection(db, "users", user.id, "quiz_results")
            ];

            if (myClassIds.length > 0) {
                for (let i = 0; i < myClassIds.length; i += 10) {
                    const chunk = myClassIds.slice(i, i + 10);
                    queries.push(query(
                        collection(db, "modules"), 
                        where("status", "==", "Ativo"), 
                        where("classIds", "array-contains-any", chunk)
                    ));
                }
            }

            // Executa queries com estratégia Cache-Primeiro individualmente
            const results = await Promise.all(queries.map(async (q) => {
                if (!forceRefresh) {
                    try {
                        // @ts-ignore - q pode ser CollectionReference que aceita getDocs
                        const snap = await getDocs(q, { source: 'cache' });
                        if (!snap.empty) return snap;
                    } catch { /* Ignore */ }
                }
                // @ts-ignore
                return await getDocs(q);
            }));
            
            const quizzesSnap = results[0];
            const publicModulesSnap = results[1];
            const quizResultsSnap = results[2];
            
            // --- FASE 1: Lógica de Conquistas (Merge Global + User Doc) ---
            const [globalAchievements, userAchievementsDoc] = await Promise.all([
                fetchGlobalAchievements(),
                fetchUserAchievementsDoc(user.id)
            ]);

            const mergedAchievements = globalAchievements.map(ach => {
                const userUnlockData = userAchievementsDoc.unlocked[ach.id];
                return {
                    ...ach,
                    unlocked: !!userUnlockData,
                    date: userUnlockData ? new Date(userUnlockData.date).toLocaleDateString('pt-BR') : ''
                } as Achievement;
            });
            setAchievements(mergedAchievements);

            const fetchedStats: UserStats = {
                xp: userAchievementsDoc.xp,
                level: userAchievementsDoc.level,
                xpForNextLevel: 100,
                levelName: userAchievementsDoc.level < 5 ? 'Iniciante' : 'Estudante'
            };
            setUserStats(fetchedStats);
            // --- FIM FASE 1 ---

            // Process Quiz Attempts
            const quizAttemptsMap: Record<string, number> = {};
            quizResultsSnap.docs.forEach((d: any) => {
                quizAttemptsMap[d.id] = d.data().attempts || 0;
            });

            const fetchedQuizzes = quizzesSnap.docs.map((d: any) => {
                const qData = d.data();
                return { 
                    id: d.id, 
                    ...qData, 
                    attempts: quizAttemptsMap[d.id] || 0 
                } as Quiz;
            });

            setQuizzes(fetchedQuizzes);

            // Process Modules
            const modulesMap = new Map<string, Module>();
            
            publicModulesSnap.docs.forEach((d: any) => {
                modulesMap.set(d.id, { id: d.id, ...d.data() } as Module);
            });

            // Módulos privados das turmas
            for (let i = 3; i < results.length; i++) {
                results[i].docs.forEach((d: any) => {
                    if (!modulesMap.has(d.id)) {
                        modulesMap.set(d.id, { id: d.id, ...d.data() } as Module);
                    }
                });
            }
            const rawModules = Array.from(modulesMap.values());

            // 4. User Profile & Progress
            const userRef = doc(db, "users", user.id);
            const userSnap = await getDoc(userRef);
            const userProfile = userSnap.exists() ? userSnap.data() : {};
            let progressMap = userProfile.modulesProgress || {};

            const mergedModules = rawModules.map(m => {
                const progData = progressMap[m.id];
                return { ...m, progress: progData ? progData.progress : 0 };
            });
            setModules(mergedModules);

            // 5. Fetch Activities (PAGINATED - Phase 2)
            const activityResult = await fetchStudentActivities(myClassIds, null);
            
            const enrichedActivities = activityResult.activities.map(act => {
                let className = act.className;
                if (!className || className === 'Turma desconhecida') {
                    const cls = myClasses.find(c => c.id === act.classId);
                    if (cls) className = cls.name;
                }
                return { ...act, className };
            });

            setActivities(enrichedActivities);
            setLastActivityDoc(activityResult.lastDoc);
            setHasMoreActivities(activityResult.hasMore);

        } catch (error: any) {
            console.error("Error fetching student data:", error);
            addToast(`Erro ao carregar dados: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [user, addToast, fetchStudentActivities]);

    // Initial Fetch
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // O contador reflete as notificações que NÃO estão marcadas como lidas
    const unreadNotificationCount = notifications.filter(n => !n.read).length;

    const gradeReport: GradeReport = useMemo(() => {
        const report: GradeReport = {};
        studentClasses.forEach(cls => {
            report[cls.id] = { className: cls.name, unidades: {} };
        });

        activities.forEach(activity => {
            const classReport = report[activity.classId];
            if (!classReport) return;

            const submission = activity.submissions?.find(s => s.studentId === user?.id);

            if (submission && submission.status === 'Corrigido' && typeof submission.grade === 'number' && activity.unidade) {
                const unidadeKey = activity.unidade as Unidade;
                if (!classReport.unidades[unidadeKey]) {
                    classReport.unidades[unidadeKey] = { totalPoints: 0, activities: [] };
                }
                const unitReport = classReport.unidades[unidadeKey]!;
                unitReport.totalPoints += submission.grade;
                unitReport.activities.push({
                    id: activity.id,
                    title: activity.title,
                    grade: submission.grade,
                    maxPoints: activity.points
                });
            }
        });
        return report;
    }, [studentClasses, activities, user]);

    // FASE 1: Implementação real de handleQuizComplete com persistência e regra de XP
    const handleQuizComplete = async (quizId: string, title: string, score: number, total: number) => {
        if (!user) return 0;

        try {
            const resultRef = doc(db, 'users', user.id, 'quiz_results', quizId);
            const resultSnap = await getDoc(resultRef);

            let xpEarned = 0;
            const previousAttempts = resultSnap.exists() ? resultSnap.data().attempts || 0 : 0;

            // Lógica de XP: 10 XP por questão acertada APENAS na PRIMEIRA tentativa.
            if (previousAttempts === 0) {
               xpEarned = score * 10;
            }

            const resultData = {
                quizId,
                title,
                lastScore: score,
                totalQuestions: total,
                lastCompletedAt: serverTimestamp(),
                attempts: increment(1),
                // Atualiza o melhor score se o atual for maior, ou mantém o antigo
                bestScore: resultSnap.exists() ? Math.max(resultSnap.data().bestScore || 0, score) : score
            };

            await setDoc(resultRef, resultData, { merge: true });

            if (xpEarned > 0) {
                const statsRef = doc(db, "userAchievements", user.id);
                await setDoc(statsRef, {
                    xp: increment(xpEarned),
                    updatedAt: serverTimestamp()
                }, { merge: true });

                setUserStats(prev => ({ 
                    ...prev, 
                    xp: prev.xp + xpEarned,
                    level: Math.floor((prev.xp + xpEarned) / 100) + 1 
                }));
                
                addToast(`Parabéns! Você ganhou ${xpEarned} XP!`, 'success');
            } else if (previousAttempts > 0) {
                addToast(`Quiz concluído! (Sem XP extra por repetição)`, 'info');
            } else if (score === 0) {
                addToast(`Quiz concluído! (Sem acertos, sem XP)`, 'info');
            }

            setQuizzes(prev => prev.map(q => {
                if (q.id === quizId) {
                    return { ...q, attempts: (q.attempts || 0) + 1 };
                }
                return q;
            }));

            return xpEarned;

        } catch (error) {
            console.error("Erro ao salvar quiz:", error);
            addToast("Erro ao salvar seu resultado.", "error");
            return 0;
        }
    };

    const handleActivitySubmit = async (activityId: string, content: string) => {
        if (!user) return;
        try {
             const activityRef = doc(db, "activities", activityId);
             const snap = await getDoc(activityRef);
             
             if (snap.exists()) {
                 const data = snap.data() as Activity;
                 
                 const submissionData = {
                     studentId: user.id,
                     studentName: user.name,
                     submissionDate: new Date().toISOString(),
                     content,
                     status: 'Aguardando correção',
                     grade: null,
                     feedback: null
                 };

                 const submissionsSubRef = collection(activityRef, "submissions");
                 await setDoc(doc(submissionsSubRef, user.id), submissionData);

                 const currentSubmissions = data.submissions || [];
                 const otherSubmissions = currentSubmissions.filter(s => s.studentId !== user.id);
                 
                 await updateDoc(activityRef, {
                     submissions: [...otherSubmissions, submissionData],
                     status: "Pendente", 
                     pendingSubmissionCount: increment(1),
                     submissionCount: increment(1)
                 });

                 setActivities(prev => prev.map(act => {
                     if (act.id !== activityId) return act;
                     const others = (act.submissions || []).filter(s => s.studentId !== user.id);
                     return {
                         ...act,
                         submissions: [...others, { ...submissionData, status: 'Aguardando correção' } as any]
                     };
                 }));

                 // NOTIFICATION
                 if (data.creatorId) {
                    await createNotification({
                        userId: data.creatorId,
                        actorId: user.id,
                        actorName: user.name,
                        type: 'activity_submission',
                        title: "Nova Resposta Recebida",
                        text: `O aluno ${user.name} enviou uma resposta para a atividade "${data.title}".`,
                        classId: data.classId,
                        activityId: activityId
                    });
                 }

                 addToast("Atividade enviada com sucesso!", "success");
             }
        } catch (e: any) {
             console.error(e);
             addToast("Erro ao enviar atividade.", "error");
        }
    };

    const handleJoinClass = async (code: string) => {
        if (!user) return false;
        try {
            const classesRef = collection(db, "classes");
            const q = query(classesRef, where("code", "==", code));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                addToast("Código da turma inválido.", "error");
                return false;
            }

            const classDoc = querySnapshot.docs[0];
            const classId = classDoc.id;
            const classData = classDoc.data();
            const teacherId = classData.teacherId;

            // Check if already member locally first to avoid transaction overhead
            let isMember = false;
            if (classData.studentIds && Array.isArray(classData.studentIds)) {
                isMember = classData.studentIds.includes(user.id);
            } else if (classData.students) {
                isMember = classData.students.some((s: any) => {
                    if (typeof s === 'string') return s === user.id;
                    return s.id === user.id;
                });
            }

            if (isMember) {
                addToast("Você já está nesta turma.", "info");
                return false;
            }

            // Refactored Transaction: Only update 'classes' collection and 'teacher_history' counters.
            // Removed legacy 'classes' array update inside 'teacher_history'.
            await runTransaction(db, async (tx) => {
                const classRef = doc(db, "classes", classId);
                const historyRef = doc(db, "teacher_history", teacherId);
                
                const classSnap = await tx.get(classRef);
                if (!classSnap.exists()) throw new Error("Turma não encontrada durante transação.");
                
                const currentData = classSnap.data();
                const currentStudentIds = currentData.studentIds || [];
                
                if (currentStudentIds.includes(user.id)) {
                    throw new Error("User already in class");
                }

                // Update Class (Source of Truth)
                tx.update(classRef, {
                    students: arrayUnion({ id: user.id, name: user.name || "", avatarUrl: (user as any).avatarUrl || null }),
                    studentIds: arrayUnion(user.id),
                    studentCount: increment(1)
                });

                // Update Teacher History (Counters Only - Scalable)
                tx.set(historyRef, { 
                    totalStudents: increment(1),
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            });

            addToast("Entrou na turma com sucesso!", "success");
            await refreshData(true);
            
            return true;
        } catch (error: any) {
            if (error.message === "User already in class") {
                addToast("Você já está nesta turma.", "info");
            } else {
                console.error("Error joining class:", error);
                addToast("Erro ao entrar na turma.", "error");
            }
            return false;
        }
    };

    const handleLeaveClass = (classId: string) => {};

    const handleMarkAllNotificationsRead = async () => {
        if (!user) return;
        try {
            const batch = writeBatch(db);
            
            // 1. Atualiza notificações privadas
            notifications.forEach(n => {
                const isPrivate = privateNotifications.some(pn => pn.id === n.id);
                const isBroadcast = broadcastNotifications.some(bn => bn.id === n.id);
                
                if (isPrivate && !n.read) {
                    const ref = doc(db, "notifications", n.id);
                    batch.update(ref, { read: true });
                } else if (isBroadcast && !readReceipts.has(n.id)) {
                    // FASE 3: Marca broadcast como lido via recibo
                    const receiptRef = doc(db, "users", user.id, "read_notifications", n.id);
                    batch.set(receiptRef, {});
                }
            });
            
            await batch.commit();
            
            // Atualiza estado local
            // Privadas saem da lista (pelo listener) ou são marcadas.
            // Broadcasts ganham recibos (pelo listener).
            // Como temos listeners, o estado se ajustará automaticamente.
        } catch (error) {
            console.error("Erro ao marcar notificações como lidas", error);
        }
    };

    const handleMarkNotificationAsRead = async (id: string) => {
        if (!user) return;
        try {
            const isPrivate = privateNotifications.some(pn => pn.id === id);
            
            if (isPrivate) {
                const ref = doc(db, "notifications", id);
                await updateDoc(ref, { read: true });
                // Optimistic update local
                setPrivateNotifications(prev => prev.filter(n => n.id !== id));
            } else {
                // FASE 3: É um broadcast, criar recibo de leitura
                const receiptRef = doc(db, "users", user.id, "read_notifications", id);
                await setDoc(receiptRef, {});
                // Optimistic update: adiciona ao Set local
                setReadReceipts(prev => new Set(prev).add(id));
            }
        } catch (error) {
            console.error("Erro ao marcar notificação como lida", error);
        }
    };
    
    const handleModuleProgressUpdate = async (moduleId: string, progress: number) => {
        if (!user) return;
        try {
            const cleanProgress = Math.floor(progress);
            const userRef = doc(db, "users", user.id);
            
            await updateDoc(userRef, {
                [`modulesProgress.${moduleId}`]: { progress: cleanProgress, lastUpdated: serverTimestamp() }
            });

            const updatedModules = modules.map(m => m.id === moduleId ? { ...m, progress: cleanProgress } : m);
            setModules(updatedModules);
            
        } catch (err) {
            console.error("Erro ao atualizar progresso:", err);
        }
    };

    const handleModuleComplete = async (moduleId: string) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.id);
            
            await updateDoc(userRef, {
                [`modulesProgress.${moduleId}`]: { progress: 100, completedAt: Date.now() }
            });

            const updatedModules = modules.map(m => m.id === moduleId ? { ...m, progress: 100 } : m);
            setModules(updatedModules);

        } catch (err) {
            console.error("Erro ao concluir módulo:", err);
        }
    };

    const value = {
        modules, quizzes, achievements, activities, studentClasses, notifications, gradeReport, userStats, unreadNotificationCount, isLoading,
        hasMoreActivities, isLoadingMoreActivities,
        loadMoreActivities, fetchClassSpecificHistory, handleQuizComplete, handleActivitySubmit, handleJoinClass, handleLeaveClass, handleMarkAllNotificationsRead, handleMarkNotificationAsRead, handleModuleProgressUpdate, handleModuleComplete, refreshData
    };

    return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>;
}

export const useStudentData = () => {
    const context = useContext(StudentDataContext);
    if (context === undefined) throw new Error('useStudentData must be used within a StudentDataProvider');
    return context;
};
