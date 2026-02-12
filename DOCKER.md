# Docker Setup for Kahoot Manager

This project includes a Docker Compose setup that runs both the Next.js application and an OpenFGA authorization server.

## Quick Start

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Wait for services to be ready and set up OpenFGA:**
   ```bash
   ./setup-openfga.sh
   ```

3. **Access the applications:**
   - **Next.js App**: http://localhost:3000
   - **OpenFGA API**: http://localhost:8080
   - **OpenFGA Playground**: http://localhost:3001

## Environment Variables

Copy the example environment file and customize as needed:
```bash
cp .env.example .env
```

## Data Persistence

- Application data is stored in `./data/` directory
- OpenFGA data is stored in `./data/openfga/` directory
- SQLite databases are persisted between container restarts

## Development

For development with hot reloading, you can run the Next.js app locally and just use Docker for OpenFGA:

```bash
# Start only OpenFGA
docker-compose up openfga -d

# Run Next.js locally
npm run dev
```

## Services

### app
- **Image**: Built from local Dockerfile
- **Ports**: 3000 (Next.js application)
- **Dependencies**: OpenFGA server

### openfga
- **Image**: openfga/openfga:latest
- **Ports**: 
  - 8080 (HTTP API)
  - 8081 (gRPC API)
  - 3001 (Playground UI)
- **Storage**: SQLite database in `./data/openfga/`

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart app

# Reset everything (including data)
docker-compose down -v
rm -rf data/
```

## Authorization Model

The OpenFGA authorization model is automatically loaded from `src/lib/openfga/model.fga` when you run the setup script. The model includes:

- **Organizations**: Top-level containers with member management
- **Groups**: Scoped collections of users within organizations
- **Folders**: Hierarchical containers with inherited permissions
- **Documents**: Content items with folder inheritance and direct permissions

See the model file for the complete permission structure.