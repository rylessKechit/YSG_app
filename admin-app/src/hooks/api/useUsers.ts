// src/hooks/api/useUsers.ts - VERSION CORRIGÉE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserFilters, UserCreateData, UserUpdateData, BulkActionData } from '@/lib/api/users';
import { toast } from 'sonner';

// Query keys pour le cache
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  stats: (id: string, period?: string) => [...userKeys.all, 'stats', id, period] as const,
};

// ✅ CORRECTION PRINCIPALE : Hook pour récupérer la liste des utilisateurs
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => usersApi.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    // 🔧 SUPPRESSION du select problématique
    // Le hook retourne maintenant la réponse complète ApiResponse<UserListData>
    // Plus besoin d'extraire .data ici, c'est fait dans le component
  });
}

// Hook pour récupérer un utilisateur spécifique
export function useUser(id: string, enabled = true) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getUser(id),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data.user, // ✅ Ici on peut garder le select car on retourne directement l'utilisateur
  });
}

// ✅ SUPPRIMÉ: Hook useUserStats car l'endpoint n'existe pas
// Les stats viennent directement de l'utilisateur dans la réponse de getUser

// Hook pour créer un utilisateur
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UserCreateData) => usersApi.createUser(userData),
    onSuccess: (data) => {
      // Invalider la liste des utilisateurs
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Ajouter l'utilisateur au cache si possible
      const newUser = data.data.user;
      queryClient.setQueryData(userKeys.detail(newUser.id), data);
      
      toast.success('Utilisateur créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    }
  });
}

// Hook pour modifier un utilisateur
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userData }: { id: string; userData: UserUpdateData }) =>
      usersApi.updateUser(id, userData),
    onSuccess: (data, variables) => {
      // Invalider la liste
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Mettre à jour le cache de détail
      queryClient.setQueryData(userKeys.detail(variables.id), data);
      
      // Invalider les stats
      queryClient.invalidateQueries({ 
        queryKey: [...userKeys.all, 'stats', variables.id] 
      });
      
      toast.success('Utilisateur modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification');
    }
  });
}

// Hook pour supprimer un utilisateur
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: (_, id) => {
      // Invalider toutes les queries liées aux utilisateurs
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      
      toast.success('Utilisateur désactivé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la désactivation');
    }
  });
}

// Hook pour réactiver un utilisateur
export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.reactivateUser(id),
    onSuccess: (data, id) => {
      // Invalider la liste
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Mettre à jour le cache
      queryClient.setQueryData(userKeys.detail(id), data);
      
      toast.success('Utilisateur réactivé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la réactivation');
    }
  });
}

// Hook pour les actions en masse
export function useBulkAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkActionData) => usersApi.bulkActions(data),
    onSuccess: (result, variables) => {
      // Invalider la liste des utilisateurs
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Message de succès détaillé
      const { processed, failed } = result.data;
      if (failed > 0) {
        toast.warning(`Action effectuée: ${processed} réussies, ${failed} échecs`);
      } else {
        toast.success(`Action effectuée avec succès sur ${processed} utilisateur(s)`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'action en masse');
    }
  });
}

// Hook pour vérifier la disponibilité d'un email
export function useCheckEmail() {
  return useMutation({
    mutationFn: ({ email, excludeUserId }: { email: string; excludeUserId?: string }) =>
      usersApi.checkEmailAvailability(email, excludeUserId),
    onError: () => {
      // Ne pas afficher de toast d'erreur pour cette vérification
    }
  });
}

// Hook pour réinitialiser un mot de passe
export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id),
    onSuccess: (data) => {
      const tempPassword = data.data.temporaryPassword;
      toast.success(`Nouveau mot de passe: ${tempPassword}`);
      
      // Copier dans le presse-papier si possible
      if (navigator.clipboard) {
        navigator.clipboard.writeText(tempPassword);
        toast.info('Mot de passe copié dans le presse-papier');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    }
  });
}

// Hook utilitaire pour invalider le cache utilisateurs
export function useUsersCache() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: userKeys.all });
  };

  const invalidateList = (filters?: UserFilters) => {
    if (filters) {
      queryClient.invalidateQueries({ queryKey: userKeys.list(filters) });
    } else {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    }
  };

  const invalidateUser = (id: string) => {
    queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: [...userKeys.all, 'stats', id] });
  };

  const prefetchUser = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(id),
      queryFn: () => usersApi.getUser(id),
      staleTime: 2 * 60 * 1000,
    });
  };

  return {
    invalidateAll,
    invalidateList,
    invalidateUser,
    prefetchUser,
  };
}