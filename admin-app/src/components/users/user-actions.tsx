'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Eye, Key, Trash2, RotateCcw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserModal } from './user-modal';
import { User } from '@/types/auth';
import { useDeleteUser, useReactivateUser, useResetPassword } from '@/hooks/api/useUsers';
import { useToast } from '@/components/ui/use-toast';

interface UserActionsProps {
  user: User;
  onEdit?: (user: User) => void;
  onView?: (user: User) => void;
  onUpdate?: () => void;
}

export function UserActions({ user, onEdit, onView, onUpdate }: UserActionsProps) {
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const deleteUser = useDeleteUser();
  const reactivateUser = useReactivateUser();
  const resetPassword = useResetPassword();

  const handleEdit = () => {
    if (onEdit) {
      onEdit(user);
    } else {
      setShowEditModal(true);
    }
  };

  const handleView = () => {
    if (onView) {
      onView(user);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword.mutateAsync(user.id);
      onUpdate?.();
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const handleToggleStatus = async () => {
    try {
      if (user.isActive) {
        await deleteUser.mutateAsync(user.id);
        toast({
          title: 'Utilisateur désactivé',
          description: `${user.firstName} ${user.lastName} a été désactivé`,
        });
      } else {
        await reactivateUser.mutateAsync(user.id);
        toast({
          title: 'Utilisateur réactivé',
          description: `${user.firstName} ${user.lastName} a été réactivé`,
        });
      }
      onUpdate?.();
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const handleEditSuccess = () => {
    onUpdate?.();
    setShowEditModal(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          
          <DropdownMenuItem onClick={handleView}>
            <Eye className="w-4 h-4 mr-2" />
            Voir le profil
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleResetPassword}
            disabled={resetPassword.isPending}
          >
            <Key className="w-4 h-4 mr-2" />
            Réinitialiser mot de passe
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {user.isActive ? (
            <DropdownMenuItem 
              onClick={handleToggleStatus}
              disabled={deleteUser.isPending}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Désactiver
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={handleToggleStatus}
              disabled={reactivateUser.isPending}
              className="text-green-600"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réactiver
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal d'édition */}
      <UserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        userId={user.id}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}