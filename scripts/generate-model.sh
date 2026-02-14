#!/bin/bash

# Generates src/lib/openfga-model.ts from openfga/model.fga
# Uses the openfga/cli Docker image — no local CLI needed.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_FILE="$PROJECT_DIR/openfga/model.fga"
OUTPUT_FILE="$PROJECT_DIR/src/lib/openfga-model.ts"

if [ ! -f "$MODEL_FILE" ]; then
  echo "Error: $MODEL_FILE not found"
  exit 1
fi

echo "Transforming model.fga to JSON..."
MODEL_JSON=$(docker run --rm -i openfga/cli model transform --file /dev/stdin --input-format fga < "$MODEL_FILE")

echo "Writing $OUTPUT_FILE..."
cat > "$OUTPUT_FILE" << EOF
import type { WriteAuthorizationModelRequest } from '@openfga/sdk';

/**
 * Auto-generated from openfga/model.fga
 * Run: make generate-model
 */
export const AUTHORIZATION_MODEL: WriteAuthorizationModelRequest = $MODEL_JSON;
EOF

echo "Done."
