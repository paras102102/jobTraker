import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button, Skeleton } from '@/components/UI';
import { useToast } from '@/components/Toast';
import { Application, ApplicationStatus } from '@/types';
import { Board } from './Board';
import { ApplicationDetailDialog } from './ApplicationDetailDialog';
import { ApplicationFormDialog } from './ApplicationFormDialog';
import { useBoard, useDeleteApplication } from './api';
import { STATUS_COLUMNS } from './boardUtils';

export function BoardPage() {
  const { data: board, isLoading, isError, refetch } = useBoard();
  const deleteMutation = useDeleteApplication();
  const { success: toastSuccess, error: toastError } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState<ApplicationStatus>('wishlist');
  const [editApp, setEditApp] = useState<Application | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const handleOpenAdd = (status: ApplicationStatus = 'wishlist') => {
    setEditApp(null);
    setInitialStatus(status);
    setFormOpen(true);
  };

  const handleOpenEdit = (app: Application) => {
    setDetailOpen(false);
    setEditApp(app);
    setInitialStatus(app.status);
    setFormOpen(true);
  };

  const handleOpenDetail = (app: Application) => {
    setSelectedApp(app);
    setDetailOpen(true);
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

  const totalApplications = board
    ? STATUS_COLUMNS.reduce((sum, col) => sum + (board[col.status]?.length || 0), 0)
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-zinc-50 dark:bg-zinc-950">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Board
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-[4px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
              {totalApplications} {totalApplications === 1 ? 'job' : 'jobs'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Track applications through every stage of your pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenAdd('wishlist')}
            className="flex items-center gap-1.5"
          >
            <Plus size={15} strokeWidth={2} />
            <span>New application</span>
          </Button>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 p-6 overflow-x-auto min-h-0">
        {isLoading && (
          <div className="flex gap-4 h-full items-start">
            {STATUS_COLUMNS.map((col) => (
              <div
                key={col.status}
                className="w-72 flex-shrink-0 bg-zinc-100/70 dark:bg-zinc-900/40 rounded-[6px] border border-zinc-200 dark:border-zinc-800/80 p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-6 rounded-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-20 w-full rounded-[6px]" />
                  <Skeleton className="h-20 w-full rounded-[6px]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Failed to load application board.
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

        {!isLoading && !isError && board && (
          <Board
            board={board}
            onAddClick={handleOpenAdd}
            onOpenDetail={handleOpenDetail}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Form Dialog for Create / Edit */}
      <ApplicationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialStatus={initialStatus}
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
