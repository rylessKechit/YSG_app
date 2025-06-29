// src/components/users/user-table.tsx - VERSION MISE À JOUR avec nouvelles actions
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Search,
  Download
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/common/loading-spinner';

import { useUsers, useBulkAction } from '@/hooks/api/useUsers';
import { UserFilters } from '@/lib/api/users';
import { UserActions } from './user-actions';
import { User } from '@/types/auth';

// Types locaux
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

interface UserTableProps {
  onEditUser?: (user: UserData) => void;
  onViewProfile?: (user: UserData) => void;
}

// Hook personnalisé pour le debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function UserTable({ onEditUser, onViewProfile }: UserTableProps) {
  // États locaux
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort: 'role', // ✅ CORRECTION: Tri par rôle par défaut
    order: 'asc'  // ✅ CORRECTION: asc pour avoir admin avant preparateur
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Débouncer la recherche
  const debouncedSearchInput = useDebounce(searchInput, 500);

  // Mettre à jour les filtres
  useEffect(() => {
    setFilters(prev => ({ 
      ...prev, 
      search: debouncedSearchInput, 
      page: 1
    }));
  }, [debouncedSearchInput]);

  // Hooks API
  const { data: usersData, isLoading, error, refetch } = useUsers(filters);
  const bulkAction = useBulkAction();

  // Extraction des données avec tri prioritaire par rôle
  const { users, pagination, stats } = useMemo(() => {
    if (!usersData?.data) {
      return { 
        users: [] as UserData[], 
        pagination: null, 
        stats: null 
      };
    }
    
    const responseData = usersData.data;
    let sortedUsers = responseData.users || [];
    
    // ✅ CORRECTION: Tri additionnel côté client pour garantir admin > preparateur
    if (filters.sort === 'role') {
      sortedUsers = [...sortedUsers].sort((a, b) => {
        // Admins en premier (admin = 0, preparateur = 1)
        const roleOrder = { admin: 0, preparateur: 1 };
        const aOrder = roleOrder[a.role as keyof typeof roleOrder] || 2;
        const bOrder = roleOrder[b.role as keyof typeof roleOrder] || 2;
        
        if (aOrder !== bOrder) {
          return filters.order === 'asc' ? aOrder - bOrder : bOrder - aOrder;
        }
        
        // Si même rôle, trier par nom
        return a.firstName.localeCompare(b.firstName);
      });
    }
    
    return {
      users: sortedUsers,
      pagination: responseData.pagination || null,
      stats: responseData.stats || null
    };
  }, [usersData, filters.sort, filters.order]);

  // Handlers optimisés
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleFilterChange = useCallback((key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleSort = useCallback((column: string) => {
    setFilters(prev => ({
      ...prev,
      sort: column,
      order: prev.sort === column && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleSelectUser = useCallback((userId: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && users?.length > 0) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  }, [users]);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedUsers.size === 0) return;
    
    bulkAction.mutate({
      action: action as any,
      userIds: Array.from(selectedUsers)
    }, {
      onSuccess: () => {
        setSelectedUsers(new Set()); // Clear selection
        refetch(); // Refresh data
      }
    });
  }, [selectedUsers, bulkAction, refetch]);

  const exportUsers = useCallback(() => {
    console.log('Export des utilisateurs...');
  }, []);

  // Fonctions utilitaires memoized
  const getUserInitials = useCallback((user: UserData) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }, []);

  const getRoleBadge = useCallback((role: string) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        role === 'admin' 
          ? 'bg-purple-100 text-purple-700' 
          : 'bg-blue-100 text-blue-700'
      }`}>
        {role === 'admin' ? 'Administrateur' : 'Préparateur'}
      </span>
    );
  }, []);

  const getStatusText = useCallback((isActive?: boolean) => {
    return (
      <span className={isActive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    );
  }, []);

  const formatLastLogin = useCallback((lastLogin?: string) => {
    if (!lastLogin) return 'Jamais';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Il y a moins d\'1h';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 48) return 'Hier';
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  // Pagination calculée
  const paginationData = useMemo(() => {
    if (!pagination) return null;
    
    const totalPages = pagination.pages || pagination.totalPages || 1;
    const currentPage = pagination.page || 1;
    
    return {
      totalPages,
      currentPage,
      total: pagination.total,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  }, [pagination]);

  // Handler pour la création d'utilisateur - SUPPRIMÉ car géré par la page parent

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur lors du chargement</p>
            <Button onClick={() => refetch()}>Réessayer</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-gray-600">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
              <p className="text-xs text-gray-600">Actifs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</div>
              <p className="text-xs text-gray-600">Inactifs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.preparateurs}</div>
              <p className="text-xs text-gray-600">Préparateurs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
              <p className="text-xs text-gray-600">Admins</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres et actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>
                Gérez les comptes préparateurs et administrateurs
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedUsers.size} sélectionné(s)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('activate')}
                    disabled={bulkAction.isPending}
                  >
                    Activer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('deactivate')}
                    disabled={bulkAction.isPending}
                  >
                    Désactiver
                  </Button>
                </div>
              )}
              <Button variant="outline" onClick={exportUsers}>
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              {/* ✅ SUPPRIMÉ: QuickCreateButton car déjà présent dans le header de la page */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barre de recherche et filtres */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par nom, prénom ou email..."
                value={searchInput}
                onChange={handleSearchInputChange}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={filters.status} 
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.role || 'all'} 
              onValueChange={(value) => handleFilterChange('role', value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="preparateur">Préparateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tableau */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('firstName')}
                >
                  Utilisateur
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('email')}
                >
                  Email
                </TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Agences</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('role')}
                >
                  Rôle {filters.sort === 'role' && (
                    <span className="ml-1">
                      {filters.order === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableHead>
                <TableHead>Statut</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('lastLogin')}
                >
                  Dernière connexion
                </TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={(checked: boolean) => handleSelectUser(user.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.id.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.phone ? (
                      <span>{user.phone}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.agencies?.length > 0 ? 
                        user.agencies.map(agency => agency.name).join(', ') : 
                        <span className="text-gray-400">Aucune</span>
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    {getStatusText(user.isActive)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {formatLastLogin(user.lastLogin)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <UserActions
                      user={user as User}
                      onEdit={onEditUser}
                      onView={onViewProfile}
                      onUpdate={refetch}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {paginationData && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-500">
                Page {paginationData.currentPage} sur {paginationData.totalPages} 
                ({paginationData.total} utilisateur(s) au total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!paginationData.hasPrev}
                  onClick={() => handleFilterChange('page', paginationData.currentPage - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!paginationData.hasNext}
                  onClick={() => handleFilterChange('page', paginationData.currentPage + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* État vide */}
      {users.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto text-gray-400 mb-4 flex items-center justify-center">
                <Search className="h-8 w-8" />
              </div>
              <p className="text-gray-600">
                {filters.search ? 
                  'Aucun utilisateur trouvé pour cette recherche' : 
                  'Aucun utilisateur trouvé'
                }
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Utilisez le bouton "Nouveau préparateur" pour créer le premier utilisateur
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}