// admin-app/src/components/common/page-header.tsx - COMPOSANT PAGE HEADER
'use client';

import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  actions, 
  children 
}: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-6 w-6 text-gray-600" />}
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </div>
          {description && (
            <p className="text-gray-600">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      
      {children}
    </div>
  );
}