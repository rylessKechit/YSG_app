// admin-app/src/components/timesheets/timesheet-table.tsx - VERSION COMPLÈTE ET CORRIGÉE
'use client';

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  OnChangeFn,
  RowSelectionState,
} from '@tanstack/react-table';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock,
  Coffee,
  Edit,
  MoreHorizontal,
  Check,
  Flag,
  History,
  Trash2,
  AlertTriangle,
  CheckCircle,
  User,
  Building,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Timesheet } from '@/types/timesheet';

// ===== PROPS INTERFACE =====
export interface TimesheetTableProps {
  timesheets: Timesheet[];
  isLoading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (timesheet: Timesheet) => void;
  onValidate: (timesheet: Timesheet) => void;
  onDispute: (timesheet: Timesheet) => void;
  onDelete: (timesheet: Timesheet) => void;
  onViewHistory: (userId: string) => void;
  onViewDetails: (timesheet: Timesheet) => void;
}

// ===== FONCTIONS UTILITAIRES =====
const formatTime = (timeString?: string | null): string => {
  if (!timeString) return 'Non renseigné';
  try {
    if (timeString.includes('T')) {
      // Format ISO date
      return new Date(timeString).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    // Format HH:MM direct
    return timeString;
  } catch {
    return 'Format invalide';
  }
};

const formatDuration = (minutes?: number | null): string => {
  if (!minutes || minutes === 0) return '0h00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
};

const formatVariance = (variance?: number | null): string => {
  if (!variance || variance === 0) return 'À l\'heure';
  const sign = variance > 0 ? '+' : '';
  return `${sign}${variance}min`;
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    incomplete: { label: 'Incomplet', variant: 'destructive' as const },
    complete: { label: 'Complet', variant: 'secondary' as const },
    validated: { label: 'Validé', variant: 'default' as const }, // ✅ 'default' existe
    disputed: { label: 'En litige', variant: 'destructive' as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || 
                 { label: status, variant: 'secondary' as const };

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

// ===== COMPOSANT PRINCIPAL =====
export function TimesheetTable({
  timesheets,
  isLoading = false,
  selectedIds,
  onSelectionChange,
  onEdit,
  onValidate,
  onDispute,
  onDelete,
  onViewHistory,
  onViewDetails,
}: TimesheetTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ]);

  // ===== DÉFINITION DES COLONNES =====
  const columns: ColumnDef<Timesheet>[] = [
    // Colonne de sélection
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Sélectionner tout"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Sélectionner la ligne"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },

    // Colonne Employé - CORRIGÉE
    {
      accessorKey: 'user',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Employé
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original.user;
        
        // ✅ CORRECTION : Vérifier si user existe et n'est pas null
        if (!user || typeof user === 'string') {
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User className="h-4 w-4 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-500">
                  {typeof user === 'string' ? user : 'Utilisateur supprimé'}
                </p>
                <p className="text-sm text-gray-400">
                  Données non disponibles
                </p>
              </div>
            </div>
          );
        }
        
        // ✅ CORRECTION : Vérifier que firstName et lastName existent
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const email = user.email || '';
        
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {firstName[0] || '?'}{lastName[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {firstName} {lastName}
              </p>
              <p className="text-sm text-gray-500">
                {email}
              </p>
            </div>
          </div>
        );
      },
      sortingFn: (a, b) => {
        const userA = a.original.user;
        const userB = b.original.user;
        
        const nameA = typeof userA === 'object' && userA ? 
          `${userA.firstName || ''} ${userA.lastName || ''}` : 
          'Utilisateur supprimé';
        const nameB = typeof userB === 'object' && userB ? 
          `${userB.firstName || ''} ${userB.lastName || ''}` : 
          'Utilisateur supprimé';
          
        return nameA.localeCompare(nameB);
      },
    },

    // Colonne Agence - CORRIGÉE
    {
      accessorKey: 'agency',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Agence
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const agency = row.original.agency;
        
        // ✅ CORRECTION : Vérifier si agency existe
        if (!agency || typeof agency === 'string') {
          return (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium text-gray-500">
                  {typeof agency === 'string' ? agency : 'Agence supprimée'}
                </p>
                <p className="text-sm text-gray-400">Code non disponible</p>
              </div>
            </div>
          );
        }
        
        return (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-500" />
            <div>
              <p className="font-medium">{agency.name || 'Nom non disponible'}</p>
              <p className="text-sm text-gray-500">{agency.code || 'Code non disponible'}</p>
            </div>
          </div>
        );
      },
      sortingFn: (a, b) => {
        const agencyA = a.original.agency;
        const agencyB = b.original.agency;
        
        const nameA = typeof agencyA === 'object' && agencyA ? 
          agencyA.name || 'Agence supprimée' : 
          'Agence supprimée';
        const nameB = typeof agencyB === 'object' && agencyB ? 
          agencyB.name || 'Agence supprimée' : 
          'Agence supprimée';
          
        return nameA.localeCompare(nameB);
      },
    },

    // Colonne Date
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Date
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.date);
        return (
          <div>
            <p className="font-medium">
              {format(date, 'EEEE', { locale: fr })}
            </p>
            <p className="text-sm text-gray-500">
              {format(date, 'dd/MM/yyyy', { locale: fr })}
            </p>
          </div>
        );
      },
    },

    // Colonne Planning Prévu - CORRIGÉE
    {
      id: 'schedule',
      header: 'Planning Prévu',
      cell: ({ row }) => {
        const schedule = row.original.schedule;
        
        // ✅ CORRECTION : Vérifier si schedule existe
        if (!schedule || typeof schedule === 'string') {
          return (
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Aucun planning</span>
            </div>
          );
        }
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {schedule.startTime || '?'} - {schedule.endTime || '?'}
              </span>
            </div>
            {schedule.breakStart && schedule.breakEnd && (
              <div className="flex items-center gap-2 text-gray-500">
                <Coffee className="h-3 w-3" />
                <span className="text-xs">
                  Pause: {schedule.breakStart} - {schedule.breakEnd}
                </span>
              </div>
            )}
          </div>
        );
      },
    },

    // Colonne Pointage Réel
    {
      id: 'timesheet',
      header: 'Pointage Réel',
      cell: ({ row }) => {
        const timesheet = row.original;
        
        return (
          <div className="space-y-1">
            <div className="text-sm">
              <span className="font-medium">Début:</span> {formatTime(timesheet.startTime)}
            </div>
            <div className="text-sm">
              <span className="font-medium">Fin:</span> {formatTime(timesheet.endTime)}
            </div>
            {timesheet.breakStart && (
              <div className="text-sm text-gray-500">
                <Coffee className="h-3 w-3 inline mr-1" />
                {formatTime(timesheet.breakStart)} - {formatTime(timesheet.breakEnd)}
              </div>
            )}
            <div className="text-xs text-blue-600 font-medium">
              Total: {formatDuration(timesheet.totalWorkedMinutes)}
            </div>
          </div>
        );
      },
    },

    // Colonne Écarts
    {
      id: 'variance',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Écarts
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const delays = row.original.delays;
        
        if (!delays) {
          return <span className="text-gray-400">Aucun calcul</span>;
        }

        const hasDelays = delays.startDelay > 0 || delays.endDelay > 0;
        
        return (
          <div className="space-y-1">
            <div className={`text-sm ${delays.startDelay > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Début: {formatVariance(delays.startDelay)}
            </div>
            <div className={`text-sm ${delays.endDelay > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Fin: {formatVariance(delays.endDelay)}
            </div>
            {hasDelays && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
        );
      },
      sortingFn: (a, b) => {
        const delayA = (a.original.delays?.startDelay || 0) + (a.original.delays?.endDelay || 0);
        const delayB = (b.original.delays?.startDelay || 0) + (b.original.delays?.endDelay || 0);
        return delayA - delayB;
      },
    },

    // Colonne Statut
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Statut
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => getStatusBadge(row.original.status),
    },

    // Colonne Actions
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const timesheet = row.original;
        const canValidate = timesheet.status === 'complete';
        const canDispute = timesheet.status === 'validated';
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Ouvrir le menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(timesheet)}>
                <Edit className="mr-2 h-4 w-4" />
                Voir détails
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(timesheet)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {canValidate && (
                <DropdownMenuItem onClick={() => onValidate(timesheet)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Valider
                </DropdownMenuItem>
              )}
              {canDispute && (
                <DropdownMenuItem onClick={() => onDispute(timesheet)}>
                  <Flag className="mr-2 h-4 w-4" />
                  Contester
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => {
                  const userId = typeof timesheet.user === 'object' && timesheet.user 
                    ? timesheet.user.id 
                    : null;
                  if (userId) onViewHistory(userId);
                }}
                disabled={!timesheet.user || typeof timesheet.user === 'string'}
              >
                <History className="mr-2 h-4 w-4" />
                Historique
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(timesheet)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ===== CONFIGURATION DE LA TABLE =====
  const table = useReactTable({
    data: timesheets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: (updaterOrValue) => {
      const currentSelection = table.getState().rowSelection;
      const newSelection = typeof updaterOrValue === 'function' 
        ? updaterOrValue(currentSelection)
        : updaterOrValue;
      
      const selectedIds = Object.keys(newSelection).map(index => 
        timesheets[parseInt(index)]?.id
      ).filter(Boolean);
      
      onSelectionChange(selectedIds);
    },
    state: {
      sorting,
      rowSelection: timesheets.reduce((acc, timesheet, index) => {
        if (selectedIds.includes(timesheet.id)) {
          acc[index] = true;
        }
        return acc;
      }, {} as Record<string, boolean>),
    },
  });

  // ===== RENDU LOADING =====
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ===== RENDU PRINCIPAL =====
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="hover:bg-gray-50"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Aucun pointage trouvé.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}