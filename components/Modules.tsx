
import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import type { Module, ModuleStatus } from '../types';
import { Card } from './common/Card';
import { ICONS } from '../constants/index';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
// FIX: Import StudentDataContext to be used with useContext.
import { StudentDataContext } from '../contexts/StudentDataContext';
import { TeacherDataContext } from '../contexts/TeacherDataContext';

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ModuleCard: React.FC<{ module: Module; onStartModule: (module: Module) => void; }> = React.memo(({ module, onStartModule }) => {
    
    const isCompleted = module.progress === 100;

    const getButtonText = () => {
        if (isCompleted) {
            return 'Revisar';
        }
        if (module.progress && module.progress > 0) {
            return 'Continuar';
        }
        return 'Iniciar';
    };
    
    const buttonText = getButtonText();

    const difficultyColors: { [key: string]: string } = {
        'Fácil': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
        'Médio': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30',
        'Difícil': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
    };
    const difficultyColor = module.difficulty ? difficultyColors[module.difficulty] : '';
    
    const materiaColorMap: { [key: string]: string } = {
        'História': 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
        'Geografia': 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
        'História Sergipana': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    };
    
    // Handle materia possibly being an array
    const firstMateria = Array.isArray(module.materia) ? module.materia[0] : module.materia;
    const materiaColor = firstMateria ? materiaColorMap[firstMateria] || 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700';
    const displayMateria = Array.isArray(module.materia) ? module.materia.join(', ') : module.materia;
    const displaySeries = Array.isArray(module.series) ? module.series.join(', ') : module.series;


    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md flex flex-col h-full group overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            {/* Image Section */}
            <div className="relative">
                <img 
                    src={module.coverImageUrl || 'https://images.unsplash.com/photo-1519781542343-dc12c611d9e5?q=80&w=800&auto=format&fit=crop'} 
                    alt={`Capa do módulo ${module.title}`} 
                    className="w-full aspect-video object-cover" 
                    loading="lazy" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                {/* Overlays */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    {module.visibility === 'public' && (
                        <span className="text-xs font-bold text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">Público</span>
                    )}
                </div>
                {module.difficulty && (
                    <div className="absolute top-3 right-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${difficultyColor}`}>{module.difficulty}</span>
                    </div>
                )}
                
                {(module.progress !== undefined && module.progress > 0) && (
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                                {isCompleted ? 'Concluído' : 'Progresso'}
                            </span>
                            <span className="text-sm font-bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>{module.progress}%</span>
                        </div>
                        <div className="w-full bg-white/30 rounded-full h-2" role="progressbar" aria-valuenow={module.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso: ${module.progress}%`}>
                            <div className={`${isCompleted ? 'bg-green-400' : 'bg-yellow-400'} h-2 rounded-full`} style={{ width: `${module.progress}%` }}></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 hc-text-primary">{module.title}</h3>
                
                <div className="flex items-center flex-wrap gap-2 mt-3 text-xs font-medium">
                    {displaySeries && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 truncate max-w-[150px]">{displaySeries}</span>}
                    {displayMateria && <span className={`px-2 py-1 rounded ${materiaColor} truncate max-w-[150px]`}>{displayMateria}</span>}
                    {module.duration && (
                        <div className="flex items-center text-slate-500 dark:text-slate-400">
                            <div className="h-5 w-5 mr-1">{ICONS.clock}</div>
                            <span>{module.duration}</span>
                        </div>
                    )}
                </div>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 flex-grow hc-text-secondary">{module.description}</p>
                
                <button
                    onClick={() => onStartModule(module)}
                    className="mt-5 w-full font-bold py-3 px-4 rounded-lg text-white bg-gradient-to-r from-blue-500 to-green-400 hover:from-blue-600 hover:to-green-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center hc-button-primary-override"
                >
                    <PlayIcon />
                    <span>{buttonText}</span>
                </button>
            </div>
        </div>
    );
});


const Modules: React.FC = () => {
    const { user, userRole } = useAuth();

    const studentData = useContext(StudentDataContext);
    const teacherData = useContext(TeacherDataContext);

    const data = userRole === 'aluno' ? studentData : teacherData;
    const modules = data?.modules || [];
    
    const { startModule } = useNavigation();
    
    // Default filtering for students: show only their series if available
    const [selectedSerie, setSelectedSerie] = useState(user?.series || 'all');
    const [selectedMateria, setSelectedMateria] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<ModuleStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [liveRegionText, setLiveRegionText] = useState('');
    const initialLoad = useRef(true);

    // Ensure global modules are loaded if user is a teacher
    useEffect(() => {
        if (userRole === 'professor' && teacherData?.fetchModulesLibrary) {
            teacherData.fetchModulesLibrary();
        }
    }, [userRole, teacherData]);

    const { seriesOptions, materiaOptions } = useMemo(() => {
        const series = new Set<string>();
        const materias = new Set<string>();
        modules.forEach(m => {
            if (Array.isArray(m.series)) {
                m.series.forEach(s => series.add(s));
            } else if (m.series) {
                series.add(m.series);
            }

            if (Array.isArray(m.materia)) {
                m.materia.forEach(s => materias.add(s));
            } else if (m.materia) {
                materias.add(m.materia);
            }
        });
        return {
            seriesOptions: Array.from(series).sort(),
            materiaOptions: Array.from(materias).sort()
        };
    }, [modules]);
    
    const filteredModules = useMemo(() => {
        return modules.filter(module => {
            // Handle both string and array for series
            const moduleSeries = Array.isArray(module.series) ? module.series : (module.series ? [module.series] : []);
            const serieMatch = selectedSerie === 'all' || moduleSeries.includes(selectedSerie);
            
            // Handle both string and array for materia
            const moduleMaterias = Array.isArray(module.materia) ? module.materia : (module.materia ? [module.materia] : []);
            const materiaMatch = selectedMateria === 'all' || moduleMaterias.includes(selectedMateria);
            
            const searchMatch = activeSearch === '' || module.title.toLowerCase().includes(activeSearch.toLowerCase());
            
            let studentStatus: ModuleStatus = 'Não iniciado';
            if (module.progress === 100) {
                studentStatus = 'Concluído';
            } else if (module.progress && module.progress > 0) {
                studentStatus = 'Em progresso';
            }
            const statusMatch = selectedStatus === 'all' || studentStatus === selectedStatus;

            return serieMatch && materiaMatch && statusMatch && searchMatch;
        });
    }, [modules, selectedSerie, selectedMateria, selectedStatus, activeSearch]);

    useEffect(() => {
        if (initialLoad.current) {
            initialLoad.current = false;
            return;
        }
        const count = filteredModules.length;
        setLiveRegionText(`${count} ${count === 1 ? 'módulo encontrado' : 'módulos encontrados'}.`);
    }, [filteredModules]);

    const handleSearch = () => {
        setActiveSearch(searchQuery);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    const filterSelectClasses = "w-full md:w-auto p-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200";

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 flex flex-col md:flex-row flex-wrap items-center gap-4 hc-bg-override hc-border-override">
                <div className="w-full md:flex-1 flex items-stretch min-w-[280px]">
                    <div className="relative flex-grow">
                        <label htmlFor="module-search" className="sr-only">Pesquisar por título</label>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            id="module-search"
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Pesquisar por título..."
                            className="w-full p-2.5 pl-10 border border-r-0 border-slate-300 rounded-l-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:z-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-4 bg-slate-100 text-slate-600 border-t border-b border-r border-slate-300 rounded-r-lg hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:z-10 dark:bg-slate-600 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-500"
                        aria-label="Pesquisar"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                </div>

                <div className="w-full md:w-auto">
                    <label htmlFor="serie-filter" className="sr-only">Filtrar por série</label>
                    <select id="serie-filter" value={selectedSerie} onChange={e => setSelectedSerie(e.target.value)} className={filterSelectClasses}>
                        <option value="all">Todas as séries</option>
                        {seriesOptions.map(s => <option key={s} value={s}>{s}</option>)}
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
                    <label htmlFor="status-filter" className="sr-only">Filtrar por status</label>
                    <select id="status-filter" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as any)} className={filterSelectClasses}>
                        <option value="all">Todos</option>
                        <option value="Não iniciado">Não iniciados</option>
                        <option value="Em progresso">Em progresso</option>
                        <option value="Concluído">Concluídos</option>
                    </select>
                </div>
            </div>
            
            <div className="sr-only" role="status" aria-live="polite">
                {liveRegionText}
            </div>

            {filteredModules.length > 0 ? (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredModules.map(module => (
                        <li key={module.id}>
                            <ModuleCard module={module} onStartModule={startModule} />
                        </li>
                    ))}
                </ul>
            ) : (
                <Card className="text-center py-20">
                    <div className="inline-block bg-slate-100 dark:bg-slate-700/50 rounded-full p-5">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Nenhum módulo encontrado</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm hc-text-secondary">Tente ajustar os filtros de busca.</p>
                </Card>
            )}
        </div>
    );
};

export default Modules;
