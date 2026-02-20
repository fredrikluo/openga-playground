# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Kahoot-like permission playground demonstrating fine-grained authorization with OpenFGA. Full-stack Next.js 15 app with PostgreSQL, featuring hierarchical permissions on organizations, groups, folders, and documents (kahoots).

## Commands

### Development & Production (via Makefile, requires Docker)

```bash
make dev              # Start dev environment (hot reload, port 3000)
make prod             # Build and start production (port 8080)
make down             # Stop all services
make clean            # Stop services and delete all data
make logs             # Tail logs from all services
make generate-model   # Regenerate src/lib/openfga-model.ts from openfga/model.fga
make setup            # Re-upload OpenFGA model via API
```

### NPM Scripts (run inside container or locally)

```bash
npm run dev           # Next.js dev server
npm run build         # Production build
npm run lint          # ESLint
npm run db:init       # Initialize database schema
```

There is no test suite in this project.

## Architecture

### Tech Stack

- **Next.js 15** (React 19) with App Router and API Routes
- **PostgreSQL 17** via `pg` library (repository pattern)
- **OpenFGA** for fine-grained authorization (`@openfga/sdk`)
- **Tailwind CSS 4** for styling
- **Docker Compose** for orchestration (PostgreSQL, OpenFGA, app)

### Key Layers

1. **UI Components** (`src/components/`) — Tab-based interface for managing orgs, users, groups, folders, kahoots
2. **React Context** (`src/context/`) — `UserContext` and `OrganizationContext` for global state
3. **Custom Hooks** (`src/hooks/usePermissions.ts`) — `usePermissions()` and `useRoleAssignments()` with caching
4. **API Routes** (`src/app/api/`) — RESTful CRUD endpoints that sync both PostgreSQL and OpenFGA tuples
5. **Repository Layer** (`src/lib/repositories/`) — Data access objects for each entity
6. **Database** (`src/lib/db/`) — PostgreSQL implementation with `Database` interface abstraction
7. **Authorization**:
   - `src/lib/openfga.ts` — OpenFGA client singleton (auto-discovers store/model on startup)
   - `src/lib/openfga-tuples.ts` — Syncs FGA tuples when DB entities change
   - `src/lib/policy.ts` — Multi-layer permission checks: FGA check first, then policy constraints (e.g., limited member restrictions)
   - `openfga/model.fga` — Authorization model DSL (source of truth)
   - `src/lib/openfga-model.ts` — Auto-generated from model.fga via `make generate-model`

### Data Flow

Entity mutations go through: **UI → API Route → Repository (PostgreSQL) → FGA Tuple Sync (OpenFGA)**

Permission checks go through: **usePermissions hook → GET /api/permissions/object → checkWithPolicy() → FGA Check + Policy Layer**

### Authorization Model

Defined in `openfga/model.fga`. Key concepts:
- **Roles:** manager, editor, creator, viewer — assigned to users, group#member, or organization#member
- **Inheritance:** manager/editor/viewer permissions cascade down folder hierarchy via `parent` relation; creator does not
- **Organization gating:** All effective permissions (`can_*_effective`) require organization membership (AND with `member`)
- **Tuple sync philosophy:** DB is source of truth; if FGA tuple write fails, error is logged but DB operation is not rolled back

### Docker Services

| Service | Port | Notes |
|---------|------|-------|
| Next.js App | 3000 (dev) / 8080 (prod) | Main application |
| PostgreSQL | 5432 | Two databases: `openfga` (FGA internal) and `kahoot` (app data) |
| OpenFGA | 8080 (HTTP), 8081 (gRPC) | Authorization engine |
| OpenFGA Playground | 3001 | Visual FGA model explorer |
