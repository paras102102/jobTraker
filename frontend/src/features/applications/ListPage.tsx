import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button, EmptyState, Input, Pagination, Select, Skeleton } from '@/components/UI';
import { useToast } from '@/components/Toast';
import { formatCurrency, formatDate, getDeadlineStatus } from '@/lib/utils';
import { Application, ApplicationStatus } from '@/types';
import { ApplicationDetailDialog } from './ApplicationDetailDialog';
import { ApplicationFormDialog } from './ApplicationFormDialog';
import { StatusBadge } from './StatusBadge';
import { useApplicationsList, useDeleteApplication } from './api';
import { STATUS_COLUMNS, STATUS_CONFIG } from './boardUtils';

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date created' },
  { value: 'updated_at', label: 'Date updated' },
  { value: 'company', label: 'Company' },
  { value: 'role_title', label: 'Role title' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'salary', label: 'Salary' },
];

export function ListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: toastSuccess, error: toastError } = useToast();
  const deleteMutation = useDeleteApplication();

  // Dialog States
  const [formOpen, setFormOpen] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Read URL params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '20', 10);
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
  const selectedStatuses = useMemo(() => {
    return searchParams.getAll('status') as ApplicationStatus[];
  }, [searchParams]);

  // Local search text for debouncing
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Debounce search input to URL query params (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput.trim()) {
          next.set('search', searchInput.trim());
        } else {
          next.delete('search');
        }
        next.set('page', '1'); // reset page on search
        return next;
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, setSearchParams]);

  // Keep local search input in sync if URL changes externally
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Fetch applications list
  const { data, isLoading, isError, refetch } = useApplicationsList({
    page,
    page_size: pageSize,
    search: searchQuery || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    sort_by: sortBy,
    order,
  });

  // Helpers to update query params
  const updateParams = (updates: Record<string, string | string[] | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else if (Array.isArray(value)) {
          next.delete(key);
          value.forEach((v) => next.append(key, v));
        } else {
          next.set(key, value);
        }
      });
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage.toString() });
  };

  const handleToggleStatus = (st: ApplicationStatus) => {
    const isSelected = selectedStatuses.includes(st);
    let nextStatuses: ApplicationStatus[];
    if (isSelected) {
      nextStatuses = selectedStatuses.filter((s) => s !== st);
    } else {
      nextStatuses = [...selectedStatuses, st];
    }
    updateParams({
      status: nextStatuses.length > 0 ? nextStatuses : null,
      page: '1',
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams({
      page: '1',
      page_size: pageSize.toString(),
      sort_by: 'created_at',
      order: 'desc',
    });
  };

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      // Toggle order
      updateParams({
        order: order === 'asc' ? 'desc' : 'asc',
        page: '1',
      });
    } else {
      updateParams({
        sort_by: newSortBy,
        order: 'desc',
        page: '1',
      });
    }
  };

  const handleDelete = (app: Application) => {
    deleteMutation.mutate(app.id, {
      onSuccess: () => {
        toastSuccess(`Deleted application at ${app.company}`);
        if (selectedApp?.id === app.id) {
          setDetailOpen(false);
          setSelectedApp(null);
        }
      },
      onError: (err) => {
        toastError(err.message || 'Failed to delete application');
      },
    });
  };

  const handleOpenAdd = () => {
    setEditApp(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (app: Application) => {
    setDetailOpen(false);
    setEditApp(app);
    setFormOpen(true);
  };

  const isFiltered = Boolean(searchQuery || selectedStatuses.length > 0);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Applications
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-[4px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
              {data?.total ?? 0} {data?.total === 1 ? 'total' : 'total'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Search, filter, and review all saved applications.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5"
        >
          <Plus size={15} strokeWidth={2} />
          <span>New application</span>
        </Button>
      </div>

      {/* Toolbar: Search, Status filters, Sort */}
      <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative w-64 max-w-full">
            <Search
              size={14}
              strokeWidth={1.5}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search company or role..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-[5px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Badges / Filter Toggles */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {STATUS_COLUMNS.map((col) => {
              const active = selectedStatuses.includes(col.status);
              return (
                <button
                  key={col.status}
                  type="button"
                  onClick={() => handleToggleStatus(col.status)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-[4px] border transition-colors ${
                    active
                      ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 underline ml-1"
            >
              Reset
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="h-8 px-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-[5px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => updateParams({ order: order === 'asc' ? 'desc' : 'asc' })}
            title={order === 'asc' ? 'Ascending' : 'Descending'}
            className="px-2"
          >
            {order === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading && (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Failed to load applications list.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {data.items.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  title={isFiltered ? 'No matching applications' : 'No applications yet. Add your first one.'}
                  description={
                    isFiltered
                      ? 'Try adjusting or clearing your filters to see more results.'
                      : 'Create your first job application card to begin tracking.'
                  }
                  actionLabel={isFiltered ? 'Clear filters' : '+ New application'}
                  onAction={isFiltered ? handleClearFilters : handleOpenAdd}
                />
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 select-none">
                      <th
                        className="py-2.5 px-4 font-medium cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSortChange('company')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Company</span>
                          {sortBy === 'company' && (
                            order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-4 font-medium cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSortChange('role_title')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Role</span>
                          {sortBy === 'role_title' && (
                            order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          )}
                        </div>
                      </th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th
                        className="py-2.5 px-4 font-medium cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSortChange('deadline')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Deadline</span>
                          {sortBy === 'deadline' && (
                            order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-4 font-medium cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSortChange('salary')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Salary</span>
                          {sortBy === 'salary' && (
                            order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-4 font-medium cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSortChange('updated_at')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Updated</span>
                          {sortBy === 'updated_at' && (
                            order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          )}
                        </div>
                      </th>
                      <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {data.items.map((app) => {
                      const deadlineStatus = getDeadlineStatus(app.deadline, app.status);
                      const formattedSalary = formatCurrency(app.salary, app.currency);

                      return (
                        <tr
                          key={app.id}
                          onClick={() => {
                            setSelectedApp(app);
                            setDetailOpen(true);
                          }}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer transition-colors"
                        >
                          {/* Company */}
                          <td className="py-2.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex items-center gap-2">
                              <span>{app.company}</span>
                              {app.job_url && (
                                <a
                                  href={app.job_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-zinc-400 hover:text-teal-700 dark:hover:text-teal-400"
                                  title="Open job link"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-2.5 px-4 text-zinc-700 dark:text-zinc-300">
                            {app.role_title}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-4">
                            <StatusBadge status={app.status} />
                          </td>

                          {/* Deadline */}
                          <td className="py-2.5 px-4">
                            {app.deadline ? (
                              <div
                                className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                                  deadlineStatus === 'overdue'
                                    ? 'text-rose-600 dark:text-rose-400 font-medium'
                                    : deadlineStatus === 'today'
                                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                                    : 'text-zinc-600 dark:text-zinc-400'
                                }`}
                              >
                                <Calendar size={12} strokeWidth={1.5} />
                                <span>{formatDate(app.deadline)}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Salary */}
                          <td className="py-2.5 px-4 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                            {formattedSalary || <span className="text-zinc-400 text-[11px]">—</span>}
                          </td>

                          {/* Updated */}
                          <td className="py-2.5 px-4 font-mono tabular-nums text-zinc-500 text-[11px]">
                            {formatDate(app.updated_at)}
                          </td>

                          {/* Row Actions */}
                          <td
                            className="py-2.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(app)}
                                className="p-1 rounded-[4px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                title="Edit application"
                              >
                                <Pencil size={13} strokeWidth={1.5} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(app)}
                                className="p-1 rounded-[4px] text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                title="Delete application"
                              >
                                <Trash2 size={13} strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4">
              <Pagination
                page={data.page}
                totalPages={data.total_pages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>

      {/* Form Dialog */}
      <ApplicationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editApplication={editApp}
      />

      {/* Detail Dialog */}
      <ApplicationDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        application={selectedApp}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
