'use client';

import { useRouter } from 'next/navigation';
import { UserForm } from '@/components/users/user-form';
import { User } from '@/types/auth';

export default function NewUserPage() {
  const router = useRouter();

  const handleSuccess = (user: User) => {
    router.push('/users');
  };

  const handleCancel = () => {
    router.push('/users');
  };

  return (
    <UserForm 
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}