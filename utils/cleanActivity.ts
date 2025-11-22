
import { Activity } from '../types';

export function cleanActivity(activity: any): any {
  if (!activity) return null;
  
  return JSON.parse(JSON.stringify({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    type: activity.type,
    points: activity.points,
    materia: activity.materia,
    unidade: activity.unidade,
    classId: activity.classId,
    className: activity.className, // Preserva o className se existir (usado em JoinClass)
    imageUrl: activity.imageUrl,
    dueDate: activity.dueDate,
    createdAt: activity.createdAt, // Preserva data de criação para Badges
    questions: activity.questions || [],
    submissions: activity.submissions || [],
    attachmentFiles: activity.attachmentFiles || [],
    isVisible: activity.isVisible,
    allowLateSubmissions: activity.allowLateSubmissions,
    creatorId: activity.creatorId,
    creatorName: activity.creatorName
  }));
}