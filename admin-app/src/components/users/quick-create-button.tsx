'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserModal } from './user-modal';
import { User } from '@/types/auth';

interface QuickCreateButtonProps {
  onSuccess?: (user: User) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function QuickCreateButton({ 
  onSuccess, 
  variant = 'default', 
  size = 'default' 
}: QuickCreateButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleSuccess = (user: User) => {
    onSuccess?.(user);
    setShowModal(false);
  };

  return (
    <>
      <Button 
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Nouveau préparateur
      </Button>

      <UserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}