// ===== @/app/(auth)/layout.tsx =====
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion - Vehicle Prep',
  description: 'Connectez-vous à votre compte Vehicle Prep',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Container principal */}
      <div className="flex min-h-screen">
        {/* Zone de contenu principal */}
        <div className="flex-1 flex items-center justify-center p-4">
          {children}
        </div>
        
        {/* Image de fond décorative (cachée sur mobile) */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h2 className="text-4xl font-bold mb-4">
                Gestion des véhicules SIXT
              </h2>
              <p className="text-xl opacity-90 mb-8">
                Pointage, préparations et suivi en temps réel
              </p>
              <div className="grid grid-cols-1 gap-4 max-w-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">⏰</span>
                  </div>
                  <span>Pointage intelligent</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">🚗</span>
                  </div>
                  <span>Préparations guidées</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">📊</span>
                  </div>
                  <span>Statistiques temps réel</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Motif décoratif */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg className="w-full h-32 text-white/10" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Indicateur de chargement global (optionnel) */}
      <div id="auth-loading-portal" />
    </div>
  );
}