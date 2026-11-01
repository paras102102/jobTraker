import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/components/Toast';
import { Button, Dialog, Input, Select, Textarea } from '@/components/UI';
import { useCreateApplication, useUpdateApplication } from './api';
import { STATUS_COLUMNS, STATUS_CONFIG } from './boardUtils';
import { Application, ApplicationCreateInput, ApplicationStatus, ApplicationUpdateInput } from '@/types';

export const applicationFormSchema = z
  .object({
    company: z
      .string()
      .trim()
      .min(1, 'Company name is required')
      .max(150, 'Company cannot exceed 150 characters'),
    role_title: z
      .string()
      .trim()
      .min(1, 'Role title is required')
      .max(150, 'Role title cannot exceed 150 characters'),
    status: z.enum(['wishlist', 'applied', 'interview', 'offer', 'rejected'] as const),
    job_url: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          try {
            const u = new URL(val);
            return u.protocol === 'http:' || u.protocol === 'https:';
          } catch {
            return false;
          }
        },
        { message: 'Must be a valid http or https URL' }
      ),
    location: z.string().trim().max(150, 'Location cannot exceed 150 characters').optional(),
    salary: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const num = Number(val);
          return !isNaN(num) && num >= 0;
        },
        { message: 'Salary must be a positive number' }
      ),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .default('INR')
      .refine((val) => /^[A-Z]{3}$/.test(val), {
        message: 'Currency must be a 3-letter code (e.g. INR, USD)',
      }),
    deadline: z.string().optional(),
    applied_at: z.string().optional(),
    notes: z.string().max(5000, 'Notes cannot exceed 5000 characters').optional(),
    job_description: z.string().max(20000, 'Job description cannot exceed 20000 characters').optional(),
  })
  .refine(
    (data) => {
      if (!data.applied_at) return true;
      const todayStr = new Date().toISOString().split('T')[0];
      return data.applied_at <= todayStr;
    },
    {
      message: 'applied_at cannot be in the future',
      path: ['applied_at'],
    }
  );

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

interface ApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatus?: ApplicationStatus;
  editApplication?: Application | null;
}

