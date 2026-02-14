# Kahoot Permission Emulator

A playground app for testing fine-grained authorization with [OpenFGA](https://openfga.dev). It emulates a Kahoot-like permission system with organizations, groups, folders, and documents (kahoots), where permissions are inherited through a folder hierarchy and gated by organization membership.

## Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| App | Next.js 15 + React 19 | UI and API routes |
| App DB | PostgreSQL 17 | Application data (users, orgs, folders, kahoots) |
| Auth | OpenFGA | Fine-grained authorization (permission checks, role assignments) |
| FGA DB | PostgreSQL 17 (shared instance) | OpenFGA's datastore |

All services run in Docker via docker-compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- `curl` and `jq` (for the setup script)
- GNU Make (optional, for shorthand commands)

## Quick Start

### Development (hot reload)

```bash
make dev
open http://localhost:3000
```

Your source code is mounted into the container — any file change is reflected immediately via Next.js hot reload.

### Production

```bash
make prod
open http://localhost:3000
```

Everything is fully automatic — on first request, the app creates the OpenFGA store and uploads the authorization model if they don't exist yet. No manual setup step needed.

### All Make commands

```bash
make dev              # Start dev environment with hot reload
make prod             # Build and start production environment
make generate-model   # Regenerate openfga-model.ts from model.fga
make setup            # Re-upload OpenFGA model via API
make down             # Stop all services
make clean            # Stop all services and delete all data
make logs             # Tail logs from all services
make help             # Show all available commands
```

### Without Make

```bash
# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The startup order is automatic: PostgreSQL starts first, then OpenFGA runs its database migration, then the OpenFGA server starts, and finally the app starts.

## Services & Ports

| Service | URL | Description |
|---------|-----|-------------|
| App | <http://localhost:3000> | Main application |
| OpenFGA API | <http://localhost:8080> | OpenFGA HTTP API |
| OpenFGA Playground | <http://localhost:3001> | Visual tool for exploring the FGA model |
| OpenFGA gRPC | localhost:8081 | gRPC endpoint |

## How It Works

### Authorization Model

The authorization model is defined in `openfga/model.fga` (the single source of truth). It implements:

- **Organizations** with `member` relations (the global permission gate)
- **Groups** with members, linked to organizations
- **Folders** with a hierarchy (`parent` relation) and role-based access:
  - `manager` - full access (edit, remove, lock, set visibility)
  - `editor` - can edit and create
  - `creator` - can create (direct assignment only, not inherited)
  - `viewer` - read-only access
- **Documents** (kahoots) inherit permissions from their parent folder
- All effective permissions require organization membership (`can_view_effective = can_view AND member from in_org`)
- Manager, editor, and viewer roles are inherited down the folder tree; creator is not

### Tuple Sync

When you create, update, or delete entities through the app, the corresponding OpenFGA tuples are automatically synced. For example:

- Creating a user in an org writes `user:<uuid>` is `member` of `organization:<uuid>`
- Creating a folder writes its `parent` and `in_org` tuples
- Creating a kahoot writes its `parent` (folder) and `in_org` tuples

The sync functions live in `src/lib/openfga-tuples.ts`. The database (PostgreSQL) is the source of truth; if a tuple write fails, the app logs the error but doesn't roll back the DB operation.

### Testing Permissions

1. Select a user from the "Login As" dropdown
2. Select an organization
3. Go to the **Folders** tab and navigate into a folder
4. Click the **Permissions** button to:
   - See your effective permissions (view, create, edit, remove, etc.)
   - View current role assignments on that folder
   - Assign roles (manager/editor/creator/viewer) to users
5. In the **Kahoots** tab, click on a kahoot to see its permission badges

## Project Structure

```text
src/
  app/
    api/
      organizations/       # Org CRUD + FGA tuple sync
      users/               # User CRUD + FGA tuple sync
      groups/              # Group CRUD + FGA tuple sync
      folders/             # Folder CRUD + FGA tuple sync
      kahoots/             # Kahoot CRUD + FGA tuple sync
      permissions/
        check/             # Single + batch permission checks
        object/            # All permissions for a user+object
        roles/             # Role assignment CRUD
  components/              # React UI components
  context/                 # UserContext, OrganizationContext
  hooks/                   # usePermissions, useRoleAssignments
  lib/
    db/                    # Database abstraction (PostgreSQL)
      types.ts             # Database interface
      postgres.ts          # PostgreSQL implementation
      schema.ts            # CREATE TABLE statements
      index.ts             # Connection + generateId()
    repositories/          # Data access layer
      userRepository.ts
      organizationRepository.ts
      groupRepository.ts
      folderRepository.ts
      kahootRepository.ts
      userOrganizationRepository.ts
    schema.ts              # TypeScript interfaces
    openfga.ts             # OpenFGA client singleton
    openfga-tuples.ts      # Tuple sync functions
    user-organization-helpers.ts
openfga/
  model.fga                # Authorization model (source of truth)
docker-compose.yml         # Shared infrastructure (postgres, openfga)
docker-compose.dev.yml     # Dev: mounts source, hot reload
docker-compose.prod.yml    # Prod: builds Docker image
Dockerfile
Makefile
setup-openfga.sh           # Creates store + uploads model
```

## Updating the Authorization Model

Edit `openfga/model.fga`, then regenerate the TypeScript model and restart:

```bash
make generate-model
# then restart the app (it auto-uploads on boot)
```

This converts `model.fga` into `src/lib/openfga-model.ts` using the `openfga/cli` Docker image — no local CLI needed. The app auto-uploads the model to OpenFGA on startup if none exists.

Alternatively, `make setup` uploads the model directly to the running OpenFGA instance without rebuilding the app.

## Resetting Data

```bash
make clean
make dev    # or: make prod
```

## Permission API Examples

```bash
# Check if a user can view a folder
curl "http://localhost:3000/api/permissions/check?user=user:<uuid>&relation=can_view_effective&object=folder:<uuid>"

# Get all permissions for a user on a folder
curl "http://localhost:3000/api/permissions/object?user=user:<uuid>&object=folder:<uuid>"

# Assign a role
curl -X POST http://localhost:3000/api/permissions/roles \
  -H "Content-Type: application/json" \
  -d '{"user": "user:<uuid>", "relation": "manager", "object": "folder:<uuid>"}'

# List role assignments
curl "http://localhost:3000/api/permissions/roles?object=folder:<uuid>"

# Remove a role
curl -X DELETE http://localhost:3000/api/permissions/roles \
  -H "Content-Type: application/json" \
  -d '{"user": "user:<uuid>", "relation": "manager", "object": "folder:<uuid>"}'
```
