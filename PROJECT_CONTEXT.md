# JobTrackr - Project Context

## 1. Project Description
**JobTrackr** is a production-grade full-stack portfolio application designed for job seekers. It features a Kanban-style Job Application Tracker combined with an AI-powered Resume Analyzer that evaluates resumes against job descriptions, computes match scores, identifies keyword gaps, and suggests tailoring improvements.

---

## 2. Chosen Tech Stack
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0 (typed declarative mapping), Alembic, Pydantic v2 + `pydantic-settings`
- **Security & Auth**: `bcrypt` (direct password hashing), `PyJWT` (JWT creation/verification), `slowapi` (IP-based in-memory rate limiting), `email-validator`
- **Database**: PostgreSQL 16 (relational database with UUID PKs, JSONB, native Enums, and indexes)
- **Containerization**: Docker Compose (`db` service with Postgres 16 health checks, `backend` service with volume mount and live reloading)
- **Testing & Quality**: pytest, HTTPX (TestClient), Ruff (linter/formatter)
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS (bare scaffold in Part 1)

---

## 3. Monorepo Folder Structure
```text
jobtrackr/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── 0001_initial_schema.py    # Initial migration creating all 5 tables
│   │   ├── env.py                        # Wired to settings.DATABASE_URL and Base.metadata
│   │   ├── script.py.mako
│   │   └── README
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                       # FastAPI initialization, CORS, SlowAPI rate limiting, router mounting
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py                 # Pydantic v2 BaseSettings loading from .env
│   │   │   ├── database.py               # Engine, SessionLocal, Base, get_db dependency
│   │   │   ├── deps.py                   # get_current_user (OAuth2 Bearer) and require_admin dependencies
│   │   │   ├── limiter.py                # SlowAPI limiter instance
│   │   │   └── security.py               # Direct bcrypt hashing, PyJWT token creation & decoding
│   │   ├── models/
│   │   │   ├── __init__.py               # Exports Base and all 5 ORM models
│   │   │   ├── user.py                   # User model & UserRole enum
│   │   │   ├── application.py            # Application model & ApplicationStatus enum
│   │   │   ├── resume.py                 # Resume model
│   │   │   ├── resume_analysis.py        # ResumeAnalysis model (JSONB keywords & suggestions)
│   │   │   └── reminder.py               # Reminder model & ReminderType, ReminderStatus enums
│   │   ├── schemas/
│   │   │   ├── __init__.py               # Schema exports
│   │   │   ├── auth.py                   # SignupRequest, TokenResponse, RefreshRequest schemas
│   │   │   ├── user.py                   # UserOut, UserUpdate, ChangePasswordRequest, AdminUserUpdate, PaginatedUsersResponse
│   │   │   └── application.py            # ApplicationCreate, ApplicationUpdate, ApplicationMove, ApplicationOut, BoardResponse
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── user_service.py           # User DB operations (create, authenticate, update, change_password, list_users)
│   │   │   └── application_service.py    # Application DB operations (create, get, list, update, delete, move, get_board)
│   │   ├── scripts/
│   │   │   ├── __init__.py
│   │   │   └── create_admin.py           # Idempotent superadmin CLI seeder
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── health.py                 # GET /api/health with real database SELECT 1 check
│   │       ├── auth.py                   # POST /api/auth/signup, login, refresh (rate limited)
│   │       ├── users.py                  # GET/PATCH /api/users/me, POST /api/users/me/change-password
│   │       ├── admin.py                  # GET /api/admin/users, PATCH /api/admin/users/{user_id}
│   │       └── applications.py           # CRUD, Kanban board, and drag-and-drop move endpoints
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                   # Isolated test DB session, TestClient, user fixtures, rate limiting controls
│   │   ├── test_health.py                # Pytest test cases for /api/health
│   │   ├── test_security.py              # Unit tests for bcrypt, PyJWT create/decode, token type validation
│   │   ├── test_auth.py                  # Tests for signup, login, refresh, rate-limit 429
│   │   ├── test_users.py                 # Tests for /me, update profile, change password flow
│   │   ├── test_admin.py                 # Tests for admin authorization, user listing, self-protection rules
│   │   └── test_applications.py          # Tests for application CRUD, Kanban move, filtering, sorting, and board
│   ├── alembic.ini                       # Alembic config for backend directory execution
│   ├── Dockerfile                        # Multi-stage Python 3.11 container setup
│   ├── requirements.txt                  # Pinned dependencies
│   └── .env.example                      # Safe placeholder environment template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Toast.tsx                 # Auto-dismissing toast notifications context & UI
│   │   │   └── UI.tsx                    # Utilitarian Button, Input, Select, Textarea, Dialog, Pagination
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── AuthContext.tsx       # Auth provider, token refresh queue, login/logout handlers
│   │   │   │   ├── ProtectedRoute.tsx    # Auth guard with redirect
│   │   │   │   ├── LoginPage.tsx         # 2-column split login screen
│   │   │   │   └── SignupPage.tsx        # 2-column split signup screen
│   │   │   └── applications/
│   │   │       ├── __tests__/            # boardUtils & schema validation tests
│   │   │       ├── api.ts                # TanStack query hooks (board, list, mutations)
│   │   │       ├── boardUtils.ts         # Contiguous drag-and-drop calculation logic
│   │   │       ├── StatusBadge.tsx       # Muted dot status indicator
│   │   │       ├── ApplicationCard.tsx   # Kanban sortable card component
│   │   │       ├── Column.tsx            # Droppable column container
│   │   │       ├── Board.tsx             # @dnd-kit context & drag overlay
│   │   │       ├── ApplicationFormDialog.tsx   # Create & Edit modal (dirty fields PATCH)
│   │   │       ├── ApplicationDetailDialog.tsx # Full detail overview modal
│   │   │       ├── BoardPage.tsx         # /board route view
│   │   │       └── ListPage.tsx          # /applications route table with search & sort
│   │   ├── layouts/
│   │   │   └── AppLayout.tsx             # Responsive utilitarian sidebar layout
│   │   ├── lib/
│   │   │   ├── __tests__/                # Utils unit tests
│   │   │   ├── api.ts                    # Axios client, 401 interceptor, error parser
│   │   │   ├── auth.ts                   # In-memory access token, localStorage refresh token
│   │   │   ├── queryClient.ts            # TanStack QueryClient instance
│   │   │   └── utils.ts                  # cn, formatCurrency, formatDate, getDeadlineStatus
│   │   ├── styles/
│   │   │   └── index.css                 # IBM Plex Sans imports, dark mode tokens
│   │   ├── types/
│   │   │   └── index.ts                  # TypeScript types matching backend schemas
│   │   ├── App.tsx                       # React Router & provider tree
│   │   └── main.tsx                      # Vite React DOM entry point
│   ├── index.html                        # Clean HTML5 entry point
│   ├── package.json                      # Pinned frontend dependencies
│   ├── tsconfig.json                     # TypeScript strict mode configuration
│   └── vite.config.ts                    # Vite build configuration
├── alembic.ini                           # Root Alembic configuration
├── docker-compose.yml                    # Multi-container orchestration (db + backend)
├── .env.example                          # Root environment template
├── .gitignore                            # Python, Node, Vite, test, and uploads ignore rules
├── README.md                             # Project documentation skeleton
└── PROJECT_CONTEXT.md                    # Single source of truth for all 8 parts
```

