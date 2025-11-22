
export type Role = 'aluno' | 'professor' | 'admin' | null;

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  series?: string;
  avatarUrl?: string;
}

export type UserStatus = 'Ativo' | 'Pendente' | 'Inativo';

export interface AdminUser extends User {
  registrationDate: string;
  status: UserStatus;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string; // for unlocked achievements
  points: number;
  unlocked: boolean;
  tier: BadgeTier;
  // Admin fields
  criterion?: string;
  criterionType?: 'modules' | 'quizzes' | 'activities';
  criterionCount?: number;
  category?: 'social' | 'learning' | 'engagement';
  rarity?: 'common' | 'rare' | 'epic';
  status?: 'Ativa' | 'Inativa';
}

// Novos tipos para a Fase 1 da Gamificação (Stat-Driven Architecture)
export interface UserGamificationStats {
  quizzesCompleted: number;
  modulesCompleted: number;
  activitiesCompleted: number;
  loginStreak: number;
  [key: string]: number; // Extensible
}

export interface UserAchievementsDoc {
  xp: number;
  level: number;
  stats: UserGamificationStats;
  unlocked: Record<string, { date: string; seen: boolean }>; // Map<AchievementID, Data>
  updatedAt?: any;
}

export interface ModuleProgress {
  id: string;
  name: string;
  progress: number;
  status: 'Concluído' | 'Em andamento';
}

export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  studentCount: number;
  notices: number;
  activities: number;
}

export interface Notification {
  id: string;
  title: string;
  summary: string;
  urgency: 'low' | 'medium' | 'high';
  deepLink: { page: Page; id?: string };
  read: boolean;
  timestamp: string;
  userId?: string;
  groupCount?: number; // Novo campo para agrupamento
}

export interface UserStats {
  xp: number;
  level: number;
  xpForNextLevel: number;
  levelName: string;
}

// FIX: Added Page type export to resolve import errors across the application.
export type Page =
  // Student
  | 'dashboard'
  | 'modules'
  | 'quizzes'
  | 'activities'
  | 'achievements'
  | 'join_class'
  | 'profile'
  | 'notifications'
  | 'module_view'
  | 'boletim'
  // Teacher
  | 'teacher_dashboard'
  | 'teacher_main_dashboard'
  | 'teacher_create_module'
  | 'teacher_create_activity'
  | 'teacher_statistics'
  | 'teacher_pending_activities'
  | 'teacher_school_records'
  | 'class_view'
  // Admin
  | 'admin_dashboard'
  | 'admin_users'
  | 'admin_modules'
  | 'admin_quizzes'
  | 'admin_achievements'
  | 'admin_stats'
  | 'admin_tests'
  | 'admin_create_quiz'
  | 'admin_create_achievement'
  | 'admin_create_module'; // New admin specific page

// Module and Quiz Types
export type ModulePageContentType =
  | 'title'
  | 'paragraph'
  | 'list'
  | 'quote'
  | 'image'
  | 'video'
  | 'divider'
  | 'subtitle';

export interface ModulePageContent {
  type: ModulePageContentType;
  content: string | string[];
  alt?: string; // For images
  align?: 'left' | 'center' | 'justify';
  color?: string; // For text color
}

export interface ModulePage {
  id: number;
  title: string;
  content: ModulePageContent[];
}

export interface QuizChoice {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  choices: QuizChoice[];
  correctAnswerId: string;
  mediaUrl?: string; // Optional URL for an image or YouTube video
}

export type ModuleStatus = 'Concluído' | 'Em progresso' | 'Não iniciado';
export type ModuleDownloadState = 'not_downloaded' | 'downloading' | 'downloaded';

export interface Module {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  videoUrl?: string;
  series?: string | string[]; // Updated to support array
  materia?: string | string[]; // Updated to support array
  subjects?: string[]; // Explicit support for subjects array
  difficulty?: 'Fácil' | 'Médio' | 'Difícil';
  duration?: string;
  visibility?: 'specific_class' | 'public';
  classIds?: string[];
  creatorId?: string;
  creatorName?: string; // Denormalized
  pages: ModulePage[];
  quiz: QuizQuestion[];
  status?: 'Ativo' | 'Inativo';
  progress?: number; // 0-100
  downloadState?: ModuleDownloadState;
  // Admin fields
  date?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  visibility: 'public' | 'specific_class';
  classId?: string;
  questions: QuizQuestion[];
  attempts?: number;
  series?: string | string[]; // Updated to support array
  materia?: string | string[]; // Updated to support array
  subjects?: string[]; // Explicit support for subjects array
  // Admin fields
  createdBy?: string;
  date?: string;
  status?: 'Ativo' | 'Inativo';
  moduleId?: string;
}

