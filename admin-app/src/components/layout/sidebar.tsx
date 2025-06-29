// src/components/layout/sidebar.tsx - VERSION CORRIGÉE
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
  ChevronRight
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

// ✅ CORRECTION: Navigation simplifiée sans dropdown pour Utilisateurs
const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Utilisateurs',
    href: '/users', // ✅ LIEN DIRECT vers /users
    icon: Users,
    // ✅ SUPPRIMÉ: children (plus de dropdown)
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
              'w-full justify-start mb-1 text-sm', // ✅ CORRECTION: Taille de texte réduite
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
            <div className="ml-4 space-y-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // ✅ CORRECTION: Item simple avec lien direct
    return (
      <Link key={item.title} href={item.href!}>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start mb-1 text-sm', // ✅ CORRECTION: Taille de texte réduite
            level > 0 && 'pl-8',
            isActive && 'bg-blue-50 text-blue-700'
          )}
        >
          <item.icon className="mr-3 h-4 w-4" />
          <span className="flex-1 text-left">{item.title}</span>
        </Button>
      </Link>
    );
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm"> {/* ✅ CORRECTION: Taille réduite */}
            SIXT Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {navigation.map(item => renderNavItem(item))}
        </nav>
      </div>

      {/* User info & Logout */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-medium text-xs"> {/* ✅ CORRECTION: Taille réduite */}
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate"> {/* ✅ CORRECTION: Taille réduite */}
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate"> {/* ✅ CORRECTION: Taille réduite */}
              {user?.role === 'admin' ? 'Administrateur' : 'Préparateur'}
            </p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="w-full text-xs" // ✅ CORRECTION: Taille réduite
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-3 w-3" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}