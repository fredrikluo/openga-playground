import { OpenFgaClient, TupleKey, TupleKeyWithoutCondition, ConsistencyPreference } from '@openfga/sdk';

const STORE_NAME = 'kahoot-manager';

let fgaClient: OpenFgaClient | null = null;
let initialized = false;

/**
 * Get or create the OpenFGA client singleton.
 * Auto-discovers the store by name if OPENFGA_STORE_ID is not set.
 */
export async function getClient(): Promise<OpenFgaClient> {
  if (fgaClient && initialized) {
    return fgaClient;
  }

  const apiUrl = process.env.OPENFGA_API_URL || 'http://localhost:8080';
  const storeId = process.env.OPENFGA_STORE_ID;
  const modelId = process.env.OPENFGA_MODEL_ID;

  if (storeId) {
    fgaClient = new OpenFgaClient({ apiUrl, storeId, authorizationModelId: modelId || undefined });
    // If we have a store ID but no model ID, discover it
    if (!modelId) {
      try {
        const modelResp = await fgaClient.readLatestAuthorizationModel();
        if (modelResp.authorization_model?.id) {
          fgaClient.authorizationModelId = modelResp.authorization_model.id;
        }
      } catch (e) {
        console.warn('Could not read latest authorization model:', e);
      }
    }
    initialized = true;
    return fgaClient;
  }

  // Auto-discover: list stores to find one named "kahoot-manager"
  const tempClient = new OpenFgaClient({ apiUrl });
  try {
    const stores = await tempClient.listStores();
    const existing = stores.stores?.find(s => s.name === STORE_NAME);

    if (existing) {
      fgaClient = new OpenFgaClient({ apiUrl, storeId: existing.id! });
      // Discover latest model ID
      try {
        const modelResp = await fgaClient.readLatestAuthorizationModel();
        if (modelResp.authorization_model?.id) {
          fgaClient.authorizationModelId = modelResp.authorization_model.id;
        }
      } catch (e) {
        console.warn('Could not read latest authorization model:', e);
      }
      initialized = true;
      console.log(`OpenFGA: using existing store "${STORE_NAME}" (${existing.id})`);
      return fgaClient;
    }

    // No store found — create one
    const newStore = await tempClient.createStore({ name: STORE_NAME });
    fgaClient = new OpenFgaClient({ apiUrl, storeId: newStore.id! });
    initialized = true;
    console.log(`OpenFGA: created new store "${STORE_NAME}" (${newStore.id})`);
    console.warn('OpenFGA: No authorization model uploaded yet. Run setup-openfga.sh to upload the model.');
    return fgaClient;
  } catch (error) {
    console.error('OpenFGA: Failed to auto-discover store. Is OpenFGA running?', error);
    // Return a client without store ID — operations will fail but app won't crash
    fgaClient = new OpenFgaClient({ apiUrl });
    initialized = true;
    return fgaClient;
  }
}

/**
 * Write relationship tuples to OpenFGA.
 * Logs errors but does not throw (DB is source of truth).
 */
export async function writeTuples(tuples: TupleKey[]): Promise<void> {
  if (tuples.length === 0) return;
  try {
    const client = await getClient();
    await client.writeTuples(tuples);
  } catch (error) {
    console.error('OpenFGA writeTuples error:', error);
  }
}

/**
 * Delete relationship tuples from OpenFGA.
 * Logs errors but does not throw (DB is source of truth).
 */
export async function deleteTuples(tuples: TupleKeyWithoutCondition[]): Promise<void> {
  if (tuples.length === 0) return;
  try {
    const client = await getClient();
    await client.deleteTuples(tuples);
  } catch (error) {
    console.error('OpenFGA deleteTuples error:', error);
  }
}

/**
 * Check if a user has a particular relation with an object.
 */
export async function check(
  user: string,
  relation: string,
  object: string
): Promise<boolean> {
  try {
    const client = await getClient();
    const response = await client.check({
      user,
      relation,
      object,
    }, {
      consistency: ConsistencyPreference.HigherConsistency,
    });
    return response.allowed ?? false;
  } catch (error) {
    console.error('OpenFGA check error:', error);
    return false;
  }
}

/**
 * Read tuples matching a filter from OpenFGA.
 */
export async function readTuples(filter: {
  user?: string;
  relation?: string;
  object?: string;
}) {
  try {
    const client = await getClient();
    const response = await client.read(filter);
    return response.tuples || [];
  } catch (error) {
    console.error('OpenFGA readTuples error:', error);
    return [];
  }
}
