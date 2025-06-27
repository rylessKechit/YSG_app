'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Clock, Car, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/stores';

const navItems = [
  {
    id: 'dashboard',
    label: 'Accueil',
    icon: Home,
    href: '/dashboard'
  },
  {
    id: 'timesheets',
    label: 'Pointage',
    icon: Clock,
    href: '/timesheets'
  },
  {
    id: 'preparations',
    label: 'Préparations',
    icon: Car,
    href: '/preparations'
  },
  {
    id: 'profile',
    label: 'Profil',
    icon: User,
    href: '/profile'
  }
];

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { setCurrentTab } = useAppStore();

  const handleNavigation = (item: typeof navItems[0]) => {
    setCurrentTab(item.id);
    router.push(item.href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 transition-colors",
                isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}