import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/providers/query-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vehicle Prep Admin - Gestion des préparateurs SIXT',
  description: 'Interface d\'administration pour la gestion des préparateurs de véhicules SIXT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}