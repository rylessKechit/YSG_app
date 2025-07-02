'use client';

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
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
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Timesheet } from '@/types/timesheet';
import { formatTime, formatDuration, formatVariance, getTimesheetStatusClasses } from '@/lib/utils/timesheet-utils';
import { STATUS_LABELS } from '@/lib/utils/constants';

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
}

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
}: TimesheetTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ]);

  const columns: ColumnDef<Timesheet>[] = [
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
    {
      accessorKey: 'user',
      header: 'Employé',
      cell: ({ row }) => {
        const user = row.original.user;
        if (typeof user === 'string') return user;
        
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500">
                {user.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'agency',
      header: 'Agence',
      cell: ({ row }) => {
        const agency = row.original.agency;
        if (typeof agency === 'string') return agency;
        
        return (
          <div>
            <p className="font-medium">{agency.name}</p>
            <p className="text-sm text-gray-500">{agency.code}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
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
    {
      id: 'schedule',
      header: 'Planning Prévu',
      cell: ({ row }) => {
        const schedule = row.original.schedule;
        if (!schedule || typeof schedule === 'string') {
          return <span className="text-gray-400">Aucun planning</span>;
        }
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                {schedule.startTime} - {schedule.endTime}
              </span>
            </div>
            {schedule.breakStart && schedule.breakEnd && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Coffee className="h-3 h-3" />
                <span>
                  Pause {schedule.breakStart} - {schedule.breakEnd}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'timesheet',
      header: 'Pointage Réel',
      cell: ({ row }) => {
        const timesheet = row.original;
        
        if (!timesheet.startTime) {
          return (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Pointage manquant</span>
            </div>
          );
        }
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {formatTime(timesheet.startTime)} - 
                {timesheet.endTime ? formatTime(timesheet.endTime) : '...'}
              </span>
            </div>
            {timesheet.breakStart && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Coffee className="h-3 w-3" />
                <span>
                  Pause {formatTime(timesheet.breakStart)} - 
                  {timesheet.breakEnd ? formatTime(timesheet.breakEnd) : '...'}
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              Travaillé: {formatDuration(timesheet.totalWorkedMinutes)}
            </div>
          </div>
        );
      },
    },
    {
      id: 'variance',
      header: 'Écart',
      cell: ({ row }) => {
        const delay = row.original.delays.startDelay;
        const variance = formatVariance(delay);
        
        let badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'default';
        
        if (delay === null || delay === 0) {
          badgeVariant = 'default';
        } else if (delay > 15) {
          badgeVariant = 'destructive';
        } else if (delay > 5) {
          badgeVariant = 'secondary';
        } else {
          badgeVariant = 'outline';
        }
        
        return (
          <div className="flex items-center gap-2">
            <Badge variant={badgeVariant}>
              {variance.text}
            </Badge>
            {delay > 15 && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {delay === 0 && <CheckCircle className="h-4 w-4 text-green-500" />}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const status = row.original.status;
        const statusClasses = getTimesheetStatusClasses(status);
        
        return (
          <Badge variant="outline" className={statusClasses.badge}>
            {STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const timesheet = row.original;
        const user = typeof timesheet.user === 'object' ? timesheet.user : null;
        
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(timesheet)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {timesheet.status !== 'validated' && (
                  <DropdownMenuItem onClick={() => onValidate(timesheet)}>
                    <Check className="h-4 w-4 mr-2" />
                    Valider
                  </DropdownMenuItem>
                )}
                
                {timesheet.status !== 'disputed' && (
                  <DropdownMenuItem onClick={() => onDispute(timesheet)}>
                    <Flag className="h-4 w-4 mr-2" />
                    Marquer litige
                  </DropdownMenuItem>
                )}
                
                {user && (
                  <DropdownMenuItem onClick={() => onViewHistory(user.id)}>
                    <History className="h-4 w-4 mr-2" />
                    Historique
                  </DropdownMenuItem>
                )}
                
                {timesheet.status !== 'validated' && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(timesheet)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: timesheets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: (updaterOrValue) => {
      const newSelection = typeof updaterOrValue === 'function' 
        ? updaterOrValue(table.getState().rowSelection)
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