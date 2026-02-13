# UniPick - AI Coding Agent Guide

> UniPick is a secondhand trading application designed for international students (initially targeting Virginia Tech students).

---

## Project Overview

UniPick is a full-stack web application that allows students to buy and sell secondhand items within their campus community. The application features:

- User authentication via Supabase Auth (email/password)
- Item listing with image uploads
- Location-based item discovery (PostGIS for geospatial data)
- Infinite scroll feed for browsing items
- Password reset functionality

### Architecture

```
unipick/
├── apps/
│   ├── web/              # Frontend (Astro + React)
│   └── backend/app/      # Backend API (FastAPI)
```

---

## Technology Stack

### Frontend (`apps/web/`)

| Technology | Purpose |
|------------|---------|
| [Astro](https://astro.build/) 5.17+ | Static site generation, server-side rendering |
| [React](https://react.dev/) 19 | Interactive UI components |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) 4.1+ | Utility-first styling |
| [TanStack Query](https://tanstack.com/query) | Server state management, infinite scroll |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Form handling and validation |
| [Supabase JS Client](https://supabase.com/docs/reference/javascript) | Authentication and storage |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Lucide React](https://lucide.dev/) | Icons |

### Backend (`apps/backend/app/`)

| Technology | Purpose |
|------------|---------|
| [FastAPI](https://fastapi.tiangolo.com/) | High-performance Python web framework |
| [SQLAlchemy](https://www.sqlalchemy.org/) 2.0 (async) | ORM for database operations |
| [asyncpg](https://magicstack.github.io/asyncpg/) | Async PostgreSQL driver |
| [GeoAlchemy2](https://geoalchemy-2.readthedocs.io/) + [Shapely](https://shapely.readthedocs.io/) | PostGIS geospatial support |
| [PyJWT](https://pyjwt.readthedocs.io/) | JWT token validation |
| [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | Environment configuration |
| [Supabase Python Client](https://supabase.com/docs/reference/python) | Supabase integration |

### Infrastructure

| Service | Purpose |
|---------|---------|
| [Supabase](https://supabase.com/) | PostgreSQL database, Auth, Storage |
| Docker | Containerization for backend |

---

## Directory Structure

```
apps/
├── web/                          # Frontend application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── Feed.tsx          # Infinite scroll item feed
│   │   │   ├── LoginForm.tsx     # User login form
│   │   │   ├── RegisterForm.tsx  # User registration form
│   │   │   ├── SellItemForm.tsx  # Item listing form with image upload
│   │   │   ├── UserMenu.tsx      # User dropdown menu
│   │   │   ├── Marketplace.tsx   # Main marketplace wrapper
│   │   │   ├── Providers.tsx     # React Query provider
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   └── UpdatePasswordForm.tsx
│   │   ├── layouts/
│   │   │   └── Layout.astro      # Root layout with navigation
│   │   ├── pages/                # Astro pages (file-based routing)
│   │   │   ├── index.astro       # Home page (marketplace)
│   │   │   ├── login.astro
│   │   │   ├── register.astro
│   │   │   ├── sell.astro        # Sell item page
│   │   │   ├── forgot-password.astro
│   │   │   └── update-password.astro
│   │   ├── styles/
│   │   │   └── global.css        # Tailwind CSS imports
│   │   └── env.d.ts              # Environment type definitions
│   ├── public/                   # Static assets
│   ├── astro.config.mjs          # Astro configuration
│   ├── tsconfig.json             # TypeScript configuration
│   └── package.json
│
└── backend/
    └── app/                      # Backend application
        ├── main.py               # FastAPI entry point
        ├── requirements.txt      # Python dependencies
        ├── dockerfile            # Docker configuration
        ├── .dockerignore
        ├── core/                 # Core utilities
        │   ├── config.py         # Settings (Pydantic)
        │   ├── database.py       # SQLAlchemy engine & session
        │   └── security.py       # JWT validation (Supabase)
        ├── api/
        │   └── v1/
        │       └── items/
        │           └── items.py  # Item CRUD endpoints
        ├── models/
        │   └── item.py           # SQLAlchemy Item model
        ├── schemas/
        │   └── item.py           # Pydantic Item schemas
        └── test/
            └── seed.py           # Test data generator
```

**Note:** The `apps/web/src/lib/supabase.ts` file is referenced by components but may not exist. It should export a Supabase client instance configured with environment variables.

---

## Environment Variables

### Frontend (`apps/web/.env`)

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (`apps/backend/.env`)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/database?ssl=require
```

**Important:** Never commit `.env` files. The backend requires `SUPABASE_KEY` with service-role privileges for some operations.

---

## Build and Development Commands

### Frontend

```bash
cd apps/web

# Install dependencies
npm install

# Start development server (localhost:4321)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend

```bash
cd apps/backend/app

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run development server (localhost:8000)
uvicorn main:app --reload

# Run with Docker
docker build -t unipick-backend .
docker run -p 8000:8000 --env-file ../../.env unipick-backend
```

---

## API Endpoints

### Items API (`/api/v1/items`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/items/?skip=0&limit=12` | List items (paginated) | No |
| POST | `/api/v1/items/` | Create new item | Yes |

### Health Checks

| Endpoint | Description |
|----------|-------------|
| GET `/` | API health check |
| GET `/test-db` | Database connection test |

### Planned

| Endpoint | Description |
|----------|-------------|
| POST `/predict-price` | AI-powered price prediction (coming soon) |

---

## Key Implementation Details

### Authentication Flow

1. Frontend uses Supabase Auth for sign up/login
2. Backend validates JWT tokens using Supabase JWKS endpoint
3. Protected routes use `get_current_user_id` dependency
4. Tokens are passed via `Authorization: Bearer <token>` header

### Database

- PostgreSQL with PostGIS extension for geospatial queries
- `items` table stores product listings with location data
- `location` column uses PostGIS `GEOGRAPHY(POINT, 4326)` type
- Images are stored in Supabase Storage (`item-images` bucket)

### Item Model

```python
class Item:
    id: int                    # Primary key
    user_id: UUID              # Supabase Auth user ID
    title: str                 # Item title
    description: str           # Item description
    price: float               # Price in USD
    images: list[str]          # Array of image URLs
    location: Geography        # PostGIS point
    location_name: str         # Human-readable location
```

### Frontend State Management

- **Server State:** TanStack Query (React Query) for API data
  - `staleTime: 60 * 1000` (1 minute)
  - `refetchOnWindowFocus: true`
  - Infinite scroll for item feed
- **Forms:** React Hook Form + Zod for validation
- **Auth:** Supabase Auth client-side session

---

## Code Style Guidelines

### Frontend (TypeScript/React)

- Use functional components with hooks
- Prefer `const` over `function` for component definitions
- Use Tailwind CSS for all styling (no CSS modules)
- Use `clsx` and `tailwind-merge` for conditional classes
- Form validation schemas in Zod, colocated with forms
- Client-side only components use `client:load` or `client:only` directives

### Backend (Python)

- Use async/await for all I/O operations
- SQLAlchemy 2.0 style (use `select()`, not `query()`)
- Pydantic v2 for data validation
- Dependency injection for database sessions
- Type hints required for all function signatures

---

## Testing

### Backend Test Data

```bash
cd apps/backend/app
python test/seed.py
```

This generates 20 fake items for testing purposes. Requires at least one user in the `auth.users` table.

---

## Security Considerations

1. **CORS:** Backend only accepts requests from `localhost:4321` in development
2. **JWT Validation:** Backend validates tokens against Supabase JWKS
3. **SQL Injection:** Protected by SQLAlchemy parameterized queries
4. **File Uploads:** Images validated by file type, stored in isolated Supabase bucket
5. **Environment Variables:** Service-role keys never exposed to frontend

---

## Common Issues

### Missing Supabase Client File

Components import from `../lib/supabase` but this file may not exist. Create:

```typescript
// apps/web/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)
```

### Database Connection

Backend uses `asyncpg` with SSL required. Ensure your `DATABASE_URL` includes `?ssl=require` or update `connect_args` in `database.py`.

### CORS Errors

If frontend can't connect to backend, verify:
1. Backend CORS origins include `http://localhost:4321`
2. Both services are running on correct ports
