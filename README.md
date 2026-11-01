# JobTrackr

> Job Application Tracker with AI Resume Analyzer

JobTrackr is an end-to-end full-stack application built to streamline job hunting, track applications through custom stages, and evaluate resumes against target job descriptions using AI.

---

## Problem Statement
Job seekers frequently struggle with disorganized application tracking across multiple spreadsheets and portal accounts, while also lacking instant, actionable feedback on whether their resumes match specific job descriptions before applying.

---

## Features
- **Kanban Application Board**: Visualize and manage applications across statuses (Wishlist, Applied, Interview, Offer, Rejected).
- **AI Resume Analyzer**: Automated keyword gap analysis, ATS compatibility scoring, and tailored resume bullet improvements.
- **Deadline & Interview Reminders**: Automated alerts for upcoming application deadlines and scheduled interview rounds.
- **Role-Based Access Control**: Secure user workspaces with isolation and role management.

---

## Tech Stack
- **Backend**: FastAPI, Python 3.11+, SQLAlchemy 2.0, Alembic, Pydantic v2
- **Database**: PostgreSQL 16
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Containerization**: Docker & Docker Compose
- **Quality & Testing**: Pytest, Ruff

---

## Architecture
*(Placeholder - Architectural diagram and request flow to be added in subsequent milestones)*

---

## Setup
### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### Quickstart
1. Clone the repository and navigate to root:
   ```bash
   cp .env.example .env
   ```
2. Start PostgreSQL and FastAPI backend via Docker Compose:
   ```bash
   docker compose up --build
   ```
3. Run database migrations:
   ```bash
   docker compose exec backend alembic upgrade head
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```

---

## API Docs
Once the backend container is running:
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## Testing
Run backend unit and integration tests:
```bash
pytest backend/tests
```

Check code quality with Ruff:
```bash
ruff check backend
```

---

## Deployment
*(Placeholder - Cloud deployment and production Docker configuration to be detailed in Part 8)*

---

## Screenshots
*(Placeholder - UI screenshots will be added once frontend views are built)*

---

## Future Improvements
- Browser extension for 1-click job clipping from LinkedIn and Indeed
- Email synchronization for automatic application status updates
- Multi-language resume parsing and localized keyword analysis
