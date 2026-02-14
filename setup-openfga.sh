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

# Create the authorization model using curl
curl -X POST http://localhost:8080/stores \
  -H "Content-Type: application/json" \
  -d '{
    "name": "kahoot-manager"
  }' | jq -r '.id' > .store_id

STORE_ID=$(cat .store_id)

echo "Created store with ID: $STORE_ID"

# Convert the FGA model to JSON and upload it
MODEL_JSON=$(fga model transform --file openfga/model.fga)

MODEL_RESPONSE=$(curl -s -X POST "http://localhost:8080/stores/$STORE_ID/authorization-models" \
  -H "Content-Type: application/json" \
  -d "$MODEL_JSON")

MODEL_ID=$(echo "$MODEL_RESPONSE" | jq -r '.authorization_model_id')

echo "$MODEL_ID" > .model_id

echo ""
echo "OpenFGA setup completed!"
echo "OpenFGA Playground: http://localhost:3001"
echo "OpenFGA API: http://localhost:8080"
echo "Store ID: $STORE_ID (saved to .store_id)"
echo "Model ID: $MODEL_ID (saved to .model_id)"
echo ""
echo "Your authorization model has been uploaded to OpenFGA."
echo ""
echo "Optional: set these in your .env or docker-compose.yml:"
echo "  OPENFGA_STORE_ID=$STORE_ID"
echo "  OPENFGA_MODEL_ID=$MODEL_ID"
echo ""
echo "Note: The app auto-discovers the store by name if these are not set."