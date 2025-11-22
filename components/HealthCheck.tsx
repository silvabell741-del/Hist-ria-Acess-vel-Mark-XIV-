

import React, { useEffect, useState, useContext } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { Card } from './common/Card';
import { TeacherDataContext } from '../contexts/TeacherDataContext';
import { useAuth } from '../contexts/AuthContext';

// Agente de Testes (Health Check)
// Verifica integridade dos dados em tempo real

export const HealthCheck: React.FC = () => {
    const [report, setReport] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    
    const { userRole } = useAuth();
    const teacherData = useContext(TeacherDataContext);
    
    const runDiagnostics = async () => {
        setLoading(true);
        const logs: string[] = [];
        logs.push("=== Iniciando Diagnóstico ===");

        try {
            // 1. Verificar Classes
            const classesSnap = await getDocs(collection(db, 'classes'));
            logs.push(`[CLASSES] Encontradas ${classesSnap.size} turmas.`);
            
            classesSnap.forEach(d => {
                const data = d.data();
                if (!data.students) logs.push(`❌ Turma ${d.id}: Campo 'students' ausente.`);
                else if (Array.isArray(data.students)) {
                    const hasMixed = data.students.some((s: any) => typeof s !== 'object');
                    if (hasMixed) logs.push(`⚠️ Turma ${d.id}: Array 'students' contém strings/misto.`);
                }
            });

            // 2. Verificar Atividades e Sync
            const activitiesSnap = await getDocs(collection(db, 'activities'));
            logs.push(`[ACTIVITIES] Encontradas ${activitiesSnap.size} atividades.`);
            
            for (const d of activitiesSnap.docs) {
                const data = d.data();
                
                // Verifica contador
                const atomicPending = data.pendingSubmissionCount;
                if (atomicPending === undefined) logs.push(`❌ Atividade ${d.id}: Sem 'pendingSubmissionCount'.`);
                
                // Verifica subcoleção
                const subsSnap = await getDocs(collection(db, 'activities', d.id, 'submissions'));
                const actualPending = subsSnap.docs.filter(s => s.data().status === 'Aguardando correção').length;
                
                if (atomicPending !== actualPending) {
                    logs.push(`⚠️ Atividade ${d.id}: Contador (${atomicPending}) difere de submissões reais (${actualPending}).`);
                }

                // Verifica Big Doc (Teacher History)
                if (data.creatorId) {
                    const histRef = doc(db, 'teacher_history', data.creatorId);
                    const histSnap = await getDoc(histRef);
                    if (histSnap.exists()) {
                        const histData: any = histSnap.data();
                        const cls = histData.classes?.find((c: any) => c.id === data.classId);
                        const act = cls?.activities?.find((a: any) => a.id === d.id);
                        
                        if (!act) logs.push(`⚠️ Sync: Atividade ${d.id} não encontrada no teacher_history do prof ${data.creatorId}.`);
                        else {
                             if (act.pendingSubmissionCount !== atomicPending) logs.push(`⚠️ Sync: Contador pending teacher_history (${act.pendingSubmissionCount}) != atomic (${atomicPending}).`);
                        }
                    }
                }
            }

            // 3. Verificar Notificações (Invalid Date check)
            const notifSnap = await getDocs(collection(db, 'notifications'));
            logs.push(`[NOTIFICATIONS] Verificando ${notifSnap.size} notificações...`);
            notifSnap.forEach(d => {
                const data = d.data();
                let validDate = false;
                if (data.timestamp?.toDate) validDate = true;
                else if (typeof data.timestamp === 'string' && !isNaN(Date.parse(data.timestamp))) validDate = true;
                
                if (!validDate) logs.push(`❌ Notif ${d.id}: Data inválida (${JSON.stringify(data.timestamp)}).`);
            });

        } catch (e: any) {
            logs.push(`❌ Erro crítico no diagnóstico: ${e.message}`);
        }

        logs.push("=== Diagnóstico Concluído ===");
        setReport(logs);
        setLoading(false);
    };
    
    const handleGenerateTest = async () => {
        if (!teacherData?.generateTestData) return;
        setGenerating(true);
        await teacherData.generateTestData();
        setGenerating(false);
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 items-end">
            {userRole === 'professor' && teacherData?.generateTestData && (
                <button 
                    onClick={handleGenerateTest} 
                    disabled={generating}
                    className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs shadow-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {generating ? 'Gerando...' : '🛠️ Gerar Dados de Teste'}
                </button>
            )}
            <button 
                onClick={() => runDiagnostics()} 
                className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs shadow-lg hover:bg-gray-700"
            >
                {loading ? 'Rodando Testes...' : '🕵️ Agente de Testes'}
            </button>
            {report.length > 0 && (
                <Card className="absolute bottom-12 right-0 w-96 max-h-96 overflow-y-auto shadow-2xl border-2 border-indigo-500 p-4 !bg-white dark:!bg-slate-900">
                    <h4 className="font-bold mb-2 text-indigo-600">Relatório de Integridade</h4>
                    <ul className="space-y-1 text-xs font-mono">
                        {report.map((line, i) => (
                            <li key={i} className={line.includes('❌') ? 'text-red-600 font-bold' : line.includes('⚠️') ? 'text-yellow-600' : 'text-green-600'}>
                                {line}
                            </li>
                        ))}
                    </ul>
                    <button onClick={() => setReport([])} className="mt-2 text-xs underline text-gray-500">Fechar</button>
                </Card>
            )}
        </div>
    );
};
