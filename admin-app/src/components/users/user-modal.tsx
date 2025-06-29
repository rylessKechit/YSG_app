'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserForm } from './user-form';
import { User } from '@/types/auth';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // Si fourni, mode édition
  onSuccess?: (user: User) => void;
}

export function UserModal({ isOpen, onClose, userId, onSuccess }: UserModalProps) {
  const handleSuccess = (user: User) => {
    onSuccess?.(user);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {userId ? 'Modifier l\'utilisateur' : 'Nouveau préparateur'}
          </DialogTitle>
        </DialogHeader>
        
        <UserForm 
          userId={userId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}