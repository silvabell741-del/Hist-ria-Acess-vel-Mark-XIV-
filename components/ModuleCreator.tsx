
import React, { useState, useEffect, useContext, useCallback } from 'react';
import type { Module, ModulePage, ModulePageContent, ModulePageContentType } from '../types';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { ICONS, SpinnerIcon } from '../constants/index';
import { TeacherDataContext } from '../contexts/TeacherDataContext';
import { AdminDataContext } from '../contexts/AdminDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useSettings } from '../contexts/SettingsContext';
// REMOVIDO: import { GoogleGenAI } from '@google/genai'; (Agora carregado via Dynamic Import)
import { useToast } from '../contexts/ToastContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';

const PROFESSOR_EXIGENTE_SYSTEM_PROMPT = `Sua escrita é clara, direta e exigente, valorizando a lucidez e o rigor conceitual. O texto deve ensinar com precisão, sem introduções típicas de IA e sem frases automáticas como “Olá” ou “como uma inteligência artificial”. O estilo é objetivo, culto e sem sentimentalismo, com frases curtas e transições lógicas. Evite linguagem opinativa e adjetivação emocional. Ao escrever materiais didáticos, mantenha organização modular: use títulos e subtítulos curtos, explicações diretas e, quando necessário, exemplos históricos precisos e contextualizados. A linguagem deve ser acessível para estudantes do ensino fundamental II e médio, mas sem subestimar o leitor — explique os conceitos de modo que o aluno perceba complexidade e seriedade no conteúdo. Prefira verbos de ação e tom analítico. Evite analogias forçadas ou tentativas de “deixar o texto leve”. O tom geral deve transmitir a sensação de um professor que respeita a inteligência do aluno e ensina com clareza, firmeza e propósito. Em suma: seja preciso, lúcido e didático, sem perder densidade histórica.`;

// Helper to extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const SafeImage: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    // Reset error state when src changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    if (hasError || !src) {
        return (
            <div className={`${className} flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg aspect-video`}>
                <div className="text-center p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xs mt-1 font-semibold">Imagem inválida</p>
                </div>
            </div>
        );
    }
    
    return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setHasError(true)} crossOrigin="anonymous" />;
};


const VideoPreview: React.FC<{ url: string }> = ({ url }) => {
    const videoId = getYouTubeVideoId(url);

    if (!url || !url.trim()) {
        return (
            <div className="mt-2 h-24 w-full bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center text-xs text-slate-400">
                A pré-visualização do vídeo aparecerá aqui.
            </div>
        );
    }

    if (!videoId) {
        return (
            <div className="mt-2 h-24 w-full bg-yellow-50 dark:bg-yellow-900/20 rounded-md flex flex-col items-center justify-center text-xs text-yellow-600 dark:text-yellow-400 p-2 text-center">
                <p className="font-semibold">URL do YouTube inválida.</p>
                <p>Verifique se o link está correto (ex: youtube.com/watch?v=...)</p>
            </div>
        );
    }

    return (
        <div className="mt-2 aspect-video">
            <iframe
                className="w-full h-full rounded-lg shadow-md"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
            ></iframe>
        </div>
    );
};


const InputField: React.FC<{ 
    label: string, 
    required?: boolean, 
    children: React.ReactNode, 
    helperText?: string,
    inputId?: string,
    helperId?: string
}> = ({ label, required, children, helperText, inputId, helperId }) => (
    <div>
        <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary"
        >
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {helperText && (
            <p 
                id={helperId} 
                className="mt-1 text-xs text-gray-500 dark:text-slate-400 hc-text-secondary"
            >
                {helperText}
            </p>
        )}
    </div>
);

const SelectField: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode }> = ({ value, onChange, children }) => (
    <select value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
        {children}
    </select>
);

const BLOCK_CONFIG: { type: ModulePageContentType, label: string, icon: React.ReactNode }[] = [
    { type: 'title', label: 'Título', icon: ICONS.block_title },
    { type: 'paragraph', label: 'Parágrafo', icon: ICONS.block_paragraph },
    { type: 'list', label: 'Lista', icon: ICONS.block_list },
    { type: 'quote', label: 'Citação', icon: ICONS.block_quote },
    { type: 'image', label: 'Imagem', icon: ICONS.block_image },
    { type: 'video', label: 'Vídeo', icon: ICONS.block_video },
    { type: 'divider', label: 'Linha Divisória', icon: ICONS.block_divider },
];

