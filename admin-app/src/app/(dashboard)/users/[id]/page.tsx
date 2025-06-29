'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  useEffect(() => {
    // Rediriger automatiquement vers la page d'édition
    if (userId) {
      router.replace(`/users/${userId}/edit`);
    } else {
      router.replace('/users');
    }
  }, [userId, router]);

  return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}