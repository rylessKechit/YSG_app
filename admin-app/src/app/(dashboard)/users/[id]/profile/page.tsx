'use client';

import { useRouter, useParams } from 'next/navigation';
import { UserProfile } from '@/components/users/user-profile';
import { User } from '@/types/auth';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const handleEdit = (user: User) => {
    router.push(`/users/${userId}/edit`);
  };

  return (
    <UserProfile 
      userId={userId}
      onEdit={handleEdit}
    />
  );
}