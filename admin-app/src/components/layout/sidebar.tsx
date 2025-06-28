// src/components/layout/sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Building2, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Utilisateurs',
    href: '/users',
    icon: Users,
  },
  {
    name: 'Plannings',
    href: '/schedules',
    icon: Calendar,
  },
  {
    name: 'Agences',
    href: '/agencies',
    icon: Building2,
  },
  {
    name: 'Rapports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    name: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, getUserFullName } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn(
      "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VP</span>
            </div>
            <span className="font-semibold text-gray-900">Vehicle Prep</span>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={cn(
                "flex-shrink-0",
                isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
              )} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 p-4">
        {user && (
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                {getInitials(getUserFullName())}
              </AvatarFallback>
            </Avatar>
            
            {!isCollapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getUserFullName()}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.role === 'admin' ? 'Administrateur' : 'Préparateur'}
                </p>
              </div>
            )}
            
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="p-1 ml-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* Bouton logout pour sidebar collapsed */}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full p-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}