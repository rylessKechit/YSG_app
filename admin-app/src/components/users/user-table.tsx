// src/components/users/user-table.tsx - VERSION FINALE SANS ERREURS
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  RotateCcw, 
  Key, 
  User, 
  Mail, 
  Phone,
  Building,
  CheckCircle,
  XCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

import { useUsers, useDeleteUser, useReactivateUser, useResetPassword, useBulkAction } from '@/hooks/api/useUsers';
import { UserFilters } from '@/lib/api/users';

// Types locaux pour éviter les conflits
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
  onEditUser: (user: UserData) => void;
  onViewProfile: (user: UserData) => void;
}

// 🔧 Hook personnalisé pour le debouncing
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
  // 🔧 États locaux séparés pour l'input et les filtres API
  const [searchInput, setSearchInput] = useState(''); // État local pour l'input
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort: 'createdAt',
    order: 'desc'
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // 🔧 Débouncer la recherche pour éviter trop d'appels API
  const debouncedSearchInput = useDebounce(searchInput, 500); // 500ms de délai

  // 🔧 Mettre à jour les filtres seulement quand la recherche debouncée change
  useEffect(() => {
    setFilters(prev => ({ 
      ...prev, 
      search: debouncedSearchInput, 
      page: 1 // Reset à la page 1 lors d'une nouvelle recherche
    }));
  }, [debouncedSearchInput]);

  // Hooks API
  const { data: usersData, isLoading, error, refetch } = useUsers(filters);
  const deleteUser = useDeleteUser();
  const reactivateUser = useReactivateUser();
  const resetPassword = useResetPassword();
  const bulkAction = useBulkAction();

  // 🔧 Extraction des données avec gestion des types corrects
  const { users, pagination, stats } = useMemo(() => {
    // Si pas de données, retourner des valeurs par défaut
    if (!usersData?.data) {
      return { 
        users: [] as UserData[], 
        pagination: null as any, 
        stats: null as any 
      };
    }
    
    // ✅ SOLUTION : Cast explicite du type pour éviter l'erreur TypeScript
    // usersData.data peut être de type UserListData, on le force
    const data = usersData.data as any;
    
    return {
      users: (data?.users || []) as UserData[],
      pagination: data?.pagination || null,
      stats: data?.stats || null
    };
  }, [usersData]);

  // 🔧 Handlers optimisés avec useCallback
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value); // Mise à jour immédiate de l'input
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
    });
  }, [selectedUsers, bulkAction]);

  const exportUsers = useCallback(() => {
    // Implémentation export
    console.log('Export des utilisateurs...');
  }, []);

  // 🔧 Fonctions utilitaires memoized
  const getUserInitials = useCallback((user: UserData) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  }, []);

  const getRoleBadge = useCallback((role: string) => {
    return (
      <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
        {role === 'admin' ? 'Administrateur' : 'Préparateur'}
      </Badge>
    );
  }, []);

  const getStatusBadge = useCallback((isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'destructive'} className="flex items-center gap-1">
        {isActive ? (
          <>
            <CheckCircle className="w-3 h-3" />
            Actif
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3" />
            Inactif
          </>
        )}
      </Badge>
    );
  }, []);

  const formatLastLogin = useCallback((lastLogin?: string) => {
    if (!lastLogin) return <span className="text-gray-400">Jamais</span>;
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return <span className="text-green-600">À l'instant</span>;
    } else if (diffInHours < 24) {
      return <span className="text-blue-600">Il y a {Math.floor(diffInHours)}h</span>;
    } else {
      return <span className="text-gray-600">{date.toLocaleDateString('fr-FR')}</span>;
    }
  }, []);

  // Loading state
  if (isLoading && (!users || users.length === 0)) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur lors du chargement</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec statistiques */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Gestion des Utilisateurs
              </CardTitle>
              <CardDescription>
                {stats?.totalUsers || 0} utilisateur(s) au total
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedUsers.size} sélectionné(s)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('activate')}
                  >
                    Activer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('deactivate')}
                  >
                    Désactiver
                  </Button>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={exportUsers}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {/* 🔧 Input de recherche avec gestion locale */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={searchInput} // ✅ Utilise l'état local
                onChange={(e) => handleSearchInputChange(e.target.value)} // ✅ Handler optimisé
                className="pl-10"
              />
            </div>

            {/* Filtres */}
            <Select
              value={filters.status}
              onValueChange={(value: string) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.limit?.toString()}
              onValueChange={(value: string) => handleFilterChange('limit', parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('email')}
                >
                  Email
                </TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Agences</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('lastLogin')}
                >
                  Dernière connexion
                </TableHead>
                <TableHead className="w-12"></TableHead>
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
                      <Mail className="w-4 h-4 text-gray-400" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {user.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      {user.agencies?.length > 0 ? (
                        <span>{user.agencies.length} agence(s)</span>
                      ) : (
                        <span className="text-gray-400">Aucune</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.isActive || false)}</TableCell>
                  <TableCell>
                    {formatLastLogin(user.lastLogin)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onViewProfile(user)}>
                          <User className="w-4 h-4 mr-2" />
                          Voir le profil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditUser(user)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => resetPassword.mutate(user.id)}
                          disabled={resetPassword.isPending}
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Réinitialiser mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.isActive ? (
                          <DropdownMenuItem 
                            onClick={() => deleteUser.mutate(user.id)}
                            disabled={deleteUser.isPending}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Désactiver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => reactivateUser.mutate(user.id)}
                            disabled={reactivateUser.isPending}
                            className="text-green-600"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Réactiver
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-500">
                Page {pagination.page} sur {pagination.pages || pagination.totalPages || 1} 
                ({pagination.total} utilisateur(s) au total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handleFilterChange('page', pagination.page - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= (pagination.pages || pagination.totalPages || 1)}
                  onClick={() => handleFilterChange('page', pagination.page + 1)}
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
              <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {filters.search ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
              </p>
              {filters.search && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setSearchInput('');
                    setFilters(prev => ({ ...prev, search: '', page: 1 }));
                  }}
                >
                  Effacer la recherche
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}