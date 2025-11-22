
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 dark:border dark:border-slate-700 dark:shadow-none hc-bg-override hc-border-override ${className}`}>
            {children}
        </div>
    );
};