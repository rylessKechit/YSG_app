'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <AuthGuard requireAdmin={true}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar Desktop */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-0 h-full w-64 z-50">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
          
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}