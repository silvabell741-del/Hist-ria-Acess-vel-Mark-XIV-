
import React, { useState, useEffect, useContext, useCallback } from 'react';
import type { Module, ModulePage, ModulePageContent, ModulePageContentType } from '../types';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { ICONS, SpinnerIcon } from '../constants/index';
import { AdminDataContext } from '../contexts/AdminDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';

// List of subjects for Admins
const ADMIN_SUBJECTS = [
    'Artes', 'Biologia', 'Ciências', 'Educação Física', 'Espanhol', 'Filosofia', 'Física', 
    'Geografia', 'História', 'História Sergipana', 'Inglês', 'Matemática', 
    'Português / Literatura', 'Química', 'Sociologia', 'Tecnologia / Informática'
];

const SCHOOL_YEARS = [
    "6º Ano", "7º Ano", "8º Ano", "9º Ano",
    "1º Ano (Ensino Médio)", "2º Ano (Ensino Médio)", "3º Ano (Ensino Médio)",
];

const InputField: React.FC<{ label: string, required?: boolean, children: React.ReactNode, helperText?: string }> = ({ label, required, children, helperText }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {helperText && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 hc-text-secondary">{helperText}</p>}
    </div>
);

const SelectField: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode }> = ({ value, onChange, children }) => (
    <select value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
        {children}
    </select>
);

const MultiSelect: React.FC<{
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label: string;
}> = ({ options, selected, onChange, label }) => {
    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
            <div className="p-3 border border-gray-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map(option => (
                    <label key={option} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-600 rounded">
                        <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={() => toggleOption(option)}
                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 dark:bg-slate-600 dark:border-slate-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{option}</span>
                    </label>
                ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected.length === 0 ? 'Nenhum selecionado' : `${selected.length} selecionado(s)`}
            </p>
        </div>
    );
};

const BLOCK_CONFIG: { type: ModulePageContentType, label: string, icon: React.ReactNode }[] = [
    { type: 'title', label: 'Título', icon: ICONS.block_title },
    { type: 'paragraph', label: 'Parágrafo', icon: ICONS.block_paragraph },
    { type: 'list', label: 'Lista', icon: ICONS.block_list },
    { type: 'quote', label: 'Citação', icon: ICONS.block_quote },
    { type: 'image', label: 'Imagem', icon: ICONS.block_image },
    { type: 'video', label: 'Vídeo', icon: ICONS.block_video },
    { type: 'divider', label: 'Linha Divisória', icon: ICONS.block_divider },
];

