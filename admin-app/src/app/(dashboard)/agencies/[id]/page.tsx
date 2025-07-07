// admin-app/src/app/(dashboard)/agencies/[id]/page.tsx - PAGE DETAIL AGENCE
'use client&apos;;

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  RotateCcw,
  Building,
  MapPin,
  Phone,
  Mail,
  Hash,
  Users,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal
} from &apos;lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from &apos;@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { AgencyForm } from '@/components/agencies/agency-form';

import { 
  useAgency, 
  useAgencyStats, 
  useAgencyUsers, 
  useDeleteAgency, 
  useReactivateAgency 
} from &apos;@/hooks/api/useAgencies';
import { Agency } from '@/types/agency';

interface AgencyDetailPageProps {
  params: {
    id: string;
  };
}

export default function AgencyDetailPage({ params }: AgencyDetailPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Hooks API
  const { data: agency, isLoading, error, refetch } = useAgency(params.id);
  const { data: stats, isLoading: isLoadingStats } = useAgencyStats(params.id);
  const { data: users, isLoading: isLoadingUsers } = useAgencyUsers(params.id);
  const deleteAgency = useDeleteAgency();
  const reactivateAgency = useReactivateAgency();

  // Handlers
  const handleBack = () => {
    router.push('/agencies');
  };

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    refetch();
  };

  const handleToggleStatus = async () => {
    if (!agency) return;
    
    try {
      if (agency.isActive) {
        await deleteAgency.mutateAsync(agency.id);
      } else {
        await reactivateAgency.mutateAsync(agency.id);
      }
      refetch();
      setShowDeleteConfirm(false);
    } catch (error) {
      // Erreur gérée par le hook
    }
  };

  // Fonctions utilitaires
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: &apos;numeric',
      month: &apos;long',
      day: &apos;numeric',
      hour: &apos;2-digit',
      minute: &apos;2-digit'
    });
  };

  const getStatusBadge = (isActive?: boolean) => {
    if (isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Building className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Agence non trouvée</h3>
              <p className="text-gray-600 mb-4">
                L&apos;agence demandée n&apos;existe pas ou n&apos;est plus accessible.
              </p>
              <Button onClick={handleBack}>
                Retour à la liste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{agency.name}</h1>
              {getStatusBadge(agency.isActive)}
            </div>
            <p className="text-gray-600">
              Code: <span className="font-mono font-medium">{agency.code}</span>
              {agency.client && (
                <>
                  {' • '}
                  <Badge variant="outline">{agency.client}</Badge>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier l&apos;agence
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => setShowDeleteConfirm(true)}
                className={agency.isActive ? "text-red-600" : "text-green-600"}
              >
                {agency.isActive ? (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Désactiver
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Réactiver
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}'
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informations principales */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Informations générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Nom</Label>
                      <p className="text-sm">{agency.name}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Code</Label>
                      <p className="text-sm font-mono">{agency.code}</p>
                    </div>
                    
                    {agency.client && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Client</Label>
                        <p className="text-sm">{agency.client}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Statut</Label>
                      <div className="mt-1">
                        {getStatusBadge(agency.isActive)}
                      </div>
                    </div>
                  </div>

                  {agency.address && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Adresse
                      </Label>
                      <p className="text-sm mt-1">{agency.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {agency.phone ? (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{agency.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-gray-500">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">Téléphone non renseigné</span>
                      </div>
                    )}

                    {agency.email ? (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a 
                          href={`mailto:${agency.email}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {agency.email}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-gray-500">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Email non renseigné</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Statistiques rapides */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Statistiques
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Utilisateurs</span>
                        <span className="font-medium">{stats.totalUsers}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Actifs</span>
                        <span className="font-medium text-green-600">{stats.activeUsers}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Préparations</span>
                        <span className="font-medium">{stats.totalPreparations}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Temps moyen</span>
                        <span className="font-medium">{stats.averageTime}min</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Taux de réussite</span>
                        <span className="font-medium text-blue-600">{stats.completionRate}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Informations système */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations système</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Créée le</Label>
                    <p className="text-sm">{formatDate(agency.createdAt)}</p>
                  </div>
                  
                  {agency.updatedAt && agency.updatedAt !== agency.createdAt && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Modifiée le</Label>
                      <p className="text-sm">{formatDate(agency.updatedAt)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Utilisateurs */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Utilisateurs de l&apos;agence
              </CardTitle>
              <CardDescription>
                Liste des utilisateurs assignés à cette agence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : users && users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={user.role === &apos;admin' ? &apos;default' : 'secondary'}>
                          {user.role === &apos;admin' ? &apos;Admin' : 'Préparateur'}
                        </Badge>
                        <Badge variant={user.isActive ? &apos;default' : 'secondary'}>
                          {user.isActive ? &apos;Actif' : 'Inactif'}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/users/${user.id}`)}
                        >
                          Voir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Aucun utilisateur assigné à cette agence</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistiques détaillées */}
        <TabsContent value="statistics" className="space-y-6">
          {isLoadingStats ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{stats.completionRate}%</div>
                      <p className="text-sm text-gray-600">Taux de réussite</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stats.averageTime}min</div>
                      <p className="text-sm text-gray-600">Temps moyen</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Équipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{stats.activeUsers}</div>
                      <p className="text-sm text-gray-600">Utilisateurs actifs</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stats.totalUsers}</div>
                      <p className="text-sm text-gray-600">Total utilisateurs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">{stats.totalPreparations}</div>
                      <p className="text-sm text-gray-600">Préparations</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stats.totalSchedules}</div>
                      <p className="text-sm text-gray-600">Plannings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Les statistiques détaillées ne sont pas disponibles pour cette agence.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Activité */}
        <TabsContent value="activity" className="space-y-6">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Le journal d&apos;activité sera disponible dans une prochaine version.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Dialog de modification */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;agence</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l&apos;agence ci-dessous.
            </DialogDescription>
          </DialogHeader>
          
          <AgencyForm
            agency={agency}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={agency.isActive ? "Désactiver l&apos;agence" : "Réactiver l'agence"}
        description={
          agency.isActive
            ? `Êtes-vous sûr de vouloir désactiver l&apos;agence "${agency.name}" ? Elle ne sera plus accessible aux utilisateurs.`
            : `Êtes-vous sûr de vouloir réactiver l&apos;agence "${agency.name}" ?`
        }
        confirmText={agency.isActive ? "Désactiver" : "Réactiver"}
        cancelText="Annuler"
        variant={agency.isActive ? "destructive" : "default"}
        onConfirm={handleToggleStatus}
        loading={deleteAgency.isPending || reactivateAgency.isPending}
      />
    </div>
  );
}