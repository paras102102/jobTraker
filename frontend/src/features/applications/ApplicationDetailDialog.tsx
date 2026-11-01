import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button, Dialog } from '@/components/UI';
import { formatCurrency, formatDate, getDeadlineStatus } from '@/lib/utils';
import { Application } from '@/types';
import { StatusBadge } from './StatusBadge';

interface ApplicationDetailDialogProps {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
}

export function ApplicationDetailDialog({
  application,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ApplicationDetailDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!application) return null;

  const deadlineSeverity = getDeadlineStatus(application.deadline, application.status);
  const formattedSalary = formatCurrency(application.salary, application.currency);

  const handleDelete = () => {
    onDelete(application);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Header with Company, Role, Status, and Actions */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {application.company}
              </h2>
              <StatusBadge status={application.status} />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {application.role_title}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(application);
              }}
              aria-label="Edit application"
            >
              <Pencil size={12} strokeWidth={1.5} />
              <span>Edit</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              aria-label="Delete application"
            >
              <Trash2 size={12} strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Box */}
        {showDeleteConfirm && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-[6px] text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3">
            <span>Delete this application? This action cannot be undone.</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-[6px] bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
          <div>
            <span className="text-[11px] text-zinc-400 block mb-0.5">Location</span>
            <span className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200">
              <MapPin size={11} strokeWidth={1.5} className="text-zinc-400" />
              {application.location || '—'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-zinc-400 block mb-0.5">Salary</span>
            <span className="flex items-center gap-0.5 font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
              <DollarSign size={11} strokeWidth={1.5} className="text-zinc-400" />
              {formattedSalary || '—'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-zinc-400 block mb-0.5">Deadline</span>
            <span
              className={`flex items-center gap-1 font-mono tabular-nums ${
                deadlineSeverity === 'overdue'
                  ? 'text-rose-600 dark:text-rose-400 font-medium'
                  : deadlineSeverity === 'approaching'
                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-zinc-800 dark:text-zinc-200'
              }`}
            >
              <Calendar size={11} strokeWidth={1.5} />
              {formatDate(application.deadline)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-zinc-400 block mb-0.5">Applied Date</span>
            <span className="flex items-center gap-1 font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
              <Clock size={11} strokeWidth={1.5} className="text-zinc-400" />
              {formatDate(application.applied_at)}
            </span>
          </div>
        </div>

        {/* Job URL Link */}
        {application.job_url && (
          <div>
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">
              Job posting
            </span>
            <a
              href={application.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-400 hover:underline truncate max-w-full"
            >
              <span className="truncate">{application.job_url}</span>
              <ExternalLink size={12} strokeWidth={1.5} className="shrink-0" />
            </a>
          </div>
        )}

        {/* Notes */}
        {application.notes && (
          <div>
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">Notes</span>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap p-2.5 rounded-[4px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 leading-relaxed">
              {application.notes}
            </p>
          </div>
        )}

        {/* Job Description */}
        {application.job_description && (
          <div>
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">
              Job description
            </span>
            <div className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap p-2.5 rounded-[4px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 max-h-48 overflow-y-auto leading-relaxed">
              {application.job_description}
            </div>
          </div>
        )}

        {/* Timestamp Footer */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Added {formatDate(application.created_at)}</span>
          <span>Updated {formatDate(application.updated_at)}</span>
        </div>
      </div>
    </Dialog>
  );
}
