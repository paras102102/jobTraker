import { describe, expect, it } from 'vitest';
import { applicationFormSchema } from '../ApplicationFormDialog';

describe('applicationFormSchema validation', () => {
  it('accepts valid application data', () => {
    const input = {
      company: 'Acme Corp',
      role_title: 'Full Stack Engineer',
      status: 'applied' as const,
      job_url: 'https://example.com/job/123',
      location: 'Remote',
      salary: '120000',
      currency: 'INR',
      notes: 'Initial intro call scheduled',
      job_description: 'Building modern web apps',
      deadline: '2025-12-31',
      applied_at: '2025-01-01',
    };

    const res = applicationFormSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it('rejects empty company and role title', () => {
    const input = {
      company: '   ',
      role_title: '',
      status: 'wishlist' as const,
    };

    const res = applicationFormSchema.safeParse(input);
    expect(res.success).toBe(false);
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors;
      expect(fieldErrors.company).toBeDefined();
      expect(fieldErrors.role_title).toBeDefined();
    }
  });

  it('rejects invalid job URLs', () => {
    const input = {
      company: 'Stripe',
      role_title: 'Backend Engineer',
      status: 'wishlist' as const,
      job_url: 'ftp://not-http.com',
    };

    const res = applicationFormSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it('rejects negative salary', () => {
    const input = {
      company: 'Stripe',
      role_title: 'Backend Engineer',
      status: 'wishlist' as const,
      salary: '-500',
    };

    const res = applicationFormSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it('rejects future applied_at date', () => {
    const futureDate = '2099-01-01';
    const input = {
      company: 'Google',
      role_title: 'Software Engineer',
      status: 'applied' as const,
      applied_at: futureDate,
    };

    const res = applicationFormSchema.safeParse(input);
    expect(res.success).toBe(false);
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors;
      expect(fieldErrors.applied_at?.[0]).toContain('future');
    }
  });
});