export function ApplicationFormDialog({
  open,
  onOpenChange,
  initialStatus = 'wishlist',
  editApplication = null,
}: ApplicationFormDialogProps) {
  const [showJd, setShowJd] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const createMutation = useCreateApplication();
  const updateMutation = useUpdateApplication();

  const isEditMode = Boolean(editApplication);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      company: '',
      role_title: '',
      status: initialStatus,
      job_url: '',
      location: '',
      salary: '',
      currency: 'INR',
      deadline: '',
      applied_at: '',
      notes: '',
      job_description: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (editApplication) {
        reset({
          company: editApplication.company,
          role_title: editApplication.role_title,
          status: editApplication.status,
          job_url: editApplication.job_url || '',
          location: editApplication.location || '',
          salary: editApplication.salary !== null && editApplication.salary !== undefined ? String(editApplication.salary) : '',
          currency: editApplication.currency || 'INR',
          deadline: editApplication.deadline || '',
          applied_at: editApplication.applied_at || '',
          notes: editApplication.notes || '',
          job_description: editApplication.job_description || '',
        });
        setShowJd(Boolean(editApplication.job_description));
      } else {
        reset({
          company: '',
          role_title: '',
          status: initialStatus,
          job_url: '',
          location: '',
          salary: '',
          currency: 'INR',
          deadline: '',
          applied_at: '',
          notes: '',
          job_description: '',
        });
        setShowJd(false);
      }
    }
  }, [open, editApplication, initialStatus, reset]);

  const onSubmit = async (values: ApplicationFormValues) => {
    try {
      if (isEditMode && editApplication) {
        // Build PATCH payload with only changed fields
        const patchData: ApplicationUpdateInput = {};

        if (dirtyFields.company) patchData.company = values.company.trim();
        if (dirtyFields.role_title) patchData.role_title = values.role_title.trim();
        if (dirtyFields.status) patchData.status = values.status;
        if (dirtyFields.currency) patchData.currency = values.currency.trim().toUpperCase();

        if (dirtyFields.job_url) {
          patchData.job_url = values.job_url ? values.job_url.trim() : null;
        }
        if (dirtyFields.location) {
          patchData.location = values.location ? values.location.trim() : null;
        }
        if (dirtyFields.salary) {
          patchData.salary = values.salary ? parseFloat(values.salary) : null;
        }
        if (dirtyFields.deadline) {
          patchData.deadline = values.deadline || null;
        }
        if (dirtyFields.applied_at) {
          patchData.applied_at = values.applied_at || null;
        }
        if (dirtyFields.notes) {
          patchData.notes = values.notes ? values.notes.trim() : null;
        }
        if (dirtyFields.job_description) {
          patchData.job_description = values.job_description ? values.job_description.trim() : null;
        }

        await updateMutation.mutateAsync({
          id: editApplication.id,
          data: patchData,
        });

        toastSuccess(`Updated ${values.company}`);
      } else {
        // Create full payload
        const createPayload: ApplicationCreateInput = {
          company: values.company.trim(),
          role_title: values.role_title.trim(),
          status: values.status,
          currency: values.currency.trim().toUpperCase() || 'INR',
          job_url: values.job_url ? values.job_url.trim() : null,
          location: values.location ? values.location.trim() : null,
          salary: values.salary ? parseFloat(values.salary) : null,
          deadline: values.deadline || null,
          applied_at: values.applied_at || null,
          notes: values.notes ? values.notes.trim() : null,
          job_description: values.job_description ? values.job_description.trim() : null,
        };

        await createMutation.mutateAsync(createPayload);
        toastSuccess(`Added application for ${values.company}`);
      }

      onOpenChange(false);
    } catch (err: any) {
      toastError(err?.message || 'Failed to save application');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Edit application' : 'New application'}
      description={
        isEditMode
          ? 'Update details for this job application.'
          : 'Track a new opportunity in your pipeline.'
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Company *
            </label>
            <Input
              placeholder="e.g. Acme Corp"
              error={errors.company?.message}
              {...register('company')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Role title *
            </label>
            <Input
              placeholder="e.g. Backend Engineer"
              error={errors.role_title?.message}
              {...register('role_title')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Status
            </label>
            <Select {...register('status')}>
              {STATUS_COLUMNS.map((st) => (
                <option key={st} value={st}>
                  {STATUS_CONFIG[st].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Job URL
            </label>
            <Input
              type="url"
              placeholder="https://..."
              error={errors.job_url?.message}
              {...register('job_url')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Location
            </label>
            <Input
              placeholder="e.g. Remote"
              error={errors.location?.message}
              {...register('location')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Salary
            </label>
            <Input
              type="number"
              step="any"
              placeholder="120000"
              error={errors.salary?.message}
              {...register('salary')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Currency
            </label>
            <Input
              placeholder="INR"
              maxLength={3}
              error={errors.currency?.message}
              {...register('currency')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Deadline
            </label>
            <Input
              type="date"
              error={errors.deadline?.message}
              {...register('deadline')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Applied date
            </label>
            <Input
              type="date"
              error={errors.applied_at?.message}
              {...register('applied_at')}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Notes
          </label>
          <Textarea
            placeholder="Recruiter contact, referral details, or notes..."
            rows={2}
            error={errors.notes?.message}
            {...register('notes')}
          />
        </div>

        {/* Collapsible Job Description */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowJd(!showJd)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            {showJd ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Job description (optional)</span>
          </button>
          {showJd && (
            <div className="mt-2">
              <Textarea
                placeholder="Paste the job description here..."
                rows={4}
                error={errors.job_description?.message}
                {...register('job_description')}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {isEditMode ? 'Save changes' : 'Add application'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
