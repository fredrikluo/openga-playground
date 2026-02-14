#!/bin/bash
# Creates additional databases on the Postgres instance.
# This script is run automatically by the postgres container on first startup.

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE kahoot;
    GRANT ALL PRIVILEGES ON DATABASE kahoot TO $POSTGRES_USER;
EOSQL