// Activity Types
export type ActivityType = 'Tarefa (Texto)' | 'Múltipla Escolha';

export interface ActivitySubmission {
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string; // Denormalized
  studentSeries?: string; // Denormalized
  submissionDate: string;
  content: string;
  status: 'Aguardando correção' | 'Corrigido';
  grade?: number;
  feedback?: string;
  gradedAt?: string;
}

export type Unidade = '1ª Unidade' | '2ª Unidade' | '3ª Unidade' | '4ª Unidade';
export type Turno = 'matutino' | 'vespertino' | 'noturno';

export interface Activity {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  classId: string;
  className?: string; // Denormalized
  creatorId?: string;
  creatorName?: string; // Denormalized
  unidade?: Unidade;
  materia?: string;
  dueDate?: string;
  points: number;
  attachments?: File[];
  attachmentFiles?: { name: string; url: string }[];
  imageUrl?: string;
  questions?: QuizQuestion[];
  isVisible: boolean;
  allowLateSubmissions: boolean;
  submissions?: ActivitySubmission[];
  submissionCount?: number; // Denormalized
  pendingSubmissionCount?: number; // Denormalized
  // FIX: Added optional 'date' property to align with its usage in TeacherDataContext and other data types like Module and Quiz.
  date?: string;
  createdAt?: string | any; // Novo campo para Badge "Nova"
  moduleId?: string;
  status?: string;
}

// Teacher-specific types
export interface Student {
  id: string;
  name: string;
  avatarUrl: string;
  xp: number;
  level: number;
  overallProgress: number; // percentage
}

export interface ClassNotice {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface TeacherClass {
  id: string;
  name: string;
  code: string;
  students: Student[];
  studentCount?: number; // Denormalized Counter
  activityCount?: number; // Denormalized Counter
  moduleCount?: number; // Denormalized Counter
  noticeCount?: number; // Denormalized Counter
  modules: Module[];
  activities: Activity[];
  notices: ClassNotice[];
  teacherId: string;
  teachers?: string[]; // Array of teacher IDs for Multi-Teacher support (N:N)
  subjects?: Record<string, string>; // Map of teacherId -> Subject
  teacherNames?: Record<string, string>; // Denormalized Map of teacherId -> Name for UI
  isFullyLoaded?: boolean; // Lazy loading flag: true if detailed activities/sessions are loaded
}

// Class Invitation Type (Fase 4 - Confirmação)
export interface ClassInvitation {
  id: string;
  classId: string;
  className: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeEmail: string;
  subject: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

// Grade Report types for "Big Document" architecture
export interface GradeReportActivityDetail {
  id: string;
  title: string;
  grade: number;
  maxPoints: number;
}

export interface GradeReportUnidade {
  activities: GradeReportActivityDetail[];
  totalPoints: number;
}

export interface ClassGradeReport {
  className: string;
  unidades: {
    [key in Unidade]?: GradeReportUnidade;
  };
}

export interface GradeReport {
  [classId: string]: ClassGradeReport;
}

// Attendance types
export interface AttendanceSession {
  id: string;
  classId: string;
  date: string; // ISO string date YYYY-MM-DD
  turno: Turno;
  horario: number; // 1-6
  createdBy: string; // teacherId
  createdAt: string; // ISO string timestamp
}

export type AttendanceStatus = 'presente' | 'ausente';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string; // Denormalized for convenience
  status: AttendanceStatus;
  updatedAt: string; // ISO string timestamp
}

// --- Big Doc Types for new architecture ---

// Document stored at: teacher_history/{teacherId}
export interface TeacherHistoryDoc {
  classes: TeacherClass[];
  notifications: Notification[];
  attendanceSessions: AttendanceSession[];
}