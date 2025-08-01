// admin-app/src/components/layout/sidebar.tsx - VERSION MISE À JOUR AVEC TIMESHEETS
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users,
  Calendar, 
  Clock,
  BarChart3, 
  Wrench,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  ChevronRight,
  FileSpreadsheet
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

// ✅ NAVIGATION MISE À JOUR avec Timesheets
const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Utilisateurs',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Plannings',
    href: '/schedules',
    icon: Calendar,
  },
  {
    title: 'Pointages',
    href: '/timesheets',
    icon: Clock,
  },
  {
    title: 'Préparations',
    href: '/preparations',
    icon: Wrench,
  },
  {
    title: 'Agences',
    href: '/agencies',
    icon: Building2,
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
              'w-full justify-start mb-1 text-sm',
              level > 0 && 'pl-8',
              isActive && 'bg-blue-50 text-blue-700'
            )}
            onClick={() => toggleExpanded(item.title)}
          >
            <item.icon className="mr-3 h-4 w-4" />
            <span className="flex-1 text-left">{item.title}</span>
            {isExpanded ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </Button>
          
          {isExpanded && (
            <div className="ml-4 border-l border-gray-200 pl-4">
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
            'w-full justify-start mb-1 text-sm',
            level > 0 && 'pl-8',
            isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          )}
        >
          <item.icon className="mr-3 h-4 w-4" />
          <span>{item.title}</span>
        </Button>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">
          Vehicle Prep Admin
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map(item => renderNavItem(item))}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.role === 'admin' ? 'Administrateur' : 'Préparateur'}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}