# Kahoot Permission Emulator

A playground app for testing fine-grained authorization with [OpenFGA](https://openfga.dev). It emulates a Kahoot-like permission system with organizations, groups, folders, and documents (kahoots), where permissions are inherited through a folder hierarchy and gated by organization membership.

## Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| App | Next.js 15 + React 19 | UI and API routes |
| App DB | SQLite (better-sqlite3) | Application data (users, orgs, folders, kahoots) |
| Auth | OpenFGA | Fine-grained authorization (permission checks, role assignments) |
| FGA DB | PostgreSQL 17 | OpenFGA's datastore |

All services run in Docker via `docker-compose`.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- `curl` and `jq` (for the setup script)

## Quick Start

```bash
# 1. Start all services
docker compose up -d --build

# 2. Upload the authorization model to OpenFGA
./setup-openfga.sh

# 3. Open the app
open http://localhost:3000
```

The startup order is automatic: PostgreSQL starts first, then OpenFGA runs its database migration, then the OpenFGA server starts, and finally the app starts.

## Services & Ports

| Service | URL | Description |
|---------|-----|-------------|
| App | http://localhost:3000 | Main application |
| OpenFGA API | http://localhost:8080 | OpenFGA HTTP API |
| OpenFGA Playground | http://localhost:3001 | Visual tool for exploring the FGA model |
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

The sync functions live in `src/lib/openfga-tuples.ts`. The database (SQLite) is the source of truth; if a tuple write fails, the app logs the error but doesn't roll back the DB operation.

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

```
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
    db.ts                  # SQLite schema + generateId() helper
    schema.ts              # TypeScript interfaces
    openfga.ts             # OpenFGA client singleton (auto-discovers store)
    openfga-tuples.ts      # Low-level tuple helpers + high-level sync functions
    user-organization-helpers.ts
openfga/
  model.fga                # Authorization model (source of truth)
docker-compose.yml
Dockerfile
setup-openfga.sh           # Creates store + uploads model
```

## Updating the Authorization Model

Edit `openfga/model.fga`, then re-run the setup script:

```bash
./setup-openfga.sh
docker compose restart app
```

The setup script uses the `openfga/cli` Docker image to transform the `.fga` DSL to JSON on the fly, so no local FGA CLI installation is needed.

## Resetting Data

```bash
# Stop everything
docker compose down

# Delete app database and OpenFGA data
rm -rf data/

# Rebuild and start
docker compose up -d --build
./setup-openfga.sh
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
