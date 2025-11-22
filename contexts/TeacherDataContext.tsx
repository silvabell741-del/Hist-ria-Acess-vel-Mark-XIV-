
import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { db } from '../components/firebaseClient';
import { 
    collection, query, where, getDocs, doc, updateDoc, 
    addDoc, deleteDoc, serverTimestamp, increment, getDoc, setDoc, orderBy, writeBatch, Timestamp, limit, arrayUnion, runTransaction 
} from 'firebase/firestore';
import type { TeacherClass, Module, Notification, Activity, AttendanceSession, Turno, ClassInvitation } from '../types';
import { createNotification } from '../utils/createNotification';

export interface PendingActivity {
    id: string;
    title: string;
    className: string;
    classId: string;
    pendingCount: number;
}

export interface TeacherDataContextType {
    teacherClasses: TeacherClass[];
    modules: Module[];
    notifications: Notification[];
    attendanceSessionsByClass: Record<string, AttendanceSession[]>;
    allPendingActivities: PendingActivity[];
    pendingInvitations: ClassInvitation[]; // Novos convites pendentes
    dashboardStats: {
        totalClasses: number;
        totalStudents: number;
        totalModulesCreated: number;
        totalPendingSubmissions: number;
    };
    isLoading: boolean;
    unreadNotificationCount: number;
    isSubmitting: boolean;

    handlePostNotice: (classId: string, text: string) => Promise<void>;
    handleCreateClass: (name: string) => Promise<void>;
    handleInviteTeacher: (classId: string, email: string, subject: string) => Promise<void>;
    handleAcceptInvite: (invitation: ClassInvitation) => Promise<void>; // Aceitar convite
    handleDeclineInvite: (invitationId: string) => Promise<void>; // Recusar convite
    handleDeleteModule: (classId: string, moduleId: string) => void;
    handleGradeActivity: (activityId: string, studentId: string, grade: number, feedback: string) => Promise<boolean>;
    handleSaveActivity: (activity: Omit<Activity, 'id'>) => Promise<boolean>;
    handleCreateAttendanceSession: (classId: string, date: string, turno: Turno, horario: number) => Promise<void>;
    handleUpdateAttendanceStatus: (sessionId: string, recordId: string, status: 'presente' | 'ausente') => Promise<void>;
    handleSaveModule: (module: Omit<Module, 'id'>) => Promise<boolean>;
    handleUpdateModule: (module: Module) => Promise<void>;
    handleMarkAllNotificationsRead: () => Promise<void>;
    handleMarkNotificationAsRead: (id: string) => Promise<void>;
    handleCleanupOldData: () => Promise<void>;
    generateTestData: () => Promise<void>;
    fetchData: (forceRefresh?: boolean) => Promise<void>;
    fetchClassDetails: (classId: string) => Promise<void>;
    fetchModulesLibrary: () => Promise<void>;
    getAttendanceSession: (sessionId: string) => Promise<AttendanceSession | null>;
    handleModuleProgressUpdate: (moduleId: string, progress: number) => Promise<void>;
    handleModuleComplete: (moduleId: string) => Promise<void>;
}

export const TeacherDataContext = createContext<TeacherDataContextType | undefined>(undefined);

