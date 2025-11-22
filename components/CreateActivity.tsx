
import React, { useState } from 'react';
import type { Activity, ActivityType, QuizQuestion, Unidade } from '../types';
import { Card } from './common/Card';
import { ICONS, SpinnerIcon } from '../constants/index';
import { useTeacherData } from '../contexts/TeacherDataContext';
import { useNavigation } from '../contexts/NavigationContext';
// REMOVIDO: import { GoogleGenAI } from '@google/genai'; (Agora carregado via Dynamic Import)
import { useToast } from '../contexts/ToastContext';
import { storage } from './firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';

const PROFESSOR_EXIGENTE_SYSTEM_PROMPT = `Sua escrita é clara, direta e exigente, valorizando a lucidez e o rigor conceitual. O texto deve ensinar com precisão, sem introduções típicas de IA e sem frases automáticas como “Olá” ou “como uma inteligência artificial”. O estilo é objetivo, culto e sem sentimentalismo. Prefira frases curtas, ideias bem estruturadas e transições lógicas. Evite linguagem opinativa e adjetivação emocional. Ao escrever materiais didáticos, mantenha organização modular: use títulos e subtítulos curtos, explicações diretas e, quando necessário, exemplos históricos precisos e contextualizados. A linguagem deve ser acessível para estudantes do ensino fundamental II e médio, mas sem subestimar o leitor — explique os conceitos de modo que o aluno perceba complexidade e seriedade no conteúdo. Prefira verbos de ação e tom analítico. Evite analogias forçadas ou tentativas de “deixar o texto leve”. O tom geral deve transmitir a sensação de um professor que respeita a inteligência do aluno e ensina com clareza, firmeza e propósito. Em suma: seja preciso, lúcido e didático, sem perder densidade histórica.`;