const AlignmentControls: React.FC<{ onAlignChange: (align: 'left' | 'center' | 'justify') => void; currentAlign?: string; }> = ({ onAlignChange, currentAlign }) => (
    <div className="flex items-center space-x-1">
        {(['left', 'center', 'justify'] as const).map(align => (
            <button
                key={align}
                type="button"
                onClick={() => onAlignChange(align)}
                className={`p-1.5 rounded-md ${currentAlign === align ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-300' : 'hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                aria-pressed={currentAlign === align}
                aria-label={`Alinhar ${align}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {align === 'left' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h16" />}
                    {align === 'center' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M7 14h10M4 18h16" />}
                    {align === 'justify' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />}
                </svg>
            </button>
        ))}
    </div>
);

const ColorPicker: React.FC<{
    color?: string;
    onColorChange: (color: string) => void;
    onColorReset: () => void;
}> = ({ color, onColorChange, onColorReset }) => {
    const { theme } = useSettings();
    const id = React.useId();
    const defaultColor = theme === 'dark' ? '#FFFFFF' : '#191970';
    const displayColor = color || defaultColor;

    return (
        <div className="flex items-center space-x-2">
            <label htmlFor={id} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Cor
            </label>
            <input
                id={id}
                type="color"
                value={displayColor}
                onChange={e => onColorChange(e.target.value)}
                className="w-7 h-7 p-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md cursor-pointer"
                title="Selecionar cor do texto"
            />
            {color && (
                <button
                    type="button"
                    onClick={onColorReset}
                    className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"
                    aria-label="Resetar cor do texto"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            )}
        </div>
    );
};


const BlockWrapper: React.FC<{
    children: React.ReactNode;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ children, onMoveUp, onMoveDown, onRemove, isFirst, isLast }) => (
    <div className="p-4 bg-slate-50 border rounded-lg relative group dark:bg-slate-700/50 dark:border-slate-700 hc-bg-override hc-border-override">
        {children}
        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={onMoveUp} disabled={isFirst} aria-label="Mover bloco para cima" className="p-1.5 bg-white border rounded-md shadow-sm disabled:opacity-30 dark:bg-slate-600 dark:border-slate-500 hc-button-override"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
            <button type="button" onClick={onMoveDown} disabled={isLast} aria-label="Mover bloco para baixo" className="p-1.5 bg-white border rounded-md shadow-sm disabled:opacity-30 dark:bg-slate-600 dark:border-slate-500 hc-button-override"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
            <button type="button" onClick={onRemove} aria-label="Remover bloco" className="p-1.5 bg-red-500 text-white border rounded-md shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
    </div>
);

const ImagePreview: React.FC<{ src: string }> = ({ src }) => {
    const [error, setError] = useState(false);
    
    useEffect(() => {
        setError(false);
    }, [src]);

    if (!src || !src.trim()) {
        return (
             <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center text-xs text-slate-400">
                A pré-visualização aparecerá aqui.
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-24 w-full bg-red-50 dark:bg-red-900/20 rounded-md flex flex-col items-center justify-center text-xs text-red-600 dark:text-red-400 p-2 text-center">
                <p className="font-semibold">Falha ao carregar a imagem.</p>
                <p>Verifique se a URL é um link direto para um arquivo de imagem (ex: .jpg, .png).</p>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt="Pré-visualização da imagem"
            className="max-h-40 w-auto rounded-md border bg-slate-100 dark:bg-slate-800"
            onError={() => setError(true)}
            loading="lazy"
        />
    );
};


const ModuleCreator: React.FC = () => {
    const { user, userRole } = useAuth();
    const isTeacher = userRole === 'professor';

    const teacherCtx = useContext(TeacherDataContext);
    const adminCtx = useContext(AdminDataContext);

    const contextData = isTeacher ? teacherCtx : adminCtx;

    const { setCurrentPage, editingModule, exitEditingModule } = useNavigation();
    const { theme } = useSettings();
    const { addToast } = useToast();

    // Module Metadata State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [series, setSeries] = useState('6º Ano');
    const [materia, setMateria] = useState('História');
    const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Fácil');
    const [duration, setDuration] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    
    // Module Content State
    const [pages, setPages] = useState<ModulePage[]>([{ id: Date.now(), title: 'Página 1', content: [] }]);
    const [isLoadingContent, setIsLoadingContent] = useState(false);

    // AI Content Generation State
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiGenerationTarget, setAIGenerationTarget] = useState<{ pageId: number | null }>({ pageId: null });
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiBlockType, setAiBlockType] = useState<ModulePageContentType>('paragraph');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<string | string[] | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // AI Transcription State
    const [isTranscriptionModalOpen, setIsTranscriptionModalOpen] = useState(false);
    const [transcriptionText, setTranscriptionText] = useState('');
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [correctedText, setCorrectedText] = useState<string | null>(null);

    useEffect(() => {
        if (editingModule) {
            setTitle(editingModule.title);
            setDescription(editingModule.description || '');
            setCoverImageUrl(editingModule.coverImageUrl || '');
            setVideoUrl(editingModule.videoUrl || '');
            setSeries(editingModule.series as string || '6º Ano');
            setMateria(editingModule.materia as string || 'História');
            setDifficulty(editingModule.difficulty || 'Fácil');
            setDuration(editingModule.duration || '');
            setSelectedClassIds(editingModule.classIds || []);
            
            const loadPages = async () => {
                if (editingModule.pages && editingModule.pages.length > 0) {
                    setPages(JSON.parse(JSON.stringify(editingModule.pages)));
                } else {
                    // Try to fetch content from split collection
                    setIsLoadingContent(true);
                    try {
                        const docRef = doc(db, 'module_contents', editingModule.id);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists() && docSnap.data().pages) {
                            setPages(docSnap.data().pages);
                        } else {
                            // Fallback if no content found (new empty module)
                            setPages([{ id: Date.now(), title: 'Página 1', content: [] }]);
                        }
                    } catch (err) {
                        console.error("Error fetching split module content:", err);
                        addToast("Erro ao carregar o conteúdo do módulo.", "error");
                        setPages([{ id: Date.now(), title: 'Página 1', content: [] }]);
                    } finally {
                        setIsLoadingContent(false);
                    }
                }
            };
            loadPages();
        }
    }, [editingModule, addToast]);

    if (!contextData) {
        return (
            <Card>
                <p className="text-red-500">Erro: Contexto de dados não encontrado para o papel do usuário.</p>
            </Card>
        );
    }
    
    const { teacherClasses, handleSaveModule, handleUpdateModule, isSubmitting: isSaving } = contextData;
    const isEditMode = !!editingModule;

    const handleClassSelection = (classId: string) => {
        setSelectedClassIds(prev =>
            prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId]
        );
    };

    const addPage = () => {
        setPages(prev => [...prev, { id: Date.now(), title: `Página ${prev.length + 1}`, content: [] }]);
    };
    
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

    const openAIModal = (pageId: number) => {
        setAIGenerationTarget({ pageId });
        setIsAIModalOpen(true);
    };

    const closeAIModal = useCallback(() => {
        setIsAIModalOpen(false);
        setAIGenerationTarget({ pageId: null });
        setAiPrompt('');
        setAiBlockType('paragraph');
        setGeneratedContent(null);
        setGenerationError(null);
        setIsGenerating(false);
    }, []);

    const handleGenerateAIContent = async () => {
        if (!aiPrompt || isGenerating) return;
        setIsGenerating(true);
        setGeneratedContent(null);
        setGenerationError(null);
        try {
            // Lazy Loading da Biblioteca de IA
            const { GoogleGenAI } = await import('@google/genai');
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const blockTypeLabel = BLOCK_CONFIG.find(b => b.type === aiBlockType)?.label || aiBlockType;
            const userPrompt = `Gere um conteúdo do tipo "${blockTypeLabel}" sobre o seguinte tópico: "${aiPrompt}". A resposta deve ser direta e pronta para ser usada em uma aula. - Se for uma lista, retorne cada item em uma nova linha, sem marcadores. - Se for um título, retorne apenas o texto do título. - Se for um parágrafo, retorne um texto coeso. - Se for uma citação, retorne apenas o texto da citação, sem aspas.`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: userPrompt,
              config: {
                systemInstruction: PROFESSOR_EXIGENTE_SYSTEM_PROMPT
              }
            });
            
            const text = response.text;
            if (!text) throw new Error("Resposta vazia da IA");

            if (aiBlockType === 'list') {
                setGeneratedContent(text.split('\n').filter(item => item.trim() !== ''));
            } else {
                setGeneratedContent(text);
            }
        } catch (error) {
            console.error("Error generating AI content:", error);
            setGenerationError("Não foi possível gerar o conteúdo. Verifique sua conexão e tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const addAIGeneratedContent = () => {
        if (!generatedContent || aiGenerationTarget.pageId === null) return;

        const newBlock: ModulePageContent = {
            type: aiBlockType,
            content: generatedContent,
            align: 'left',
        };

        setPages(prev => prev.map(p =>
            p.id === aiGenerationTarget.pageId ? { ...p, content: [...p.content, newBlock] } : p
        ));
        
        closeAIModal();
    };

    const handleCorrectTranscription = async () => {
        if (!transcriptionText.trim() || isCorrecting) return;
        setIsCorrecting(true);
        setCorrectedText(null);
        try {
            // Lazy Loading da Biblioteca de IA
            const { GoogleGenAI } = await import('@google/genai');
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Corrija o seguinte texto, que é uma transcrição de voz. Foque apenas em pontuação, capitalização e erros gramaticais claros. Mantenha o estilo e a voz original. Não adicione, remova ou altere o conteúdo ou as ideias. Retorne apenas o texto corrigido.\n\nTexto original:\n"${transcriptionText}"`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setCorrectedText(response.text);
        } catch (error) {
            addToast("Erro ao corrigir a transcrição.", "error");
            console.error(error);
        } finally {
            setIsCorrecting(false);
        }
    };

    const closeTranscriptionModal = useCallback(() => {
        setIsTranscriptionModalOpen(false);
        setTranscriptionText('');
        setCorrectedText(null);
    }, []);
    
    const validatePages = (): { isValid: boolean; error?: 'image' | 'video' } => {
        for (const page of pages) {
            for (const block of page.content) {
                if (block.type === 'image') {
                    if (!(block.content as string)?.trim() || !block.alt?.trim()) {
                        return { isValid: false, error: 'image' };
                    }
                }
                if (block.type === 'video') {
                    if (!getYouTubeVideoId(block.content as string)) {
                        return { isValid: false, error: 'video' };
                    }
                }
            }
        }
        return { isValid: true };
    };

    const handleSave = async () => {
        if (isSaving) return;
        
        // 1. Determine Visibility & Validation based on Role
        const visibility: 'public' | 'specific_class' = isTeacher ? 'specific_class' : 'public';

        // 2. Teacher Strict Validation: Must select a class for Private Modules
        if (visibility === 'specific_class' && selectedClassIds.length === 0) {
            addToast('Erro: Professores devem selecionar pelo menos uma turma para criar um módulo privado.', 'error');
            return;
        }

        const areMetadataFieldsValid = title && series && materia && difficulty;
        if (!areMetadataFieldsValid) {
            addToast('Por favor, preencha todos os campos obrigatórios (Título, Série, Matéria, Dificuldade).', 'error');
            return;
        }

        const validationResult = validatePages();
        if (!validationResult.isValid) {
            if (validationResult.error === 'image') {
                addToast('Por favor, preencha a URL e a descrição para todas as imagens adicionadas.', 'error');
            } else if (validationResult.error === 'video') {
                addToast('Por favor, verifique se todos os links de vídeo são URLs válidas do YouTube.', 'error');
            } else {
                 addToast('Verifique o conteúdo das páginas. Campos obrigatórios podem estar faltando.', 'error');
            }
            return;
        }

        // 3. Construct Payload
        const moduleData: any = {
            title, description, coverImageUrl, videoUrl, series, materia, difficulty, duration,
            visibility, // Enforced strictly
            pages,
            quiz: editingModule?.quiz || [],
            status: editingModule?.status || 'Ativo',
            classIds: visibility === 'specific_class' ? selectedClassIds : [], // Ensure empty if public
        };

        if (isEditMode) {
            const updatedModule = {
                ...moduleData,
                id: editingModule.id,
                creatorId: editingModule.creatorId,
            };
            await handleUpdateModule(updatedModule as Module);
            exitEditingModule();
        } else {
            const newModule = {
                ...moduleData,
                creatorId: user?.id,
            };
            const success = await handleSaveModule(newModule as Omit<Module, 'id'>);
            if (success) {
                setCurrentPage(isTeacher ? 'modules' : 'admin_modules');
            }
        }
    };
    
    const handleCancel = () => {
        if (isEditMode) {
            exitEditingModule();
        } else {
            setCurrentPage(isTeacher ? 'teacher_dashboard' : 'admin_modules');
        }
    };

    const renderBlock = (pageId: number, block: ModulePageContent, index: number) => {
        const page = pages.find(p => p.id === pageId);
        if (!page) return null;

        const isFirst = index === 0;
        const isLast = index === page.content.length - 1;

        const inputClasses = "w-full p-2 border-gray-300 rounded-md bg-white text-black dark:bg-slate-800 dark:border-slate-600 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500";
        const hasAlignment = block.type === 'title' || block.type === 'paragraph';
        const hasTextColorControl = block.type === 'title' || block.type === 'paragraph' || block.type === 'list' || block.type === 'quote';

        const isLight = theme === 'light';
        const colorIsWhite = block.color?.toLowerCase() === '#ffffff' || block.color?.toLowerCase() === 'white';
        
        let finalColor = block.color;
        if (isLight) {
            if (!finalColor || colorIsWhite) {
                finalColor = '#191970';
            }
        }
        const textStyle = { color: finalColor };
        
        // Image block helpers
        const imageInputId = `img-url-${pageId}-${index}`;
        const imageHelperId = `img-helper-${pageId}-${index}`;

        const content = (
            <div className="space-y-2">
                {block.type === 'title' && <input type="text" placeholder="Título" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} style={textStyle} className={`${inputClasses} text-2xl font-bold`} />}
                {block.type === 'paragraph' && <textarea placeholder="Parágrafo" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} rows={4} style={textStyle} className={`${inputClasses}`} />}
                {block.type === 'list' && <textarea placeholder="Um item por linha" value={(block.content as string[]).join('\n')} onChange={e => updateBlock(pageId, index, { content: e.target.value.split('\n') })} rows={4} style={textStyle} className={`${inputClasses}`} />}
                {block.type === 'quote' && <textarea placeholder="Citação" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} rows={2} style={textStyle} className={`${inputClasses} border-l-4 border-slate-300 dark:border-slate-500 italic`} />}
                {block.type === 'image' && (
                    <div className="space-y-4">
                        <InputField label="URL da Imagem" required>
                            <input type="text" placeholder="https://exemplo.com/imagem.jpg" value={block.content as string} onChange={e => updateBlock(pageId, index, { content: e.target.value })} className={inputClasses} />
                        </InputField>
                        <InputField 
                            label="Descrição da Imagem (Texto Alternativo)" 
                            required 
                            helperText="Descreva a imagem para acessibilidade. Esta descrição será lida por leitores de tela."
                            inputId={imageInputId}
                            helperId={imageHelperId}
                        >
                            <input 
                                id={imageInputId}
                                type="text" 
                                placeholder="Ex: Pintura da Tomada da Bastilha em 1789." 
                                value={block.alt || ''} 
                                onChange={e => updateBlock(pageId, index, { alt: e.target.value })} 
                                className={inputClasses} 
                                aria-describedby={imageHelperId}
                            />
                        </InputField>
                        <div className="mt-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Pré-visualização:</p>
                            <ImagePreview src={block.content as string} />
                        </div>
                    </div>
                )}
                {block.type === 'video' && (
                    <div className="space-y-2">
                        <InputField label="URL do Vídeo (YouTube)" required>
                            <input
                                type="text"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={block.content as string}
                                onChange={e => updateBlock(pageId, index, { content: e.target.value })}
                                className={inputClasses}
                            />
                        </InputField>
                        <VideoPreview url={block.content as string} />
                    </div>
                )}
                {block.type === 'divider' && <div className="w-full h-px bg-slate-300 dark:bg-slate-600 my-4" />}

                {(hasAlignment || hasTextColorControl) && (
                     <div className="pt-2 flex justify-between items-center">
                        <div>
                            {hasAlignment && (
                                <AlignmentControls 
                                    onAlignChange={(align) => updateBlock(pageId, index, { align })} 
                                    currentAlign={block.align} 
                                />
                            )}
                        </div>
                        <div>
                            {hasTextColorControl && (
                                <ColorPicker
                                    color={block.color}
                                    onColorChange={(color) => updateBlock(pageId, index, { color })}
                                    onColorReset={() => updateBlock(pageId, index, { color: undefined })}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        );

        return (
            <BlockWrapper
                onMoveUp={() => moveBlock(pageId, index, 'up')}
                onMoveDown={() => moveBlock(pageId, index, 'down')}
                onRemove={() => removeBlock(pageId, index)}
                isFirst={isFirst}
                isLast={isLast}
            >
                {content}
            </BlockWrapper>
        );
    }

    if (isLoadingContent) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center space-y-4">
                    <SpinnerIcon className="h-12 w-12 text-indigo-600" />
                    <p className="text-slate-500">Carregando conteúdo do módulo para edição...</p>
                </div>
            </div>
        );
    }

    const isFormValid = title.trim() !== '' && series !== '' && materia !== '' && difficulty !== '' && (!isTeacher || selectedClassIds.length > 0);

    return (
        <div className="space-y-6">
            {isAIModalOpen && (
                <Modal isOpen={isAIModalOpen} onClose={closeAIModal} title="Gerar Conteúdo com IA">
                    <div className="space-y-4">
                        <InputField label="Descreva o conteúdo que você deseja criar" required>
                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                rows={4}
                                placeholder="Ex: um resumo sobre a Revolução Industrial para o 8º ano"
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                autoFocus
                            />
                        </InputField>
                         <InputField label="Tipo de Bloco" required>
                             <select
                                 value={aiBlockType}
                                 onChange={e => setAiBlockType(e.target.value as ModulePageContentType)}
                                 className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                             >
                                 {BLOCK_CONFIG.filter(b => !['image', 'video', 'divider'].includes(b.type)).map(config => (
                                     <option key={config.type} value={config.type}>{config.label}</option>
                                 ))}
                            </select>
                        </InputField>
                        <button
                            onClick={handleGenerateAIContent}
                            disabled={!aiPrompt.trim() || isGenerating}
                            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override"
                        >
                            {isGenerating ? <SpinnerIcon className="h-5 w-5 text-indigo-900 dark:text-white" /> : <div className="h-5 w-5">{ICONS.ai_generate}</div>}
                            <span className="ml-2">{isGenerating ? 'Gerando...' : 'Gerar'}</span>
                        </button>

                        {generationError && <p className="text-sm text-red-500 text-center">{generationError}</p>}
                        
                        {generatedContent && (
                            <div className="mt-4 p-4 border-t dark:border-slate-700 space-y-4">
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200">Conteúdo Gerado:</h4>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md max-h-48 overflow-y-auto border dark:border-slate-600">
                                    {Array.isArray(generatedContent) ? (
                                        <ul className="list-disc list-inside">
                                            {generatedContent.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{generatedContent}</p>
                                    )}
                                </div>
                                <button onClick={addAIGeneratedContent} className="w-full flex items-center justify-center px-4 py-2 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40 hc-button-primary-override">
                                    Adicionar ao Módulo
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {isTranscriptionModalOpen && (
                 <Modal isOpen={isTranscriptionModalOpen} onClose={closeTranscriptionModal} title="Transcrição com IA">
                    <div className="space-y-4">
                        <InputField label="Cole ou dite o texto para correção" required>
                             <textarea
                                value={transcriptionText}
                                onChange={e => setTranscriptionText(e.target.value)}
                                rows={6}
                                placeholder="A IA fará correções mínimas de pontuação e gramática, ideal para limpar textos ditados por voz."
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                autoFocus
                            />
                        </InputField>
                        <button
                            onClick={handleCorrectTranscription}
                            disabled={!transcriptionText.trim() || isCorrecting}
                            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600 hc-button-primary-override"
                        >
                            {isCorrecting ? <SpinnerIcon className="h-5 w-5 text-indigo-900 dark:text-white" /> : null}
                            <span className="ml-2">{isCorrecting ? 'Corrigindo...' : 'Corrigir Texto'}</span>
                        </button>
                        {correctedText && (
                            <div className="mt-4 p-4 border-t dark:border-slate-700 space-y-4">
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200">Texto Corrigido:</h4>
                                <p className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md max-h-48 overflow-y-auto border dark:border-slate-600 text-sm whitespace-pre-wrap">{correctedText}</p>
                                <button onClick={() => { setDescription(correctedText); closeTranscriptionModal(); }} className="w-full flex items-center justify-center px-4 py-2 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40 hc-button-primary-override">
                                    Usar este texto na descrição
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            <div className="flex justify-between items-center -mb-2">
                <div>
                     <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{isEditMode ? 'Editar Módulo' : 'Criar Módulo'}</h2>
                     <p className="text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">{isEditMode ? 'Altere os detalhes deste módulo.' : 'Crie conteúdo educacional interativo com formatação rica.'}</p>
                </div>
                <button type="button" onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override">
                    Voltar
                </button>
            </div>

            <fieldset disabled={isSaving}>
                <Card>
                    <div className="flex items-center justify-between border-b dark:border-slate-700 pb-4 mb-6 hc-border-override">
                        <h3 className="flex items-center text-lg font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                            Informações do Módulo
                        </h3>
                        <button type="button" onClick={() => setIsTranscriptionModalOpen(true)} className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg dark:bg-indigo-900/50 dark:text-indigo-200 dark:hover:bg-indigo-900">
                           <span>Transcrição com IA</span>
                        </button>
                    </div>
                    <div className="space-y-6">
                        <InputField label="URL da Imagem de Capa" helperText="Cole o link completo da imagem que será exibida como capa do módulo">
                            <input type="text" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </InputField>

                        {coverImageUrl && (
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 hc-text-secondary">
                                    Pré-visualização do Card
                                </label>
                                <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-md flex overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <div className="w-1/3 flex-shrink-0">
                                        <SafeImage
                                            src={coverImageUrl}
                                            alt={`Capa do módulo ${title || 'novo'}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="w-2/3 p-3 flex flex-col">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={title || "Título do Módulo"}>
                                            {title || "Título do Módulo"}
                                        </h3>
                                        <div className="flex items-center flex-wrap gap-1 mt-1 text-xs font-medium">
                                            {series && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{series}</span>}
                                            {materia && <span className={`px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300`}>{materia}</span>}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 flex-grow line-clamp-2">
                                            {description || "Descrição do módulo aparecerá aqui..."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <InputField label="URL do Vídeo no YouTube (opcional)">
                            <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </InputField>
                        <InputField label="Título do Módulo" required>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </InputField>
                        <InputField label="Descrição / Resumo do módulo...">
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </InputField>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField label="Série" required>
                                <SelectField value={series} onChange={e => setSeries(e.target.value)}>
                                    <option>6º Ano</option>
                                    <option>7º Ano</option>
                                    <option>8º Ano</option>
                                    <option>9º Ano</option>
                                    <option>1º Ano (Ensino Médio)</option>
                                    <option>2º Ano (Ensino Médio)</option>
                                    <option>3º Ano (Ensino Médio)</option>
                                </SelectField>
                            </InputField>
                            <InputField label="Matéria" required>
                                <SelectField value={materia} onChange={e => setMateria(e.target.value)}>
                                    <option>Artes</option>
                                    <option>Biologia</option>
                                    <option>Ciências</option>
                                    <option>Educação Física</option>
                                    <option>Espanhol</option>
                                    <option>Filosofia</option>
                                    <option>Física</option>
                                    <option>Geografia</option>
                                    <option>História</option>
                                    <option>História Sergipana</option>
                                    <option>Inglês</option>
                                    <option>Matemática</option>
                                    <option>Português / Literatura</option>
                                    <option>Química</option>
                                    <option>Sociologia</option>
                                    <option>Tecnologia / Informática</option>
                                </SelectField>
                            </InputField>
                            <InputField label="Dificuldade" required><SelectField value={difficulty} onChange={e => setDifficulty(e.target.value as any)}><option>Fácil</option><option>Médio</option><option>Difícil</option></SelectField></InputField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Duração Estimada (ex: 45min)"><input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" /></InputField>
                             <InputField label="Visibilidade">
                                <div className="p-2 border border-gray-300 rounded-md bg-slate-50 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300">
                                    {isTeacher ? 'Privado (Turma Específica)' : 'Público (Todos os Usuários)'}
                                </div>
                            </InputField>
                        </div>
                        {isTeacher && (
                            <InputField label="Selecione a(s) Turma(s) - Obrigatório" required>
                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md dark:border-slate-600 bg-white dark:bg-slate-700">
                                    {teacherClasses.length === 0 ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma turma encontrada. Crie uma turma em "Minhas Turmas" primeiro.</p>
                                    ) : (
                                        teacherClasses.map(c => (
                                            <label key={c.id} className="flex items-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClassIds.includes(c.id)}
                                                    onChange={() => handleClassSelection(c.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="ml-3 text-sm text-gray-700 dark:text-slate-300">{c.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </InputField>
                        )}
                    </div>
                </Card>

                <Card>
                    <div className="flex justify-between items-center border-b dark:border-slate-700 pb-4 mb-6 hc-border-override">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Páginas do Módulo</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 hc-text-secondary">Adicione blocos de conteúdo: textos, imagens, vídeos e mais</p>
                        </div>
                        <button type="button" onClick={addPage} className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            <span>Nova Página</span>
                        </button>
                    </div>
                    <div className="space-y-6">
                        {pages.map((page, pageIndex) => (
                            <Card key={page.id} className="bg-white border dark:bg-slate-900/50 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200 hc-text-primary">{page.title}</h4>
                                    <button type="button" onClick={() => removePage(page.id)} disabled={pages.length <= 1} className="flex items-center space-x-2 text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed dark:text-red-400 dark:hover:text-red-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        <span>Excluir Página</span>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {page.content.map((block, i) => renderBlock(page.id, block, i))}
                                </div>
                                <div className="mt-6 flex items-center justify-between border-t dark:border-slate-700 pt-4 hc-border-override">
                                     <div className="flex flex-wrap gap-2">
                                        {BLOCK_CONFIG.map(config => (
                                            <button key={config.type} type="button" onClick={() => addBlock(page.id, config.type)} className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 hc-button-override">
                                                {config.icon}
                                                <span>{config.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openAIModal(page.id)}
                                        className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-100 border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-md hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30 dark:hover:bg-indigo-500/30 hc-button-override"
                                    >
                                        {ICONS.ai_generate}
                                        <span>Gerar com IA</span>
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </Card>
            </fieldset>

            <div className="flex justify-end space-x-4">
                <button onClick={handleCancel} className="px-6 py-2 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override">
                    Cancelar
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={!isFormValid || isSaving} 
                    aria-busy={isSaving}
                    className="px-6 py-2 bg-green-200 text-green-900 font-semibold rounded-lg hover:bg-green-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dark:bg-green-500/30 dark:text-green-200 dark:hover:bg-green-500/40 hc-button-primary-override"
                >
                     {isSaving ? <SpinnerIcon className="h-5 w-5 text-green-900 dark:text-green-200" /> : <div className="h-5 w-5">{ICONS.plus}</div>}
                    <span>{isSaving ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Salvar Módulo')}</span>
                </button>
            </div>
        </div>
    );
};

export default ModuleCreator;