import { OpenFgaClient, TupleKey, TupleKeyWithoutCondition, ConsistencyPreference } from '@openfga/sdk';
import { AUTHORIZATION_MODEL } from './openfga-model';

const STORE_NAME = 'kahoot-manager';

let fgaClient: OpenFgaClient | null = null;
let initialized = false;

/**
 * Ensure the store has an authorization model. Uploads one if none exists.
 */
async function ensureModel(client: OpenFgaClient): Promise<void> {
  try {
    const modelResp = await client.readLatestAuthorizationModel();
    if (modelResp.authorization_model?.id) {
      client.authorizationModelId = modelResp.authorization_model.id;
      return;
    }
  } catch {
    // No model found — upload one
  }

  try {
    console.log('OpenFGA: Uploading authorization model...');
    const resp = await client.writeAuthorizationModel(AUTHORIZATION_MODEL);
    client.authorizationModelId = resp.authorization_model_id;
    console.log(`OpenFGA: Model uploaded (${resp.authorization_model_id})`);
  } catch (error) {
    console.error('OpenFGA: Failed to upload authorization model:', error);
  }
}

/**
 * Get or create the OpenFGA client singleton.
 * Auto-discovers store by name, creates if missing, uploads model if needed.
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
    if (!modelId) {
      await ensureModel(fgaClient);
    }
    initialized = true;
    return fgaClient;
  }

  // Auto-discover or create store
  const tempClient = new OpenFgaClient({ apiUrl });
  try {
    const stores = await tempClient.listStores();
    const existing = stores.stores?.find(s => s.name === STORE_NAME);

    if (existing) {
      fgaClient = new OpenFgaClient({ apiUrl, storeId: existing.id! });
      await ensureModel(fgaClient);
      initialized = true;
      console.log(`OpenFGA: using store "${STORE_NAME}" (${existing.id})`);
      return fgaClient;
    }

    // Create store + upload model
    const newStore = await tempClient.createStore({ name: STORE_NAME });
    fgaClient = new OpenFgaClient({ apiUrl, storeId: newStore.id! });
    await ensureModel(fgaClient);
    initialized = true;
    console.log(`OpenFGA: created store "${STORE_NAME}" (${newStore.id})`);
    return fgaClient;
  } catch (error) {
    console.error('OpenFGA: Failed to initialize. Is OpenFGA running?', error);
    fgaClient = new OpenFgaClient({ apiUrl });
    initialized = true;
    return fgaClient;
  }
}

export async function writeTuples(tuples: TupleKey[]): Promise<void> {
  if (tuples.length === 0) return;
  try {
    const client = await getClient();
    await client.writeTuples(tuples);
  } catch (error) {
    console.error('OpenFGA writeTuples error:', error);
  }
}

export async function deleteTuples(tuples: TupleKeyWithoutCondition[]): Promise<void> {
  if (tuples.length === 0) return;
  try {
    const client = await getClient();
    await client.deleteTuples(tuples);
  } catch (error) {
    console.error('OpenFGA deleteTuples error:', error);
  }
}

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