---

## 4. Full Database Schema Summary

### `users` Table
- `id` (UUID, Primary Key, default `uuid.uuid4`)
- `email` (VARCHAR(255), Unique, Indexed, NOT NULL)
- `password_hash` (VARCHAR(255), NOT NULL)
- `full_name` (VARCHAR(255), NOT NULL)
- `role` (ENUM: `user`, `admin`, default `'user'`, NOT NULL)
- `is_active` (BOOLEAN, default `true`, NOT NULL)
- `created_at` (TIMESTAMPTZ, server_default `now()`, NOT NULL)
- `updated_at` (TIMESTAMPTZ, server_default `now()`, onupdate `now()`, NOT NULL)
- **Relationships**: `applications` (1:N, cascade delete), `resumes` (1:N, cascade delete), `reminders` (1:N, cascade delete)

### `applications` Table
- `id` (UUID, Primary Key, default `uuid.uuid4`)
- `user_id` (UUID, Foreign Key `users.id` ON DELETE CASCADE, Indexed, NOT NULL)
- `company` (VARCHAR(255), NOT NULL)
- `role_title` (VARCHAR(255), NOT NULL)
- `job_url` (VARCHAR(1024), Nullable)
- `location` (VARCHAR(255), Nullable)
- `salary` (NUMERIC(12, 2), Nullable)
- `currency` (VARCHAR(10), default `'INR'`, NOT NULL)
- `status` (ENUM: `wishlist`, `applied`, `interview`, `offer`, `rejected`, default `'wishlist'`, NOT NULL)
- `position` (INTEGER, Kanban column order index, default `0`, NOT NULL)
- `notes` (TEXT, Nullable)
- `job_description` (TEXT, Nullable)
- `deadline` (DATE, Nullable)
- `applied_at` (DATE, Nullable)
- `created_at` (TIMESTAMPTZ, server_default `now()`, NOT NULL)
- `updated_at` (TIMESTAMPTZ, server_default `now()`, onupdate `now()`, NOT NULL)
- **Composite Indexes**:
  - `ix_applications_user_id_status` on (`user_id`, `status`)
  - `ix_applications_user_id_deadline` on (`user_id`, `deadline`)