export function TeacherDataProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [attendanceSessionsByClass, setAttendanceSessionsByClass] = useState<Record<string, AttendanceSession[]>>({});
    const [pendingInvitations, setPendingInvitations] = useState<ClassInvitation[]>([]); // State for invites
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modulesLibraryLoaded, setModulesLibraryLoaded] = useState(false);

    // --- Data Fetching with Cache-First Strategy ---

    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!user || user.role !== 'professor') return;
        
        // Set loading only if we don't have data yet to avoid flickering
        if (teacherClasses.length === 0) setIsLoading(true);

        try {
            // 2. Fetch Classes (Lightweight)
            // FASE 1: Mudança para suportar múltiplos professores (array-contains)
            const qClasses = query(collection(db, "classes"), where("teachers", "array-contains", user.id));
            
            let snapClasses;
            let isCache = false;

            // Tenta cache primeiro se não for refresh forçado
            if (!forceRefresh) {
                try {
                    snapClasses = await getDocs(qClasses, { source: 'cache' });
                    if (!snapClasses.empty) isCache = true;
                } catch { /* Ignore cache miss */ }
            }

            // Se não pegou do cache, vai na rede
            if (!isCache || snapClasses?.empty) {
                snapClasses = await getDocs(qClasses);
            }
            
            let classesData = snapClasses!.docs.map(d => {
                const data = d.data();
                
                // ISOLAMENTO DE AVISOS:
                // Filtra avisos no cliente para mostrar apenas os criados por ESTE professor.
                const rawNotices = Array.isArray(data.notices) ? data.notices : [];
                const myNotices = rawNotices.filter((n: any) => n.authorId === user.id).map((n: any) => ({
                    ...n,
                    timestamp: n.timestamp?.toDate ? n.timestamp.toDate().toISOString() : n.timestamp
                }));

                return {
                    id: d.id,
                    ...data,
                    students: Array.isArray(data.students) ? data.students : [],
                    notices: myNotices, // Apenas avisos do usuário
                    noticeCount: myNotices.length, // Atualiza contagem visual local
                    modules: [],
                    activities: [], 
                    isFullyLoaded: false
                } as TeacherClass;
            });

            // 3. Fetch ONLY Pending Activities (ISOLAMENTO JÁ EXISTENTE AQUI: creatorId == user.id)
            const qPending = query(
                collection(db, "activities"), 
                where("creatorId", "==", user.id),
                where("status", "==", "Pendente")
            );
            
            let snapPending;
            if (!forceRefresh) {
                try { snapPending = await getDocs(qPending, { source: 'cache' }); } catch {}
            }
            if (!snapPending || snapPending.empty) {
                snapPending = await getDocs(qPending);
            }
            
            const pendingActivities: Activity[] = [];
            snapPending.docs.forEach(d => {
                const data = d.data();
                const cls = classesData.find(c => c.id === data.classId);
                pendingActivities.push({ 
                    id: d.id, 
                    ...data, 
                    className: data.className || cls?.name || 'Turma desconhecida'
                } as Activity);
            });

            classesData = classesData.map(c => ({
                ...c,
                activities: pendingActivities.filter(a => a.classId === c.id)
            }));

            setTeacherClasses(classesData);

            // 4. Fetch Notifications
            const qNotif = query(
                collection(db, "notifications"), 
                where("userId", "==", user.id), 
                where("read", "==", false),
                orderBy("timestamp", "desc")
            );
            
            let snapNotif;
            if (!forceRefresh) {
                try { snapNotif = await getDocs(qNotif, { source: 'cache' }); } catch {}
            }
            if (!snapNotif || snapNotif.empty) {
                snapNotif = await getDocs(qNotif);
            }

            const validNotifs: Notification[] = [];
            const now = Date.now();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

            snapNotif.docs.forEach(d => {
                const data = d.data();
                let dateObj: Date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || now);
                if (isNaN(dateObj.getTime())) dateObj = new Date();

                if (now - dateObj.getTime() <= sevenDaysMs) {
                    validNotifs.push({ id: d.id, ...data, timestamp: dateObj.toISOString() } as Notification);
                }
            });
            setNotifications(validNotifs);

            // 5. Fetch Pending Invitations (New Collection)
            const qInvites = query(
                collection(db, "invitations"),
                where("inviteeId", "==", user.id),
                where("status", "==", "pending")
            );
            const snapInvites = await getDocs(qInvites); // Invites are critical, prefer server check usually, but simple getDocs handles it
            const invites = snapInvites.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
                } as ClassInvitation;
            });
            setPendingInvitations(invites);

            setAttendanceSessionsByClass({});

        } catch (error: any) {
            console.error("Error fetching teacher data:", error);
            addToast(`Erro ao carregar dados: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [user, addToast]);

    // ... (Fetch Class Details and Modules Library remain the same)
    // --- Lazy Loading: Fetch Full Class Details (Activities + Sessions) ---
    const fetchClassDetails = useCallback(async (classId: string) => {
        if (!user) return;
        
        // Check if already loaded in state
        const existingClass = teacherClasses.find(c => c.id === classId);
        if (existingClass?.isFullyLoaded) return;

        try {
            // ISOLAMENTO DE CONTEÚDO:
            // Adiciona cláusulas 'where' para buscar APENAS o conteúdo deste professor.
            // PAGINAÇÃO E ORDENAÇÃO (FASE 3): Limita a 50 atividades e 20 chamadas.
            
            // Fetch activities created by ME for this class
            const qActivities = query(
                collection(db, "activities"), 
                where("classId", "==", classId),
                where("creatorId", "==", user.id), // ISOLAMENTO
                orderBy("createdAt", "desc"), // ORDENAÇÃO: Mais recentes primeiro
                limit(50) // PAGINAÇÃO: Apenas as últimas 50
            );
            
            // Fetch attendance sessions created by ME for this class
            const qSessions = query(
                collection(db, "attendance_sessions"), 
                where("classId", "==", classId), 
                where("teacherId", "==", user.id), // ISOLAMENTO
                orderBy("date", "desc"), // ORDENAÇÃO
                limit(20) // PAGINAÇÃO: Apenas as últimas 20
            );

            // Tentativa de Cache-First para detalhes
            let snapActivities, snapSessions;
            try {
                [snapActivities, snapSessions] = await Promise.all([
                    getDocs(qActivities, { source: 'cache' }),
                    getDocs(qSessions, { source: 'cache' })
                ]);
                if(snapActivities.empty && snapSessions.empty) throw new Error("Cache miss");
            } catch {
                [snapActivities, snapSessions] = await Promise.all([
                    getDocs(qActivities),
                    getDocs(qSessions)
                ]);
            }

            const activities = snapActivities.docs.map(d => ({ 
                id: d.id, ...d.data(), className: existingClass?.name || 'Turma' 
            } as Activity));

            const sessions = snapSessions.docs.map(d => {
                const docData = d.data();
                return {
                    id: d.id,
                    ...docData,
                    createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : docData.createdAt
                } as AttendanceSession;
            });

            // Update Classes State
            setTeacherClasses(prev => prev.map(c => {
                if (c.id === classId) {
                    return {
                        ...c,
                        activities: activities, // Replace partial pending list with full list (only mine)
                        isFullyLoaded: true
                    };
                }
                return c;
            }));

            // Update Sessions State
            setAttendanceSessionsByClass(prev => ({
                ...prev,
                [classId]: sessions
            }));

        } catch (error) {
            console.error("Error loading class details:", error);
            addToast("Erro ao carregar detalhes da turma.", "error");
        }
    }, [user, teacherClasses, addToast]);

    const fetchModulesLibrary = useCallback(async () => {
        if (modulesLibraryLoaded || !user) return;

        try {
            const snapModules = await getDocs(query(collection(db, "modules"), where("status", "==", "Ativo")));
            const snapProgress = await getDocs(collection(db, "teachers", user.id, "modulesProgress"));

            const fetchedModules = snapModules.docs.map(d => ({ id: d.id, ...d.data() } as Module));
            
            const visibleModules = fetchedModules.filter(m => 
                m.visibility === 'public' || m.creatorId === user.id
            );

            const progressMap: Record<string, any> = {};
            snapProgress.docs.forEach(d => progressMap[d.id] = d.data());

            const mergedModules = visibleModules.map(m => ({
                ...m,
                progress: progressMap[m.id]?.progress || 0
            }));
            
            setModules(mergedModules);
            setModulesLibraryLoaded(true);

        } catch (error) {
            console.error("Error loading modules library:", error);
        }
    }, [modulesLibraryLoaded, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const allPendingActivities = useMemo(() => {
        const pending: PendingActivity[] = [];
        teacherClasses.forEach(cls => {
            cls.activities?.forEach(act => {
                const pendingCount = act.pendingSubmissionCount || 0;
                if (pendingCount > 0) {
                    pending.push({
                        id: act.id,
                        title: act.title,
                        className: act.className || cls.name,
                        classId: cls.id,
                        pendingCount
                    });
                }
            });
        });
        return pending;
    }, [teacherClasses]);

    const unreadNotificationCount = notifications.length;

    const dashboardStats = useMemo(() => {
        const myModulesCount = modules.filter(m => m.creatorId === user?.id).length;
        return {
            totalClasses: teacherClasses.length,
            totalStudents: teacherClasses.reduce((acc, c) => acc + (c.studentCount || (c.students || []).length || 0), 0),
            totalModulesCreated: myModulesCount,
            totalPendingSubmissions: allPendingActivities.reduce((acc, a) => acc + a.pendingCount, 0)
        };
    }, [teacherClasses, modules, allPendingActivities, user?.id]);

    // ... (handlePostNotice, handleCreateClass remain same)
    const handlePostNotice = async (classId: string, text: string) => {
        if (!user) return;
        try {
            const noticeId = Date.now().toString();
            // ADICIONA authorId para permitir a filtragem por dono
            const notice = { 
                id: noticeId, 
                text, 
                author: user.name, 
                authorId: user.id, 
                timestamp: Timestamp.now() 
            };
            const noticeForState = { ...notice, timestamp: new Date().toISOString() };
            
            const classRef = doc(db, "classes", classId);
            
            setTeacherClasses(prev => prev.map(c => 
                c.id === classId ? { ...c, notices: [noticeForState, ...c.notices], noticeCount: (c.noticeCount || 0) + 1 } : c
            ));

            const classSnap = await getDoc(classRef);
            if(classSnap.exists()) {
                const currentNotices = classSnap.data().notices || [];
                // Persiste no array global da turma
                await updateDoc(classRef, { notices: [notice, ...currentNotices], noticeCount: increment(1) });
                
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30); 

                await addDoc(collection(db, "broadcasts"), {
                    classId,
                    type: 'notice_post',
                    title: 'Novo Aviso',
                    summary: `Professor ${user.name}: "${text}"`,
                    authorName: user.name,
                    timestamp: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiresAt),
                    deepLink: { page: 'join_class' } 
                });

                addToast("Aviso postado!", "success");
            }
        } catch (error) { console.error(error); addToast("Erro ao postar aviso.", "error"); fetchData(true); }
    };

    const handleCreateClass = async (name: string) => {
         if (!user) return;
         setIsSubmitting(true);
         try {
             const code = Math.random().toString(36).substring(2, 8).toUpperCase();
             const newClassPayload = { 
                 name, 
                 teacherId: user.id, 
                 teachers: [user.id], 
                 subjects: { [user.id]: 'Regente' }, 
                 teacherNames: { [user.id]: user.name }, 
                 code, 
                 students: [], 
                 studentCount: 0, 
                 notices: [], 
                 noticeCount: 0, 
                 createdAt: serverTimestamp() 
             };
             const docRef = await addDoc(collection(db, "classes"), newClassPayload);
             
             const newClass: TeacherClass = { id: docRef.id, ...newClassPayload, notices: [], activities: [], modules: [], createdAt: new Date().toISOString(), isFullyLoaded: true } as any;
             setTeacherClasses(prev => [...prev, newClass]);

             addToast("Turma criada!", "success");
         } catch (error) { console.error(error); addToast("Erro ao criar turma.", "error"); } finally { setIsSubmitting(false); }
    };

    // FASE 3 & 4: Convidar Professor (Atualizado para fluxo com confirmação)
    const handleInviteTeacher = async (classId: string, email: string, subject: string) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            // 1. Buscar usuário por email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                addToast("Usuário não encontrado com este email.", "error");
                setIsSubmitting(false);
                return;
            }

            const invitedUserDoc = snapshot.docs[0];
            const invitedUserData = invitedUserDoc.data();

            if (invitedUserData.role !== 'professor') {
                addToast("O usuário encontrado não é um professor.", "error");
                setIsSubmitting(false);
                return;
            }

            const invitedUserId = invitedUserDoc.id;
            const invitedUserName = invitedUserData.name;

            // 2. Verificar se já está na turma
            const currentClass = teacherClasses.find(c => c.id === classId);
            if (currentClass && currentClass.teachers?.includes(invitedUserId)) {
                addToast("Este professor já está na turma.", "info");
                setIsSubmitting(false);
                return;
            }

            // 3. Verificar se já existe um convite pendente
            const invitesRef = collection(db, "invitations");
            const qInvite = query(
                invitesRef, 
                where("classId", "==", classId),
                where("inviteeId", "==", invitedUserId),
                where("status", "==", "pending")
            );
            const inviteSnap = await getDocs(qInvite);
            if (!inviteSnap.empty) {
                addToast("Já existe um convite pendente para este professor.", "info");
                setIsSubmitting(false);
                return;
            }

            // 4. Criar Convite (Invitation)
            const inviteData = {
                type: 'class_co_teacher',
                classId,
                className: currentClass?.name || 'Turma',
                inviterId: user.id,
                inviterName: user.name,
                inviteeId: invitedUserId,
                inviteeEmail: email,
                subject,
                status: 'pending',
                timestamp: serverTimestamp()
            };

            await addDoc(invitesRef, inviteData);

            // 5. Criar Notificação para o Professor Convidado
            await createNotification({
                userId: invitedUserId,
                actorId: user.id,
                actorName: user.name,
                type: 'notice_post', // Reusing generic notice type or create a specific one
                title: 'Convite para Co-Docência',
                text: `Você foi convidado para ser professor da turma "${currentClass?.name}". Verifique seu Dashboard.`,
                classId: classId
            });

            addToast(`Convite enviado para ${invitedUserName}. Aguardando aceitação.`, "success");

        } catch (error) {
            console.error("Erro ao enviar convite:", error);
            addToast("Erro ao enviar convite.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // FASE 4: Aceitar Convite
    const handleAcceptInvite = async (invitation: ClassInvitation) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await runTransaction(db, async (transaction) => {
                const classRef = doc(db, "classes", invitation.classId);
                const inviteRef = doc(db, "invitations", invitation.id);
                
                const classDoc = await transaction.get(classRef);
                if (!classDoc.exists()) throw "Turma não existe mais.";

                // Atualiza a turma
                transaction.update(classRef, {
                    teachers: arrayUnion(user.id),
                    [`subjects.${user.id}`]: invitation.subject,
                    [`teacherNames.${user.id}`]: user.name
                });

                // Deleta o convite (ou marca como aceito, aqui deletamos para limpeza)
                transaction.delete(inviteRef);
            });

            // Atualiza estado local
            setPendingInvitations(prev => prev.filter(i => i.id !== invitation.id));
            addToast("Convite aceito! A turma aparecerá em breve.", "success");
            
            // Refresh para pegar a nova turma
            await fetchData(true);

        } catch (error) {
            console.error("Erro ao aceitar convite:", error);
            addToast("Erro ao aceitar convite.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // FASE 4: Recusar Convite
    const handleDeclineInvite = async (invitationId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "invitations", invitationId));
            setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
            addToast("Convite recusado.", "info");
        } catch (error) {
            console.error("Erro ao recusar:", error);
            addToast("Erro ao recusar convite.", "error");
        }
    };

    const handleDeleteModule = async (classId: string, moduleId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "modules", moduleId));
            await deleteDoc(doc(db, "module_contents", moduleId));

            setModules(prev => prev.filter(m => m.id !== moduleId));
            setTeacherClasses(prev => prev.map(cls => ({
                ...cls,
                modules: cls.modules.filter(m => m.id !== moduleId),
                moduleCount: cls.modules.some(m => m.id === moduleId) ? Math.max((cls.moduleCount || 1) - 1, 0) : cls.moduleCount
            })));
            addToast("Módulo excluído!", "success");
        } catch (error: any) { console.error(error); addToast("Erro ao excluir.", "error"); }
    };

    const handleGradeActivity = async (activityId: string, studentId: string, grade: number, feedback: string) => {
        try {
             const activityRef = doc(db, "activities", activityId);
             const activitySnap = await getDoc(activityRef);
             if (activitySnap.exists()) {
                 const activityData = activitySnap.data() as Activity;
                 const submissions = activityData.submissions || [];
                 const idx = submissions.findIndex(s => s.studentId === studentId);
                 let classId = activityData.classId;

                 if (idx > -1) {
                     submissions[idx].grade = grade;
                     submissions[idx].feedback = feedback;
                     submissions[idx].status = 'Corrigido';
                     submissions[idx].gradedAt = new Date().toISOString(); 
                 }
                 await setDoc(doc(collection(activityRef, "submissions"), studentId), { status: 'Corrigido', grade, feedback, gradedAt: new Date().toISOString() }, { merge: true });
                 await updateDoc(activityRef, { submissions: submissions, pendingSubmissionCount: increment(-1) });

                 if (user) {
                    await createNotification({
                        userId: studentId,
                        actorId: user.id,
                        actorName: user.name,
                        type: 'activity_correction',
                        title: 'Atividade Corrigida',
                        text: `Sua atividade "${activityData.title}" foi corrigida. Nota: ${grade}`,
                        classId: activityData.classId,
                        activityId: activityId
                    });
                 }

                 setTeacherClasses(prevClasses => prevClasses.map(cls => {
                     if (cls.id !== classId) return cls;
                     return {
                         ...cls,
                         activities: cls.activities.map(act => {
                             if (act.id !== activityId) return act;
                             const updatedSubmissions = (act.submissions || []).map(sub => {
                                 if (sub.studentId !== studentId) return sub;
                                 return { ...sub, status: 'Corrigido', grade, feedback, gradedAt: new Date().toISOString() };
                             });
                             return { ...act, submissions: updatedSubmissions, pendingSubmissionCount: Math.max((act.pendingSubmissionCount || 1) - 1, 0) };
                         })
                     };
                 }));
                 return true;
             }
             return false;
        } catch (error: any) { console.error(error); addToast("Erro ao salvar nota.", "error"); return false; }
    };

    // ... (Other functions remain unchanged: handleSaveActivity, handleCreateAttendanceSession, handleUpdateAttendanceStatus, handleSaveModule, handleUpdateModule, handleMarkAllNotificationsRead, handleMarkNotificationAsRead, handleCleanupOldData)
    const handleSaveActivity = async (activity: Omit<Activity, 'id'>) => {
        if (!user) return false;
        try {
            const docRef = await addDoc(collection(db, "activities"), { ...activity, status: "Pendente", pendingSubmissionCount: 0, submissionCount: 0, submissions: [], createdAt: serverTimestamp() });
            
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            await addDoc(collection(db, "broadcasts"), {
                classId: activity.classId,
                type: 'activity_post',
                title: 'Nova Atividade',
                summary: `O professor ${user.name} postou uma nova atividade: "${activity.title}"`,
                authorName: user.name,
                timestamp: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt),
                deepLink: { page: 'activities' }
            });

            addToast("Atividade criada!", "success");
            
            const existingClass = teacherClasses.find(c => c.id === activity.classId);
            if (existingClass) {
                existingClass.isFullyLoaded = false;
                fetchClassDetails(activity.classId);
            }
            return true;
        } catch (error) { console.error(error); addToast("Erro ao criar.", "error"); return false; }
    };

    const handleCreateAttendanceSession = async (classId: string, date: string, turno: Turno, horario: number) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const sessionData = { classId, date, turno, horario, teacherId: user.id, createdAt: serverTimestamp() };
            const docRef = await addDoc(collection(db, "attendance_sessions"), sessionData);
            const newSession: AttendanceSession = { id: docRef.id, ...sessionData, createdAt: new Date().toISOString() } as any;

            const cls = teacherClasses.find(c => c.id === classId);
            if (cls && cls.students) {
                const batch = writeBatch(db);
                const recordsRef = collection(db, "attendance_sessions", docRef.id, "records");
                cls.students.forEach(student => {
                    batch.set(doc(recordsRef), { sessionId: docRef.id, studentId: student.id, studentName: student.name, status: 'pendente', updatedAt: serverTimestamp() });
                });
                await batch.commit();
            }

            setAttendanceSessionsByClass(prev => ({ ...prev, [classId]: [newSession, ...(prev[classId] || [])] }));
            
            addToast("Chamada criada!", "success");
        } catch (error) { console.error(error); addToast("Erro ao criar chamada.", "error"); } finally { setIsSubmitting(false); }
    };

    const handleUpdateAttendanceStatus = async (sessionId: string, recordId: string, status: 'presente' | 'ausente') => {
        try {
            const recordRef = doc(db, "attendance_sessions", sessionId, "records", recordId);
            await updateDoc(recordRef, { status, updatedAt: serverTimestamp() });
        } catch (error) { console.error(error); addToast("Erro ao atualizar.", "error"); throw error; }
    };

    const handleSaveModule = async (module: Omit<Module, 'id'>) => {
        if (!user) return false;
        try {
            const { pages, ...metadata } = module;
            
            const docRef = await addDoc(collection(db, "modules"), { 
                ...metadata, 
                status: "Ativo", 
                createdAt: serverTimestamp(),
                pages: [] 
            });

            await setDoc(doc(db, "module_contents", docRef.id), { pages: pages });

            if (metadata.visibility === 'specific_class' && metadata.classIds && metadata.classIds.length > 0) {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 30);

                const batch = writeBatch(db);
                metadata.classIds.forEach(classId => {
                    const broadcastRef = doc(collection(db, "broadcasts"));
                    batch.set(broadcastRef, {
                        classId,
                        type: 'module_post',
                        title: 'Novo Módulo',
                        summary: `O professor ${user.name} publicou um novo módulo: "${metadata.title}"`,
                        authorName: user.name,
                        timestamp: serverTimestamp(),
                        expiresAt: Timestamp.fromDate(expiresAt),
                        deepLink: { page: 'modules', id: docRef.id }
                    });
                });
                await batch.commit();
            }

            addToast("Módulo criado!", "success");
            setModulesLibraryLoaded(false);
            return true;
        } catch (error) { console.error(error); addToast("Erro ao salvar.", "error"); return false; }
    };

    const handleUpdateModule = async (module: Module) => {
        try {
            const { id, pages, ...data } = module;
            await updateDoc(doc(db, "modules", id), { ...data, pages: [] });
            
            if (pages) {
                await setDoc(doc(db, "module_contents", id), { pages }, { merge: true });
            }

            addToast("Módulo atualizado!", "success");
            setModules(prev => prev.map(m => m.id === id ? module : m));
        } catch (error) { console.error(error); addToast("Erro ao atualizar.", "error"); }
    };

    const handleMarkAllNotificationsRead = async () => {
        if (!user) return;
        try {
            const batch = writeBatch(db);
            notifications.forEach(n => { if (!n.read) batch.update(doc(db, "notifications", n.id), { read: true }); });
            await batch.commit();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) { console.error(error); }
    };

    const handleMarkNotificationAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, "notifications", id), { read: true });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) { console.error(error); }
    };

    const handleCleanupOldData = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const now = Timestamp.now();
            const q = query(
                collection(db, "broadcasts"),
                where("expiresAt", "<", now),
                limit(500)
            );
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                addToast(`${snapshot.size} notificações antigas removidas com sucesso.`, "success");
            } else {
                addToast("Nenhuma notificação expirada encontrada.", "info");
            }
        } catch (error: any) {
            console.error("Cleanup error:", error);
            addToast("Erro na limpeza de dados.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const generateTestData = async () => {};
    const getAttendanceSession = async (sessionId: string) => { try { const snap = await getDoc(doc(db, "attendance_sessions", sessionId)); if (snap.exists()) return { id: snap.id, ...snap.data() } as AttendanceSession; return null; } catch { return null; } };
    const handleModuleProgressUpdate = async (moduleId: string, progress: number) => {};
    const handleModuleComplete = async (moduleId: string) => {};

    const value = {
        teacherClasses, modules, notifications, attendanceSessionsByClass, allPendingActivities, pendingInvitations, dashboardStats, isLoading, unreadNotificationCount, isSubmitting,
        handlePostNotice, handleCreateClass, handleInviteTeacher, handleAcceptInvite, handleDeclineInvite, handleDeleteModule, handleGradeActivity, handleSaveActivity, handleCreateAttendanceSession, handleUpdateAttendanceStatus,
        handleSaveModule, handleUpdateModule, handleMarkAllNotificationsRead, handleMarkNotificationAsRead, handleCleanupOldData, generateTestData, fetchData, fetchClassDetails, fetchModulesLibrary,
        getAttendanceSession, handleModuleProgressUpdate, handleModuleComplete
    };

    return <TeacherDataContext.Provider value={value}>{children}</TeacherDataContext.Provider>;
}

export const useTeacherData = () => {
    const context = useContext(TeacherDataContext);
    if (context === undefined) throw new Error('useTeacherData must be used within a TeacherDataProvider');
    return context;
};
