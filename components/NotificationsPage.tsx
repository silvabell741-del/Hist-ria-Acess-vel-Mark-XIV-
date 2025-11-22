import React, { useState, useContext } from 'react';
import type { Notification } from '../types';
import { Card } from './common/Card';
import { useAuth } from '../contexts/AuthContext';
// FIX: Import StudentDataContext to be used with useContext.
import { StudentDataContext } from '../contexts/StudentDataContext';
import { TeacherDataContext } from '../contexts/TeacherDataContext';
import { useNavigation } from '../contexts/NavigationContext';

interface NotificationsPageProps {}

const UrgencyIndicator: React.FC<{ urgency: 'low' | 'medium' | 'high' }> = ({ urgency }) => {
    const color = {
        low: 'bg-blue-500',
        medium: 'bg-yellow-500',
        high: 'bg-red-500',
    }[urgency];
    return <span className={`absolute left-0 top-0 bottom-0 w-1 ${color}`}></span>;
};

const NotificationItem: React.FC<{ notification: Notification; onClick: () => void }> = ({ notification, onClick }) => (
    <a href="#" onClick={(e) => { e.preventDefault(); onClick(); }} className={`relative block p-4 transition-colors duration-200 rounded-lg ${!notification.read ? 'bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'} hc-bg-override hc-border-override`}>
        <UrgencyIndicator urgency={notification.urgency} />
        <div className="pl-4">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 hc-text-primary">{notification.title}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 ml-4 hc-text-secondary">{new Date(notification.timestamp).toLocaleDateString('pt-BR')}</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 hc-text-secondary">{notification.summary}</p>
        </div>
    </a>
);


const NotificationsPage: React.FC<NotificationsPageProps> = () => {
    const { userRole } = useAuth();
    const studentData = useContext(StudentDataContext);
    const teacherData = useContext(TeacherDataContext);
    const { notifications, handleMarkAllNotificationsRead, unreadNotificationCount, handleMarkNotificationAsRead } = (userRole === 'aluno' ? studentData : teacherData)!;
    
    const { setCurrentPage } = useNavigation();
    
    const [isUpdating, setIsUpdating] = useState(false);

    const handleMarkAll = async () => {
        setIsUpdating(true);
        await handleMarkAllNotificationsRead();
        setIsUpdating(false);
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read && handleMarkNotificationAsRead) {
            handleMarkNotificationAsRead(notification.id);
        }
        setCurrentPage(notification.deepLink.page);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <p className="text-slate-500 dark:text-slate-400 hc-text-secondary">Você tem {unreadNotificationCount} notificações não lidas.</p>
                <button
                    onClick={handleMarkAll}
                    disabled={unreadNotificationCount === 0 || isUpdating}
                    className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 hc-button-override"
                >
                    {isUpdating ? 'Marcando...' : 'Marcar todas como lidas'}
                </button>
            </div>
            <Card className="p-2 sm:p-4">
                {notifications.length > 0 ? (
                    <ul className="space-y-2">
                        {notifications.map(n => (
                            <li key={n.id}>
                                <NotificationItem notification={n} onClick={() => handleNotificationClick(n)} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-20">
                         <div className="flex justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 hc-text-primary">Tudo em dia!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 hc-text-secondary">Você não tem nenhuma notificação nova.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default NotificationsPage;