const AdminCreateModule: React.FC = () => {
    const { user } = useAuth();
    const { handleSaveModule, handleUpdateModule, isSubmitting } = useContext(AdminDataContext)!;
    const { setCurrentPage, editingModule, exitEditingModule } = useNavigation();
    const { addToast } = useToast();
    const { theme } = useSettings();

    // Metadata State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil');
    const [duration, setDuration] = useState('');
    
    // Multi-Select State
    const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    
    // Content State
    const [pages, setPages] = useState<ModulePage[]>([{ id: Date.now(), title: 'Página 1', content: [] }]);

    useEffect(() => {
        if (editingModule) {
            setTitle(editingModule.title);
            setDescription(editingModule.description || '');
            setCoverImageUrl(editingModule.coverImageUrl || '');
            setVideoUrl(editingModule.videoUrl || '');
            setDifficulty(editingModule.difficulty || 'Fácil');
            setDuration(editingModule.duration || '');
            
            // Handle Series Multi-select backward compatibility
            if (Array.isArray(editingModule.series)) {
                setSelectedSeries(editingModule.series);
            } else if (editingModule.series) {
                setSelectedSeries([editingModule.series]);
            }

            // Handle Subjects Multi-select backward compatibility
            const subjects = editingModule.subjects || (editingModule.materia ? (Array.isArray(editingModule.materia) ? editingModule.materia : [editingModule.materia]) : []);
            setSelectedSubjects(subjects);

            setPages(editingModule.pages.length > 0 ? JSON.parse(JSON.stringify(editingModule.pages)) : [{ id: Date.now(), title: 'Página 1', content: [] }]);
        } else {
            // Defaults for new module
             setSelectedSeries([SCHOOL_YEARS[0]]);
             setSelectedSubjects(['História']);
        }
    }, [editingModule]);

    const addPage = () => setPages(prev => [...prev, { id: Date.now(), title: `Página ${prev.length + 1}`, content: [] }]);
    
    const removePage = (pageId: number) => {
        if (pages.length > 1) {
            setPages(prev => prev.filter(p => p.id !== pageId).map((p, i) => ({ ...p, title: `Página ${i + 1}` })));
        }
    };

    const addBlock = (pageId: number, type: ModulePageContentType) => {
        const newBlock: ModulePageContent = type === 'list' 
            ? { type, content: ['Novo item'] }
            : type === 'divider'
            ? { type, content: '' }
            : type === 'image'
            ? { type, content: '', alt: '' }
            : type === 'video'
            ? { type, content: '' }
            : { type, content: '', align: 'left' };
        
        setPages(prev => prev.map(p => p.id === pageId ? { ...p, content: [...p.content, newBlock] } : p));
    };

    const updateBlock = (pageId: number, blockIndex: number, newValues: Partial<ModulePageContent>) => {
         setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                const newContent = [...p.content];
                newContent[blockIndex] = { ...newContent[blockIndex], ...newValues };
                return { ...p, content: newContent };
            }
            return p;
        }));
    };

    const removeBlock = (pageId: number, blockIndex: number) => {
        setPages(prev => prev.map(p => p.id === pageId ? { ...p, content: p.content.filter((_, i) => i !== blockIndex) } : p));
    };
    
    const moveBlock = (pageId: number, index: number, direction: 'up' | 'down') => {
        setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                const newContent = [...p.content];
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex >= 0 && targetIndex < newContent.length) {
                    [newContent[index], newContent[targetIndex]] = [newContent[targetIndex], newContent[index]];
                }
                return { ...p, content: newContent };
            }
            return p;
        }));
    };

    const renderBlock = (pageId: number, block: ModulePageContent, index: number) => {
        const inputClasses = "w-full p-2 border-gray-300 rounded-md bg-white text-black dark:bg-slate-800 dark:border-slate-600 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500";
        
        return (
             <div className="p-4 bg-slate-50 border rounded-lg relative group dark:bg-slate-700/50 dark:border-slate-700 hc-bg-override hc-border-override">
                <div className="space-y-2">
                    {block.type === 'title' && <input type="text" placeholder="Título" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} className={`${inputClasses} text-2xl font-bold`} />}
                    {block.type === 'paragraph' && <textarea placeholder="Parágrafo" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} rows={4} className={inputClasses} />}
                    {block.type === 'list' && <textarea placeholder="Um item por linha" value={(block.content as string[]).join('\n')} onChange={e => updateBlock(pageId, index, { content: e.target.value.split('\n') })} rows={4} className={inputClasses} />}
                    {block.type === 'quote' && <textarea placeholder="Citação" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} rows={2} className={`${inputClasses} italic`} />}
                    {block.type === 'image' && (
                        <div className="space-y-2">
                             <input type="text" placeholder="URL da Imagem" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} className={inputClasses} />
                             <input type="text" placeholder="Descrição da Imagem" value={block.alt || ''} onChange={e => updateBlock(pageId, index, { alt: e.target.value })} className={inputClasses} />
                        </div>
                    )}
                    {block.type === 'video' && <input type="text" placeholder="URL do Vídeo (YouTube)" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} className={inputClasses} />}
                    {block.type === 'divider' && <div className="w-full h-px bg-slate-300 dark:bg-slate-600 my-4" />}
                </div>
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button type="button" onClick={() => moveBlock(pageId, index, 'up')} disabled={index === 0} className="p-1.5 bg-white border rounded-md shadow-sm disabled:opacity-30 dark:bg-slate-600 dark:border-slate-500 hc-button-override">↑</button>
                     <button type="button" onClick={() => moveBlock(pageId, index, 'down')} disabled={index === pages.find(p => p.id === pageId)!.content.length - 1} className="p-1.5 bg-white border rounded-md shadow-sm disabled:opacity-30 dark:bg-slate-600 dark:border-slate-500 hc-button-override">↓</button>
                     <button type="button" onClick={() => removeBlock(pageId, index)} className="p-1.5 bg-red-500 text-white border rounded-md shadow-sm">×</button>
                </div>
            </div>
        );
    };

    const handleSave = async () => {
        if (!title || selectedSeries.length === 0 || selectedSubjects.length === 0 || isSubmitting) {
            addToast("Preencha todos os campos obrigatórios (Título, Série e Matéria).", "error");
            return;
        }

        const moduleData: any = {
            title, description, coverImageUrl, videoUrl, difficulty, duration,
            pages,
            visibility: 'public',
            classIds: [], // Admins create public modules, no specific class ID.
            status: 'Ativo',
            series: selectedSeries, // Saving as array
            materia: selectedSubjects, // Saving as array (mapping subjects to materia field for now, or use new field)
            subjects: selectedSubjects // Saving as explicit array
        };

        if (editingModule) {
            await handleUpdateModule({ ...moduleData, id: editingModule.id, creatorId: editingModule.creatorId });
            exitEditingModule();
        } else {
            const success = await handleSaveModule({ ...moduleData, creatorId: user?.id });
            if (success) setCurrentPage('admin_modules');
        }
    };

    const handleCancel = () => {
        if (editingModule) exitEditingModule();
        else setCurrentPage('admin_modules');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <div>
                     <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">
                        {editingModule ? 'Editar Módulo (Admin)' : 'Criar Módulo (Admin)'}
                    </h2>
                     <p className="text-slate-500 dark:text-slate-400 mt-1">Modo Administrador: Múltiplas séries e matérias.</p>
                </div>
                <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hc-button-override">Voltar</button>
            </div>

            <Card>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6">Informações do Módulo</h3>
                <div className="space-y-6">
                    <InputField label="Título" required>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>
                    <InputField label="Descrição">
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>
                    <InputField label="Imagem de Capa (URL)">
                        <input type="text" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MultiSelect 
                            label="Séries (Multi-seleção)" 
                            options={SCHOOL_YEARS} 
                            selected={selectedSeries} 
                            onChange={setSelectedSeries} 
                        />
                        <MultiSelect 
                            label="Matérias (Multi-seleção)" 
                            options={ADMIN_SUBJECTS} 
                            selected={selectedSubjects} 
                            onChange={setSelectedSubjects} 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputField label="Dificuldade" required>
                             <SelectField value={difficulty} onChange={e => setDifficulty(e.target.value as any)}><option>Fácil</option><option>Médio</option><option>Difícil</option></SelectField>
                         </InputField>
                         <InputField label="Duração">
                             <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                         </InputField>
                    </div>
                </div>
            </Card>

            <Card>
                 <div className="flex justify-between items-center border-b dark:border-slate-700 pb-4 mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Conteúdo</h3>
                    <button onClick={addPage} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hc-button-override">Nova Página</button>
                </div>
                <div className="space-y-6">
                    {pages.map((page, pageIndex) => (
                        <Card key={page.id} className="bg-white border dark:bg-slate-900/50 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200">{page.title}</h4>
                                <button onClick={() => removePage(page.id)} disabled={pages.length <= 1} className="text-sm text-red-600 font-semibold hover:underline disabled:opacity-50">Excluir Página</button>
                            </div>
                            <div className="space-y-4">
                                {page.content.map((block, i) => renderBlock(page.id, block, i))}
                            </div>
                             <div className="mt-6 flex flex-wrap gap-2 border-t dark:border-slate-700 pt-4">
                                {BLOCK_CONFIG.map(config => (
                                    <button key={config.type} type="button" onClick={() => addBlock(page.id, config.type)} className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override">
                                        {config.icon}
                                        <span>{config.label}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            </Card>

            <div className="flex justify-end space-x-4">
                <button onClick={handleCancel} className="px-6 py-2 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hc-button-override">Cancelar</button>
                <button onClick={handleSave} disabled={isSubmitting} className="px-6 py-2 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 disabled:opacity-50 flex items-center space-x-2 dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40 hc-button-primary-override">
                    {isSubmitting ? <SpinnerIcon className="h-5 w-5" /> : ICONS.plus}
                    <span>{isSubmitting ? 'Salvando...' : 'Salvar Módulo'}</span>
                </button>
            </div>
        </div>
    );
};

export default AdminCreateModule;
