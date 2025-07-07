// src/components/users/user-profile.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Key, 
  Trash2, 
  RotateCcw,
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Calendar,
  Clock,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useUser, useDeleteUser, useReactivateUser, useResetPassword } from '@/hooks/api/useUsers';
import { User as UserType } from '@/types/auth';

interface UserProfileProps {
  userId: string;
  onEdit?: (user: UserType) => void;
}

export function UserProfile({ userId, onEdit }: UserProfileProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // Hooks API - CORRECTION: Supprimer useUserStats car l'endpoint n'existe pas
  const { data: user, isLoading, error, refetch } = useUser(userId);
  // const { data: stats, isLoading: isLoadingStats } = useUserStats(userId); // ❌ SUPPRIMÉ
  const deleteUser = useDeleteUser();
  const reactivateUser = useReactivateUser();
  const resetPassword = useResetPassword();

  // Les stats viennent directement de l'utilisateur
  const stats = user?.stats;

  // Handlers
  const handleBack = () => {
    router.push('/users');
  };

  const handleEdit = () => {
    if (onEdit && user) {
      onEdit(user);
    } else {
      router.push(`/users/${userId}/edit`);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword.mutateAsync(userId);
      refetch();
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  const handleToggleStatus = async () => {
    try {
      if (user?.isActive) {
        await deleteUser.mutateAsync(userId);
      } else {
        await reactivateUser.mutateAsync(userId);
      }
      refetch();
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  // Fonctions utilitaires
  const getUserInitials = (user: UserType) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
  if (error || !user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur lors du chargement</p>
            <Button onClick={handleBack}>Retour à la liste</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-8 w-8" />
              Profil utilisateur
            </h1>
            <p className="text-gray-600 mt-1">
              Détails et statistiques de {user.firstName} {user.lastName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleResetPassword}>
                <Key className="w-4 h-4 mr-2" />
                Réinitialiser mot de passe
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.isActive ? (
                <DropdownMenuItem 
                  onClick={handleToggleStatus}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Désactiver
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={handleToggleStatus}
                  className="text-green-600"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Réactiver
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Informations principales */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>

            {/* Informations de base */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-semibold">
                  {user.firstName} {user.lastName}
                </h2>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' ? 'Administrateur' : 'Préparateur'}
                </Badge>
                <span className={user.isActive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {user.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{user.email}</span>
                </div>
                
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{user.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Créé le {formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="agencies">Agences</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Statistiques de base */}
            {stats ? (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.totalPreparations || 0}</div>
                    <p className="text-xs text-gray-600">Préparations totales</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.averageTime || 0}min</div>
                    <p className="text-xs text-gray-600">Temps moyen</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.onTimeRate || 0}%</div>
                    <p className="text-xs text-gray-600">Taux de ponctualité</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {user.lastLogin ? formatDate(user.lastLogin).split(' ')[0] : 'Jamais'}
                    </div>
                    <p className="text-xs text-gray-600">Dernière connexion</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="col-span-full">
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-gray-500">Aucune statistique disponible</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Prénom:</span>
                  <span className="font-medium">{user.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nom:</span>
                  <span className="font-medium">{user.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Téléphone:</span>
                  <span className="font-medium">{user.phone || 'Non renseigné'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rôle:</span>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Administrateur' : 'Préparateur'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Statut:</span>
                  <span className={user.isActive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {user.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Historique du compte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Créé le:</span>
                  <span className="font-medium">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Modifié le:</span>
                  <span className="font-medium">{formatDate(user.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernière connexion:</span>
                  <span className="font-medium">{formatDate(user.lastLogin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID utilisateur:</span>
                  <span className="font-mono text-sm">{user.id}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agences */}
        <TabsContent value="agencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Agences assignées
              </CardTitle>
              <CardDescription>
                Liste des agences où cet utilisateur peut travailler
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.agencies && user.agencies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.agencies.map((agency: any) => (
                    <Card key={agency.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <h3 className="font-semibold">{agency.name}</h3>
                          {agency.code && (
                            <p className="text-sm text-gray-600">Code: {agency.code}</p>
                          )}
                          {agency.address && (
                            <p className="text-sm text-gray-600">{agency.address}</p>
                          )}
                          {agency.client && (
                            <Badge variant="outline">{agency.client}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Aucune agence assignée</p>
                  <p className="text-sm text-gray-500">
                    Modifiez l'utilisateur pour lui assigner des agences
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activité */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statistiques de performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Préparations totales:</span>
                      <span className="text-2xl font-bold">{stats.totalPreparations || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Temps moyen par préparation:</span>
                      <span className="text-2xl font-bold">{stats.averageTime || 0} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Taux de ponctualité:</span>
                      <span className="text-2xl font-bold">{stats.onTimeRate || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Dernière activité:</span>
                      <span className="font-medium">{formatDate(user.lastLogin)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Aucune donnée de performance</p>
                    <p className="text-sm text-gray-500">
                      Les statistiques apparaîtront après les premières préparations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions récentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activité récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Aucune activité récente</p>
                  <p className="text-sm text-gray-500">
                    L'historique des actions apparaîtra ici
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statut du compte */}
          <Card>
            <CardHeader>
              <CardTitle>État du compte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {user.isActive ? (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Ce compte est <strong>actif</strong>. L'utilisateur peut se connecter et effectuer des préparations.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Ce compte est <strong>désactivé</strong>. L'utilisateur ne peut pas se connecter.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Permissions:</span>
                    <ul className="mt-1 space-y-1">
                      {user.role === 'admin' ? (
                        <>
                          <li>✅ Accès administration</li>
                          <li>✅ Gestion des utilisateurs</li>
                          <li>✅ Gestion des agences</li>
                          <li>✅ Rapports et statistiques</li>
                        </>
                      ) : (
                        <>
                          <li>✅ Préparation de véhicules</li>
                          <li>✅ Consultation planning</li>
                          <li>✅ Mise à jour statuts</li>
                          <li>❌ Administration</li>
                        </>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Restrictions:</span>
                    <ul className="mt-1 space-y-1">
                      <li>{user.agencies?.length || 0} agence(s) assignée(s)</li>
                      <li>Accès limité aux données d'agence</li>
                      {!user.isActive && <li className="text-red-600">Compte désactivé</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}