- **Relationships**: `user` (N:1), `resume_analyses` (1:N), `reminders` (1:N, cascade delete)

### `resumes` Table
- `id` (UUID, Primary Key, default `uuid.uuid4`)
- `user_id` (UUID, Foreign Key `users.id` ON DELETE CASCADE, Indexed, NOT NULL)
- `filename` (VARCHAR(255), NOT NULL)
- `storage_path` (VARCHAR(1024), NOT NULL)
- `extracted_text` (TEXT, Nullable)
- `uploaded_at` (TIMESTAMPTZ, server_default `now()`, NOT NULL)
- **Relationships**: `user` (N:1), `analyses` (1:N, cascade delete)

### `resume_analyses` Table
- `id` (UUID, Primary Key, default `uuid.uuid4`)
- `resume_id` (UUID, Foreign Key `resumes.id` ON DELETE CASCADE, Indexed, NOT NULL)
- `application_id` (UUID, Foreign Key `applications.id` ON DELETE SET NULL, Indexed, Nullable)
- `job_description` (TEXT, NOT NULL)
- `match_score` (INTEGER, range 0–100, NOT NULL)
- `missing_keywords` (JSONB, array of strings/objects, NOT NULL)
- `suggestions` (JSONB, array of actionable suggestions, NOT NULL)
- `model_used` (VARCHAR(100), e.g. `'gemini-2.5-flash'`, NOT NULL)
- `created_at` (TIMESTAMPTZ, server_default `now()`, NOT NULL)
- **Relationships**: `resume` (N:1), `application` (N:1, optional)

### `reminders` Table
- `id` (UUID, Primary Key, default `uuid.uuid4`)
- `user_id` (UUID, Foreign Key `users.id` ON DELETE CASCADE, Indexed, NOT NULL)
- `application_id` (UUID, Foreign Key `applications.id` ON DELETE CASCADE, Indexed, NOT NULL)
- `type` (ENUM: `interview`, `deadline`, NOT NULL)
- `remind_at` (TIMESTAMPTZ, NOT NULL)
- `status` (ENUM: `pending`, `sent`, `failed`, default `'pending'`, NOT NULL)
- `sent_at` (TIMESTAMPTZ, Nullable)
- `created_at` (TIMESTAMPTZ, server_default `now()`, NOT NULL)
- **Composite Index**:
  - `ix_reminders_status_remind_at` on (`status`, `remind_at`)
- **Relationships**: `user` (N:1), `application` (N:1)

---

## 5. API Endpoints (Current State)

