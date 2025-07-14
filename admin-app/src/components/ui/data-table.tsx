// admin-app/src/components/ui/data-table.tsx - COMPOSANT COMPLET
'use client';

import React, { useState, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  ColumnDef,
} from '@tanstack/react-table';

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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings2,
  Search,
  X
} from 'lucide-react';

// ===== TYPES =====

export interface DataTablePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination?: DataTablePagination;
  onPaginationChange?: (page: number, limit: number) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  showPagination?: boolean;
  showColumnToggle?: boolean;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  rowClassName?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
}

// ===== COMPOSANT PRINCIPAL =====

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  onPaginationChange,
  onSelectionChange,
  searchable = false,
  searchPlaceholder = "Rechercher...",
  sortable = true,
  filterable = false,
  selectable = false,
  showPagination = true,
  showColumnToggle = false,
  className = "",
  emptyMessage = "Aucune donnée disponible",
  loading = false,
  rowClassName,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  
  // ===== ÉTAT LOCAL =====
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // ===== TABLE CONFIGURATION =====
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: showPagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
    getFilteredRowModel: filterable ? getFilteredRowModel() : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    manualPagination: !!pagination,
    pageCount: pagination?.totalPages ?? -1,
  });

  // ===== EFFECTS =====
  
  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange && selectable) {
      const selectedRows = table.getFilteredSelectedRowModel().rows;
      const selectedIds = selectedRows.map(row => {
        const rowData = row.original as any;
        return rowData.id || rowData._id || String(row.index);
      });
      onSelectionChange(selectedIds);
    }
  }, [rowSelection, onSelectionChange, selectable, table]);

  // ===== HANDLERS =====
  
  const handlePageChange = (newPage: number) => {
    if (pagination && onPaginationChange) {
      onPaginationChange(newPage, pagination.limit);
    } else {
      table.setPageIndex(newPage - 1);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (pagination && onPaginationChange) {
      onPaginationChange(1, newPageSize);
    } else {
      table.setPageSize(newPageSize);
    }
  };

  const clearFilters = () => {
    setGlobalFilter('');
    setColumnFilters([]);
    table.resetColumnFilters();
  };

  // ===== COMPUTED VALUES =====
  
  const currentPage = pagination?.page ?? table.getState().pagination.pageIndex + 1;
  const totalPages = pagination?.totalPages ?? table.getPageCount();
  const pageSize = pagination?.limit ?? table.getState().pagination.pageSize;
  const totalItems = pagination?.total ?? data.length;
  
  const startItem = ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // ===== RENDU =====
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toolbar */}
      {(searchable || showColumnToggle || filterable) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Search */}
            {searchable && (
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={globalFilter ?? ''}
                    onChange={(event) => setGlobalFilter(String(event.target.value))}
                    className="pl-8 max-w-sm"
                  />
                </div>
                {globalFilter && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Selection info */}
            {selectable && table.getFilteredSelectedRowModel().rows.length > 0 && (
              <Badge variant="secondary">
                {table.getFilteredSelectedRowModel().rows.length} sur{' '}
                {table.getFilteredRowModel().rows.length} sélectionné(s)
              </Badge>
            )}

            {/* Column visibility toggle */}
            {showColumnToggle && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4" />
                    Colonnes
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[150px]">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="px-4 py-3">
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center space-x-2 ${
                            header.column.getCanSort() && sortable
                              ? 'cursor-pointer select-none hover:text-foreground'
                              : ''
                          }`}
                          onClick={
                            header.column.getCanSort() && sortable
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {sortable && header.column.getCanSort() && (
                            <span className="text-muted-foreground">
                              {header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span>Chargement...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`
                    ${rowClassName ? rowClassName(row.original) : ''}
                    ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  `}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Affichage de {startItem} à {endItem} sur {totalItems} élément(s)
            </p>
            {selectable && table.getFilteredSelectedRowModel().rows.length > 0 && (
              <Badge variant="outline">
                {table.getFilteredSelectedRowModel().rows.length} sélectionné(s)
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-6 lg:space-x-8">
            {/* Page size selector */}
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Lignes par page</p>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="h-8 w-[70px] rounded border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {[10, 20, 30, 40, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Page info */}
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {currentPage} sur {totalPages}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}