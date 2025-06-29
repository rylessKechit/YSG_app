'use client';

import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserTable } from '@/components/users/user-table';
import { User } from '@/types/auth';

// Type local pour éviter les conflits
interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'preparateur';
  isActive?: boolean;
  agencies: Array<{
    id: string;
    name: string;
  }>;
  lastLogin?: string;
  createdAt?: string;
}

export default function UsersPage() {
  const router = useRouter();

  const handleCreateUser = () => {
    router.push('/users/new');
  };

  const handleEditUser = (user: UserData) => {
    router.push(`/users/${user.id}/edit`); // ✅ CORRECTION: Route vers /edit
  };

  const handleViewProfile = (user: UserData) => {
    router.push(`/users/${user.id}/profile`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-600 mt-1">
            Gérez les comptes préparateurs et administrateurs
          </p>
        </div>
        
        <Button onClick={handleCreateUser} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau préparateur
        </Button>
      </div>

      {/* Tableau des utilisateurs */}
      <UserTable 
        onEditUser={handleEditUser}
        onViewProfile={handleViewProfile}
      />
    </div>
  );
}