// Helper for input fields for consistency
const InputField: React.FC<{ label: string, required?: boolean, children: React.ReactNode }> = ({ label, required, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 hc-text-secondary">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

const MultipleChoiceCreator: React.FC<{ questions: QuizQuestion[], setQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>> }> = ({ questions, setQuestions }) => {
    const [isGeneratingChoices, setIsGeneratingChoices] = useState<number | null>(null);
    const { addToast } = useToast();

    const handleGenerateChoices = async (qId: number, questionText: string) => {
        if (!questionText.trim()) {
            addToast('Por favor, escreva o texto da pergunta primeiro.', 'error');
            return;
        }
        setIsGeneratingChoices(qId);
        try {
            // Lazy Loading da Biblioteca de IA (Economiza ~500KB no load inicial)
            const { GoogleGenAI } = await import('@google/genai');
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const userPrompt = `Gere 4 alternativas de múltipla escolha para a seguinte pergunta de história ou tópico relacionado: "${questionText}". A primeira alternativa deve ser a correta. Retorne apenas o texto das alternativas, cada uma em uma nova linha, sem marcadores (como a), b), -, 1., etc).`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: userPrompt,
                 config: {
                    systemInstruction: PROFESSOR_EXIGENTE_SYSTEM_PROMPT,
                },
            });
            
            const text = response.text;
            if (!text) throw new Error("Resposta vazia da IA.");

            const choicesText = text.split('\n').filter(line => line.trim() !== '');

            if (choicesText.length < 2) {
                throw new Error("A IA não retornou alternativas suficientes.");
            }

            const newChoices = choicesText.map((choiceText, index) => ({
                id: String(index + 1),
                text: choiceText.trim(),
            }));

            setQuestions(prev => prev.map(q => {
                if (q.id === qId) {
                    return { ...q, choices: newChoices, correctAnswerId: '1' }; // First one is correct
                }
                return q;
            }));

        } catch (err: any) {
            console.error("Error generating choices:", err);
            addToast(`Não foi possível gerar as alternativas: ${err.message}`, 'error');
        } finally {
            setIsGeneratingChoices(null);
        }
    };
    
    const addQuestion = () => {
        setQuestions(prev => [
            ...prev,
            {
                id: Date.now(),
                question: '',
                choices: [{ id: '1', text: '' }, { id: '2', text: '' }],
                correctAnswerId: '1',
            }
        ]);
    };
    
    const updateQuestion = (qId: number, text: string) => {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, question: text } : q));
    };
    
    const removeQuestion = (qId: number) => {
        setQuestions(prev => prev.filter(q => q.id !== qId));
    };
    
    const addChoice = (qId: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId) {
                const newChoiceId = String(Math.max(...q.choices.map(c => Number(c.id))) + 1);
                return { ...q, choices: [...q.choices, { id: newChoiceId, text: '' }] };
            }
            return q;
        }));
    };
    
    const updateChoice = (qId: number, cId: string, text: string) => {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, choices: q.choices.map(c => c.id === cId ? { ...c, text } : c) } : q));
    };

    const removeChoice = (qId: number, cId: string) => {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, choices: q.choices.filter(c => c.id !== cId) } : q));
    };

    const setCorrectAnswer = (qId: number, cId: string) => {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, correctAnswerId: cId } : q));
    };

    return (
        <div className="space-y-6">
            {questions.map((q, qIndex) => (
                <Card key={q.id} className="bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-200">Questão {qIndex + 1}</h4>
                        <button type="button" onClick={() => removeQuestion(q.id)} className="text-sm text-red-500 font-semibold hover:underline">Remover Questão</button>
                    </div>
                    <div className="space-y-4">
                        <textarea
                            value={q.question}
                            onChange={e => updateQuestion(q.id, e.target.value)}
                            placeholder={`Digite o texto da questão ${qIndex + 1}`}
                            rows={2}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        />
                        <div className="space-y-2">
                            {q.choices.map(choice => (
                                <div key={choice.id} className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name={`correct-answer-${q.id}`}
                                        checked={q.correctAnswerId === choice.id}
                                        onChange={() => setCorrectAnswer(q.id, choice.id)}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 focus-visible:ring-indigo-500"
                                    />
                                    <input
                                        type="text"
                                        value={choice.text}
                                        onChange={e => updateChoice(q.id, choice.id, e.target.value)}
                                        placeholder={`Opção de resposta ${choice.id}`}
                                        className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                    />
                                    <button type="button" onClick={() => removeChoice(q.id, choice.id)} disabled={q.choices.length <= 2} className="p-2 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <button type="button" onClick={() => addChoice(q.id)} className="text-sm font-semibold text-indigo-600 hover:underline">+ Adicionar Opção</button>
                            <button
                                type="button"
                                onClick={() => handleGenerateChoices(q.id, q.question)}
                                disabled={isGeneratingChoices === q.id}
                                className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed dark:text-indigo-400 hover:underline"
                                title="Gerar alternativas com IA"
                            >
                                {isGeneratingChoices === q.id ? <SpinnerIcon className="h-4 w-4" /> : <div className="h-4 w-4">{ICONS.ai_generate}</div>}
                                <span>Gerar Alternativas com IA</span>
                            </button>
                        </div>
                    </div>
                </Card>
            ))}
            <button type="button" onClick={addQuestion} className="w-full p-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 hc-button-override">
                Adicionar Questão
            </button>
        </div>
    );
}

const CreateActivity: React.FC = () => {
    const { teacherClasses, handleSaveActivity } = useTeacherData();
    const { setCurrentPage } = useNavigation();
    const { addToast } = useToast();
    const { user } = useAuth();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [activityType, setActivityType] = useState<ActivityType>('Tarefa (Texto)');
    const [selectedClassId, setSelectedClassId] = useState(teacherClasses.length > 0 ? teacherClasses[0].id : '');
    const [unidade, setUnidade] = useState<Unidade>('1ª Unidade');
    const [materia, setMateria] = useState('História');
    const [dueDate, setDueDate] = useState('');
    const [points, setPoints] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [allowLateSubmissions, setAllowLateSubmissions] = useState(true);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [attachments, setAttachments] = useState<File[]>([]);

    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const materiaOptions = [ 'Artes', 'Biologia', 'Ciências', 'Educação Física', 'Espanhol', 'Filosofia', 'Física', 'Geografia', 'História', 'História Sergipana', 'Inglês', 'Matemática', 'Português / Literatura', 'Química', 'Sociologia', 'Tecnologia / Informática'];

    const handleGenerateDescription = async () => {
        if ((!title.trim() && !description.trim()) || isGeneratingDescription) return;
        setIsGeneratingDescription(true);
        try {
            // Lazy Loading da Biblioteca de IA (Economiza ~500KB no load inicial)
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let userPrompt = `Crie uma descrição detalhada e instruções claras para uma atividade escolar.`;

            if (title.trim() && description.trim()) {
                userPrompt += ` A atividade tem o título "${title}" e o professor já forneceu as seguintes anotações/rascunho: "${description}". Use essas informações como base para refinar e expandir o texto, criando uma descrição completa.`;
            } else if (title.trim()) {
                userPrompt += ` A atividade tem o título "${title}".`;
            } else if (description.trim()) {
                userPrompt += ` A atividade é sobre o seguinte tópico ou rascunho: "${description}".`;
            }
            
            userPrompt += " Formate a resposta de forma clara e concisa, pronta para ser apresentada aos alunos.";

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: userPrompt,
              config: {
                  systemInstruction: PROFESSOR_EXIGENTE_SYSTEM_PROMPT
              }
            });
            
            const text = response.text;
            if (text) setDescription(text);
            
        } catch (error) {
            console.error("Error generating activity description:", error);
            addToast("Não foi possível gerar a descrição. Tente novamente.", 'error');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            const ALLOWED_TYPES = [
                'application/pdf', 
                'image/jpeg', 
                'image/png', 
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];

            const validFiles = newFiles.filter((file: File) => {
                if (file.size > MAX_FILE_SIZE) {
                    addToast(`Arquivo "${file.name}" é muito grande (máx 10MB).`, 'error');
                    return false;
                }
                if (!ALLOWED_TYPES.includes(file.type)) {
                    addToast(`Tipo de arquivo "${file.name}" não suportado.`, 'error');
                    return false;
                }
                return true;
            });

            setAttachments(prev => [...prev, ...validFiles]);
        }
    };

    const removeAttachment = (fileToRemove: File) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    const handleSave = async () => {
        if (!title || !description || !selectedClassId || isSubmitting || !user) return;
        setIsSubmitting(true);

        try {
            let attachmentPayload: { name: string; url: string; }[] = [];
            if (attachments.length > 0) {
                addToast('Enviando anexos...', 'info');
                for (const file of attachments) {
                    const filePath = `activity_attachments/${selectedClassId}/${user.id}/${Date.now()}-${file.name}`;
                    const storageRef = ref(storage, filePath);
                    
                    await uploadBytes(storageRef, file);
                    const downloadUrl = await getDownloadURL(storageRef);

                    attachmentPayload.push({ name: file.name, url: downloadUrl });
                }
            }
            
            // Obter o nome da turma selecionada
            const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
            const className = selectedClass ? selectedClass.name : 'Turma sem nome';

            const activityData: Partial<Activity> = {
                title,
                description,
                imageUrl,
                type: activityType,
                classId: selectedClassId,
                className, // IMPORTANTE: Adicionar o nome da turma aqui
                creatorId: user.id,
                creatorName: user.name,
                unidade,
                materia,
                points,
                isVisible,
                allowLateSubmissions,
                attachmentFiles: attachmentPayload,
            };

            if (dueDate) {
                activityData.dueDate = dueDate;
            }

            if (activityType === 'Múltipla Escolha') {
                activityData.questions = questions;
            }

            const success = await handleSaveActivity(activityData as Omit<Activity, 'id'>);
            
            if (success) {
                setCurrentPage('teacher_dashboard');
            }

        } catch (error: any) {
            addToast(`Falha ao salvar atividade: ${error.message}`, 'error');
            console.error("Failed to save activity:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center -mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 hc-text-primary">Criar Atividade</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 hc-text-secondary">Crie atividades para seus alunos responderem</p>
                </div>
                <button onClick={() => setCurrentPage('teacher_dashboard')} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override">
                    Voltar
                </button>
            </div>

            <Card>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 border-b dark:border-slate-700 pb-4 mb-6 flex items-center hc-text-primary hc-border-override">
                    {ICONS.teacher_create_activity}
                    <span className="ml-2">Informações da Atividade</span>
                </h3>
                <fieldset disabled={isSubmitting} className="space-y-6">
                    <InputField label="Título" required>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Redação sobre a República Velha" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 hc-text-secondary">
                                Descrição/Instruções <span className="text-red-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={handleGenerateDescription}
                                disabled={(!title.trim() && !description.trim()) || isGeneratingDescription}
                                className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed dark:text-indigo-400 hover:underline"
                                title="Gerar descrição com IA"
                            >
                                {isGeneratingDescription ? <SpinnerIcon className="h-4 w-4 text-indigo-600" /> : <div className="h-4 w-4">{ICONS.ai_generate}</div>}
                                <span>Gerar com IA</span>
                            </button>
                        </div>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Descreva o que os alunos devem fazer..." className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </div>

                    <InputField label="URL da Imagem (Opcional)">
                        <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </InputField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Tipo de Atividade">
                            <select value={activityType} onChange={e => setActivityType(e.target.value as ActivityType)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                <option>Tarefa (Texto)</option>
                                <option>Múltipla Escolha</option>
                            </select>
                        </InputField>
                        <InputField label="Turma" required>
                             <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                 {teacherClasses.length === 0 && <option disabled>Nenhuma turma encontrada</option>}
                                 {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </InputField>
                         <InputField label="Unidade" required>
                            <select value={unidade} onChange={e => setUnidade(e.target.value as Unidade)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                <option>1ª Unidade</option>
                                <option>2ª Unidade</option>
                                <option>3ª Unidade</option>
                                <option>4ª Unidade</option>
                            </select>
                        </InputField>
                        <InputField label="Matéria" required>
                             <select value={materia} onChange={e => setMateria(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                 {materiaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </InputField>
                    </div>

                    {activityType === 'Múltipla Escolha' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 hc-text-secondary">Questões</label>
                            <MultipleChoiceCreator questions={questions} setQuestions={setQuestions} />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputField label="Prazo de Entrega">
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </InputField>
                        <InputField label="Pontos (Máx: 10)">
                            <input 
                                type="number" 
                                step="any" 
                                max="10"
                                value={points} 
                                onChange={e => {
                                    let val = parseFloat(e.target.value);
                                    if (isNaN(val)) val = 0;
                                    if (val < 0) val = 0;
                                    if (val > 10) val = 10;
                                    setPoints(val);
                                }} 
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                            />
                        </InputField>
                    </div>

                     <InputField label="Anexos">
                        <label htmlFor="file-upload" className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-indigo-500 dark:border-slate-600 dark:hover:border-indigo-500">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 13.5v6c0 1.104.896 2 2 2h14c1.104 0 2-.896 2-2v-6" />
                                </svg>
                                <p className="text-sm text-gray-600 dark:text-slate-400 hc-text-secondary">Clique para fazer upload ou arraste arquivos</p>
                                <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={handleFileChange} />
                            </div>
                        </label>
                        {attachments.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Arquivos selecionados:</p>
                                {attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md text-sm">
                                        <span className="text-slate-800 dark:text-slate-200 truncate pr-4">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(file)}
                                            className="text-red-500 hover:text-red-700 font-semibold"
                                            aria-label={`Remover anexo ${file.name}`}
                                        >
                                            Remover
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </InputField>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-center">
                            <input id="is-visible" name="is-visible" type="checkbox" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} className="focus-visible:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                            <label htmlFor="is-visible" className="ml-3 block text-sm font-medium text-gray-700 dark:text-slate-300 hc-text-secondary">Atividade visível para alunos</label>
                        </div>
                         <div className="flex items-center">
                            <input id="allow-late" name="allow-late" type="checkbox" checked={allowLateSubmissions} onChange={e => setAllowLateSubmissions(e.target.checked)} className="focus-visible:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                            <label htmlFor="allow-late" className="ml-3 block text-sm font-medium text-gray-700 dark:text-slate-300 hc-text-secondary">Permitir envio após o prazo</label>
                        </div>
                    </div>
                </fieldset>
            </Card>

            <div className="flex justify-end space-x-4">
                <button onClick={() => setCurrentPage('teacher_dashboard')} className="px-6 py-2 bg-white text-slate-800 font-semibold rounded-lg hover:bg-slate-100 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600 hc-button-override">
                    Cancelar
                </button>
                <button onClick={handleSave} disabled={!title || !description || !selectedClassId || isSubmitting} className="px-6 py-2 bg-indigo-200 text-indigo-900 font-semibold rounded-lg hover:bg-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:text-white hc-button-primary-override">
                     {isSubmitting ? <SpinnerIcon className="h-5 w-5 text-indigo-900 dark:text-white" /> : ICONS.teacher_create_activity}
                    <span>{isSubmitting ? 'Criando...' : 'Criar Atividade'}</span>
                </button>
            </div>
        </div>
    );
};

export default CreateActivity;