| Method | Endpoint | Access Level | Description & Query Parameters / Limits |
|---|---|---|---|
| `GET` | `/api/health` | Public | Live database connectivity check (`SELECT 1`) |
| `POST` | `/api/auth/signup` | Public | Register standard account (Rate limit: 3/min per IP) |
| `POST` | `/api/auth/login` | Public | OAuth2 password form login returning JWT tokens (Rate limit: 5/min per IP) |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token for a new token pair (Rate limit: 10/min per IP) |
| `GET` | `/api/users/me` | Authenticated | Retrieve current user profile (`UserOut`) |
| `PATCH`| `/api/users/me` | Authenticated | Update current user's profile (`full_name`) |
| `POST` | `/api/users/me/change-password` | Authenticated | Verify old password and set new password |
| `GET` | `/api/admin/users` | Admin Only | Paginated user listing with search query (`page`, `page_size`, `search`) |
| `PATCH`| `/api/admin/users/{user_id}` | Admin Only | Update target user `is_active` or `role` (blocks self-deactivation/demotion) |
| `POST` | `/api/applications` | Authenticated | Create new application card at end of target status column |
| `GET` | `/api/applications` | Authenticated | Filtered listing: `page`, `page_size`, `search`, `status` (multi), `deadline_before`, `deadline_after`, `has_deadline`, `sort_by` (whitelisted), `order` (`asc`/`desc`, NULLS LAST on deadline/salary) |
| `GET` | `/api/applications/board` | Authenticated | Single-query Kanban board view grouped by all 5 columns sorted by position |
| `GET` | `/api/applications/{application_id}` | Authenticated | Retrieve application details (404 on missing or belonging to other user) |
| `PATCH`| `/api/applications/{application_id}` | Authenticated | Partial update; moving status appends to end of new column; auto-sets `applied_at` if moved to `applied` |
| `DELETE`| `/api/applications/{application_id}` | Authenticated | Delete card and re-index column positions to keep 0..n-1 contiguous |
| `PATCH`| `/api/applications/{application_id}/move` | Authenticated | Kanban drag-and-drop: updates column & position in one transaction with contiguity preserved |

---

## 6. Move & Position Integrity Rules
1. **Contiguous Indexing**: Positions within each status column are strictly 0-indexed and contiguous (`0 .. N-1`).
2. **Column Insertion**: New applications or cards moved to a new column via generic `PATCH` are placed at the end (`position = max_position + 1` or `0`).
3. **Kanban Move (Drag-and-Drop)**:
   - When moving within the same column, items between old and new positions shift up/down to preserve zero-gap contiguous ordering.
   - When moving across columns:
     - Gaps in the source column are closed (`position = position - 1` for items above the removed card).
     - Gaps in the destination column are opened at the clamped target index (`position = position + 1` for items at or after the target).
     - Target position is clamped to `[0, destination_column_size]`.
4. **Auto-applied Date**: Transitioning status to `"applied"` (either via `PATCH` or `/move`) automatically sets `applied_at` to the current date if unset.

---

## 7. Environment Variables List
| Variable | Description | Default / Example Value |
|---|---|---|
| `ENVIRONMENT` | Runtime environment name | `development` |
| `POSTGRES_USER` | Postgres container user | `jobtrackr_user` |
| `POSTGRES_PASSWORD` | Postgres container password | `jobtrackr_password` |
| `POSTGRES_DB` | Postgres database name | `jobtrackr_db` |
| `DATABASE_URL` | SQLAlchemy / Alembic connection string | `postgresql://jobtrackr_user:jobtrackr_password@db:5432/jobtrackr_db` |
| `TEST_DATABASE_URL` | Dedicated test database URL (optional, defaults to SQLite in-memory for testing) | `postgresql://jobtrackr_user:jobtrackr_password@db:5432/jobtrackr_test_db` |
| `SECRET_KEY` | Secret key for JWT signing (min 32 chars) | `dev_insecure_secret_key_change_in_production_min_32_chars` |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Expiry duration for access tokens | `1440` (24 hours) |
| `REFRESH_TOKEN_EXPIRE_DAYS`| Expiry duration for refresh tokens | `7` (7 days) |
| `ADMIN_EMAIL` | Default email for `create_admin` seeder | `admin@jobtrackr.io` |
| `ADMIN_PASSWORD` | Default initial password for `create_admin` seeder | `Admin@12345` |
| `FRONTEND_URL` | Frontend origin permitted by CORS | `http://localhost:3000` |

