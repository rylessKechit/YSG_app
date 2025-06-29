// src/components/layout/sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Building, 
  Calendar, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  User,
  UserPlus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Utilisateurs',
    icon: Users,
    children: [
      {
        title: 'Tous les utilisateurs',
        href: '/users',
        icon: User,
      },
      {
        title: 'Nouveau préparateur',
        href: '/users/new',
        icon: UserPlus,
      }
    ]
  },
  {
    title: 'Agences',
    href: '/agencies',
    icon: Building,
  },
  {
    title: 'Planification',
    href: '/schedules',
    icon: Calendar,
  },
  {
    title: 'Rapports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Utilisateurs']));

  const toggleExpanded = (title: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedItems(newExpanded);
  };

  const isActiveRoute = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.title);
    const isActive = isActiveRoute(item.href);

    if (hasChildren) {
      return (
        <div key={item.title}>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start mb-1',
              level > 0 && 'pl-8',
              isActive && 'bg-blue-50 text-blue-700'
            )}
            onClick={() => toggleExpanded(item.title)}
          >
            <item.icon className="mr-3 h-4 w-4" />
            <span className="flex-1 text-left">{item.title}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          {isExpanded && (
            <div className="ml-4 space-y-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link key={item.title} href={item.href!}>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start mb-1',
            level > 0 && 'pl-8',
            isActive && 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
          )}
        >
          <item.icon className="mr-3 h-4 w-4" />
          {item.title}
        </Button>
      </Link>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-xl font-bold text-gray-900">Vehicle Prep</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map(item => renderNavItem(item))}
      </nav>

      {/* User info & logout */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}