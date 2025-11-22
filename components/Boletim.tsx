
import React, { useState, useMemo } from 'react';
import { useStudentData } from '../contexts/StudentDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './common/Card';
import type { Unidade, ClassGradeReport } from '../types';
import { SpinnerIcon } from '../constants/index';

// Helper para ordenar unidades
const getUnitOrder = (unit: string): number => {
    const map: Record<string, number> = {
        '1ª Unidade': 1,
        '2ª Unidade': 2,
        '3ª Unidade': 3,
        '4ª Unidade': 4
    };
    return map[unit] || 99;
};

const ClassReportCard: React.FC<{ classId: string; classReport: ClassGradeReport; }> = ({ classId, classReport }) => {
    const [expandedUnidade, setExpandedUnidade] = useState<string | null>(null);

    // Garante a ordem das unidades (1ª -> 4ª)
    const sortedUnidades = useMemo(() => {
        return Object.keys(classReport.unidades).sort((a, b) => getUnitOrder(a) - getUnitOrder(b));
    }, [classReport.unidades]);

    const hasAnyPoints = sortedUnidades.length > 0;

    if (!hasAnyPoints) {
        return (
            <Card>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{classReport.className}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Nenhuma nota registrada para esta turma ainda.</p>
            </Card>
        );
    }

    const toggleUnidade = (unidade: string) => {
        setExpandedUnidade(prev => prev === unidade ? null : unidade);
    };

    return (
        <Card className="!p-0 overflow-hidden">
            <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{classReport.className}</h3>
            </div>
            <div className="divide-y dark:divide-slate-700">
                {sortedUnidades.map(unidadeName => {
                    const data = classReport.unidades[unidadeName as Unidade];
                    if (!data) return null;

                    const isExpanded = expandedUnidade === unidadeName;

                    // Ordena atividades por título (ou data se disponível no futuro)
                    const sortedActivities = [...data.activities].sort((a, b) => a.title.localeCompare(b.title));

                    return (
                        <div key={unidadeName}>
                            <div 
                                className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" 
                                onClick={() => toggleUnidade(unidadeName)} 
                                role="button" 
                                aria-expanded={isExpanded}
                            >
                                <div>
                                    <p className="font-semibold text-slate-700 dark:text-slate-200">{unidadeName}</p>
                                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold">Total: {Number(data.totalPoints).toFixed(1).replace(/\.0$/, '')} pts</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ver Detalhes</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border-t dark:border-slate-700">
                                    <h4 className="font-semibold text-sm mb-3 text-slate-600 dark:text-slate-300 uppercase tracking-wider">Atividades Avaliadas</h4>
                                    {sortedActivities.length > 0 ? (
                                        <ul className="space-y-2">
                                            {sortedActivities.map(act => (
                                                <li key={act.id} className="flex justify-between items-center text-sm p-3 bg-white dark:bg-slate-800 rounded-md border dark:border-slate-700 shadow-sm">
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{act.title}</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                                        {act.grade} <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">/ {act.maxPoints}</span>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">Nenhuma atividade registrada nesta unidade.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

const Boletim: React.FC = () => {
    const { user } = useAuth();
    const { gradeReport, isLoading } = useStudentData();

    if (isLoading) {
        return (
             <div className="flex justify-center items-center h-full pt-16">
                <SpinnerIcon className="h-12 w-12 text-indigo-500" />
            </div>
        )
    }

    if (!user) return null;

    const hasData = gradeReport && Object.keys(gradeReport).length > 0;

    if (!hasData) {
         return (
            <Card className="text-center py-20">
                <div className="inline-block bg-slate-100 dark:bg-slate-700/50 rounded-full p-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">Boletim Indisponível</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Você ainda não está matriculado em nenhuma turma ou não possui notas lançadas.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
             <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Meu Boletim</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhe seu desempenho escolar por unidade.</p>
            </div>

            <ul className="space-y-6">
                {Object.entries(gradeReport).map(([classId, classReport]) => (
                    <li key={classId}>
                        <ClassReportCard classId={classId} classReport={classReport} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Boletim;
