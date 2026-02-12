#!/bin/bash

# Script to set up OpenFGA authorization model
# This script should be run after the containers are up and running

echo "Setting up OpenFGA authorization model..."

# Wait for OpenFGA to be ready
echo "Waiting for OpenFGA to be ready..."
until curl -f http://localhost:8080/healthz > /dev/null 2>&1; do
  echo "OpenFGA not ready yet, waiting..."
  sleep 2
done

echo "OpenFGA is ready!"

# Create a new authorization model
echo "Creating authorization model..."

# Read the model from file and create it via API
MODEL_CONTENT=$(cat src/lib/openfga/model.fga)

# Create the authorization model using curl
curl -X POST http://localhost:8080/stores \
  -H "Content-Type: application/json" \
  -d '{
    "name": "kahoot-manager"
  }' | jq -r '.id' > .store_id

STORE_ID=$(cat .store_id)

echo "Created store with ID: $STORE_ID"

# Upload the authorization model
curl -X POST "http://localhost:8080/stores/$STORE_ID/authorization-models" \
  -H "Content-Type: application/json" \
  -d "{
    \"schema_version\": \"1.1\",
    \"type_definitions\": $(cat src/lib/openfga/model.fga | tr -d '\n' | sed 's/model//' | sed 's/schema 1.1//')
  }"

echo ""
echo "✅ OpenFGA setup completed!"
echo "🌐 OpenFGA Playground: http://localhost:3001"  
echo "🔧 OpenFGA API: http://localhost:8080"
echo "📁 Store ID: $STORE_ID (saved to .store_id)"
echo ""
echo "Your authorization model has been uploaded to OpenFGA."