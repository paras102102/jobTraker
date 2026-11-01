export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role_title: string;
  job_url: string | null;
  location: string | null;
  salary: number | string | null;
  currency: string;
  status: ApplicationStatus;
  position: number;
  notes: string | null;
  job_description: string | null;
  deadline: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationCreateInput {
  company: string;
  role_title: string;
  job_url?: string | null;
  location?: string | null;
  salary?: number | null;
  currency?: string;
  status?: ApplicationStatus;
  notes?: string | null;
  job_description?: string | null;
  deadline?: string | null;
  applied_at?: string | null;
}

export type ApplicationUpdateInput = Partial<ApplicationCreateInput>;

export interface ApplicationMoveInput {
  status: ApplicationStatus;
  position: number;
}

export interface ApplicationListResponse {
  items: Application[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BoardResponse {
  wishlist: Application[];
  applied: Application[];
  interview: Application[];
  offer: Application[];
  rejected: Application[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiErrorDetail {
  loc?: (string | number)[];
  msg: string;
  type?: string;
}

export interface ApiErrorResponse {
  detail: string | ApiErrorDetail[];
}