---

## 8. Parts Roadmap
- [x] **Part 1: Project Setup + Database Schema** *(Done)*
  - Monorepo folder structure (`backend/`, `frontend/`, root orchestration)
  - SQLAlchemy 2.0 typed models (`users`, `applications`, `resumes`, `resume_analyses`, `reminders`)
  - Alembic migrations configured and migration script generated
  - Docker Compose for PostgreSQL 16 and FastAPI
  - Pydantic v2 settings, `GET /api/health` with `SELECT 1` check, and Pytest test suite
- [x] **Part 2: Authentication & User Management** *(Done)*
  - Direct `bcrypt` password hashing and constant-time verification
  - `PyJWT` access token & refresh token generation, validation, and type enforcement
  - Pydantic v2 validation schemas (`SignupRequest`, `TokenResponse`, `UserOut`, `UserUpdate`, etc.)
  - `get_current_user` and `require_admin` FastAPI dependencies
  - Thin API routers under `/api`: `auth`, `users`, `admin`
  - In-memory `slowapi` rate limiting (signup: 3/min, login: 5/min, refresh: 10/min)
  - Database service layer `app/services/user_service.py` with SQLAlchemy 2.0 select queries
  - Idempotent CLI administrator seeder `app/scripts/create_admin.py`
  - Comprehensive 28-test Pytest test suite covering auth, security, user profile, admin rules, and rate limits
- [x] **Part 3: Applications Kanban CRUD API** *(Done)*
  - Pydantic schemas in `app/schemas/application.py` (`ApplicationCreate`, `ApplicationUpdate`, `ApplicationMove`, `ApplicationOut`, `ApplicationListResponse`, `BoardResponse`)
  - Full CRUD and drag-and-drop operations in `app/services/application_service.py` with position contiguity enforcement
  - Fast single-query Kanban board view (`/api/applications/board`)
  - Secure scoped endpoints under `/api/applications` with user isolation (404 on cross-user queries)
  - Search filter escaping `%` and `_` wildcards, multi-status filters, deadline ranges, and NULLS LAST sorting
  - 37/37 Pytest tests passing covering all CRUD operations, board views, validations, and edge cases
- [x] **Part 4: Frontend (Auth screens + Kanban board + Applications list)** *(Done)*
  - React 18, Vite, TypeScript, React Router v6, TanStack Query v5, Tailwind CSS v3.4 tokens
  - Utilitarian Linear/Notion inspired aesthetic: neutral palette, 1px subtle borders, max 6px radius, ink teal accent (`#0f766e`), muted status dots, tabular numbers
  - Authentication feature: `LoginPage` and `SignupPage` with 2-column split layout, in-memory access token storage, localStorage refresh token, single-flight Axios refresh queue with concurrent request replay
  - Protected routing: `ProtectedRoute` and `AppLayout` with responsive collapsible navigation and user profile
  - Applications Kanban board (`/board`): `@dnd-kit` drag-and-drop with 5px pointer activation constraint, optimistic UI reordering with query cancellation and rollback, contiguous 0..n-1 position recalculation
  - Applications list table (`/applications`): debounced search (300ms), multi-status filter toggles, column sorting, pagination controls, deadline urgency badges
  - Hand-crafted Radix dialogs: `ApplicationFormDialog` (with dirtyFields-only PATCH submission) and `ApplicationDetailDialog`
  - Automated testing: Vitest suite (20/20 passing) covering contiguous position math, deadline severity calculations, currency/date formatters, and form schema validations
- [ ] **Part 5: Resume Upload & AI Analyzer** (PDF/DOCX extraction, Gemini scoring, keyword gap analysis)
- [ ] **Part 6: Reminders & Notification Service** (Background task scheduling, deadline alerts)
- [ ] **Part 7: Analytics & Reporting** (Conversion rates, pipeline metrics, interview velocity)
- [ ] **Part 8: Integration, Polish & Deployment Preparation** (E2E workflows, production docker builds)

