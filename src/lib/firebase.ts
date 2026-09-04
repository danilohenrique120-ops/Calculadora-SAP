import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import {
  ProductionOrder,
  ProductPreset,
  BioreactorItem,
  OperatorItem,
  CostDriverRule,
  VarianceThresholdConfig,
  DEFAULT_COST_DRIVER_RULES,
  DEFAULT_VARIANCE_THRESHOLDS,
} from '../types';
import {
  INITIAL_MOCK_ORDERS,
  PRODUCT_PRESETS,
  INITIAL_BIOREACTORS,
  INITIAL_OPERATORS,
} from '../utils/mockData';
import { normalizeProductPresets } from '../utils/calculations';

// Default configuration from provisioned Firebase project
import rawFirebaseConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
};

const databaseId =
  import.meta.env.VITE_FIREBASE_DATABASE_ID ||
  rawFirebaseConfig.firestoreDatabaseId ||
  '(default)';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with robust WebChannel auto-long-polling to prevent proxy/streaming dropouts
function createFirestoreInstance(): Firestore {
  const targetDbId = databaseId && databaseId !== '(default)' ? databaseId : undefined;
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      targetDbId
    );
  } catch {
    return targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
  }
}

export const db: Firestore = createFirestoreInstance();

/**
 * Uploads any locally stored orders that do not exist yet in Firestore
 * (e.g. orders created while offline or before connection established)
 */
export async function syncLocalOrdersToCloudIfMissing(localOrders: ProductionOrder[]) {
  if (!Array.isArray(localOrders) || localOrders.length === 0) return;
  try {
    const cloudOrdersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
    const cloudIds = new Set<string>();
    cloudOrdersSnap.forEach((d) => cloudIds.add(d.id));

    for (const local of localOrders) {
      if (local && local.id && !cloudIds.has(local.id)) {
        console.log('Uploading local order to cloud:', local.opNumber);
        await dbSaveOrder(local);
      }
    }
  } catch (err) {
    console.error('Error syncing local orders to cloud:', err);
  }
}

// Collection Names
export const COLLECTIONS = {
  ORDERS: 'orders',
  PRESETS: 'product_presets',
  BIOREACTORS: 'bioreactors',
  OPERATORS: 'operators',
  CONFIGS: 'system_configs',
};

/**
 * Sanitizer for Firestore: Recursively removes or converts undefined values to null.
 * Firestore strictly rejects undefined, which caused silent save failures on optional fields.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (value === undefined ? null : value))
  );
}

// ----------------------------------------------------
// Database Initialization and Baseline Population
// ----------------------------------------------------

export async function seedDatabaseIfEmpty() {
  try {
    const batchesStateRef = doc(db, COLLECTIONS.CONFIGS, 'batches_state');
    const batchesStateSnap = await getDoc(batchesStateRef);
    const isIntentionallyCleared =
      batchesStateSnap.exists() && batchesStateSnap.data()?.isCleared;

    // Check if there are already any orders existing
    const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));

    // If orders collection is empty and user did NOT deliberately clear batches, populate baseline!
    if (ordersSnap.empty && !isIntentionallyCleared) {
      console.log('Populating cloud database with initial production orders...');
      const batch = writeBatch(db);
      INITIAL_MOCK_ORDERS.forEach((order) => {
        const orderRef = doc(db, COLLECTIONS.ORDERS, order.id);
        batch.set(orderRef, cleanForFirestore(order));
      });
      await batch.commit();
      console.log('Initial orders successfully synced to cloud.');
    }

    // Check presets
    const presetsSnap = await getDocs(collection(db, COLLECTIONS.PRESETS));
    if (presetsSnap.empty) {
      const batch = writeBatch(db);
      const normalizedPresets = normalizeProductPresets(PRODUCT_PRESETS);
      normalizedPresets.forEach((preset) => {
        const presetRef = doc(db, COLLECTIONS.PRESETS, preset.id);
        batch.set(presetRef, cleanForFirestore(preset));
      });
      await batch.commit();
    }

    // Check bioreactors
    const biosSnap = await getDocs(collection(db, COLLECTIONS.BIOREACTORS));
    if (biosSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_BIOREACTORS.forEach((bio) => {
        const bioRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
        batch.set(bioRef, cleanForFirestore(bio));
      });
      await batch.commit();
    }

    // Check operators
    const opsSnap = await getDocs(collection(db, COLLECTIONS.OPERATORS));
    if (opsSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_OPERATORS.forEach((op) => {
        const opRef = doc(db, COLLECTIONS.OPERATORS, op.id);
        batch.set(opRef, cleanForFirestore(op));
      });
      await batch.commit();
    }

    // Check driver rules
    const driverRulesRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
    const driverRulesSnap = await getDoc(driverRulesRef);
    if (!driverRulesSnap.exists()) {
      await setDoc(
        driverRulesRef,
        cleanForFirestore({
          id: 'driver_rules',
          type: 'driver_rules',
          rules: DEFAULT_COST_DRIVER_RULES,
          updatedAt: new Date().toISOString(),
        })
      );
    }

    // Check variance thresholds
    const thresholdsRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
    const thresholdsSnap = await getDoc(thresholdsRef);
    if (!thresholdsSnap.exists()) {
      await setDoc(
        thresholdsRef,
        cleanForFirestore({
          id: 'variance_thresholds',
          type: 'variance_thresholds',
          thresholds: DEFAULT_VARIANCE_THRESHOLDS,
          updatedAt: new Date().toISOString(),
        })
      );
    }

    // Mark system as initialized
    const initRef = doc(db, COLLECTIONS.CONFIGS, 'system_init');
    const initSnap = await getDoc(initRef);
    if (!initSnap.exists()) {
      await setDoc(initRef, {
        isInitialized: true,
        initializedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error verifying/populating cloud database:', error);
  }
}

// ----------------------------------------------------
// Real-time Subscriptions (onSnapshot)
// ----------------------------------------------------

export function subscribeToOrders(
  onUpdate: (orders: ProductionOrder[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.ORDERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const orders: ProductionOrder[] = [];
      snapshot.forEach((docSnap) => {
        orders.push(docSnap.data() as ProductionOrder);
      });
      // Sort orders descending by createdAt or opNumber
      orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(orders);
    },
    (error) => {
      console.error('Realtime orders sync error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToPresets(
  onUpdate: (presets: ProductPreset[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.PRESETS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const presets: ProductPreset[] = [];
      snapshot.forEach((docSnap) => {
        presets.push(docSnap.data() as ProductPreset);
      });
      onUpdate(presets.length > 0 ? normalizeProductPresets(presets) : []);
    },
    (error) => {
      console.error('Realtime presets sync error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToBioreactors(
  onUpdate: (bioreactors: BioreactorItem[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.BIOREACTORS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const bios: BioreactorItem[] = [];
      snapshot.forEach((docSnap) => {
        bios.push(docSnap.data() as BioreactorItem);
      });
      onUpdate(bios);
    },
    (error) => {
      console.error('Realtime bioreactors sync error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToOperators(
  onUpdate: (operators: OperatorItem[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.OPERATORS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const ops: OperatorItem[] = [];
      snapshot.forEach((docSnap) => {
        ops.push(docSnap.data() as OperatorItem);
      });
      onUpdate(ops);
    },
    (error) => {
      console.error('Realtime operators sync error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToDriverRules(
  onUpdate: (rules: CostDriverRule[]) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.rules) && data.rules.length > 0) {
          onUpdate(data.rules);
        }
      }
    },
    (error) => {
      console.error('Realtime driver rules sync error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToVarianceThresholds(
  onUpdate: (thresholds: VarianceThresholdConfig) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.thresholds) {
          onUpdate(data.thresholds);
        }
      }
    },
    (error) => {
      console.error('Realtime variance thresholds sync error:', error);
      if (onError) onError(error);
    }
  );
}

// ----------------------------------------------------
// Database Mutation Functions (Realtime Cloud Sync)
// ----------------------------------------------------

export async function dbSaveOrder(order: ProductionOrder) {
  const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
  const sanitized = cleanForFirestore({
    ...order,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, sanitized, { merge: true });
}

export async function dbDeleteOrder(orderId: string) {
  const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
  await deleteDoc(docRef);
}

export async function dbClearAllOrders() {
  const batch = writeBatch(db);
  const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
  ordersSnap.forEach((d) => batch.delete(d.ref));

  // Mark intentional clear flag so auto-seeder doesn't immediately re-populate
  const batchesStateRef = doc(db, COLLECTIONS.CONFIGS, 'batches_state');
  batch.set(batchesStateRef, {
    isCleared: true,
    clearedAt: new Date().toISOString(),
  });

  await batch.commit();
}

export async function dbSavePreset(preset: ProductPreset) {
  const docRef = doc(db, COLLECTIONS.PRESETS, preset.id);
  await setDoc(docRef, cleanForFirestore(preset), { merge: true });
}

export async function dbDeletePreset(presetId: string) {
  const docRef = doc(db, COLLECTIONS.PRESETS, presetId);
  await deleteDoc(docRef);
}

export async function dbSaveBioreactor(bio: BioreactorItem) {
  const docRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
  await setDoc(docRef, cleanForFirestore(bio), { merge: true });
}

export async function dbDeleteBioreactor(bioId: string) {
  const docRef = doc(db, COLLECTIONS.BIOREACTORS, bioId);
  await deleteDoc(docRef);
}

export async function syncAllBioreactors(items: BioreactorItem[]) {
  try {
    const batch = writeBatch(db);
    const existingSnap = await getDocs(collection(db, COLLECTIONS.BIOREACTORS));
    const currentIds = new Set(items.map((i) => i.id));

    // Delete items removed
    existingSnap.forEach((d) => {
      if (!currentIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    // Set/update current items
    items.forEach((item) => {
      const docRef = doc(db, COLLECTIONS.BIOREACTORS, item.id);
      batch.set(docRef, cleanForFirestore(item), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing bioreactors to Firestore:', error);
    throw error;
  }
}

export async function syncAllOperators(items: OperatorItem[]) {
  try {
    const batch = writeBatch(db);
    const existingSnap = await getDocs(collection(db, COLLECTIONS.OPERATORS));
    const currentIds = new Set(items.map((i) => i.id));

    // Delete items removed
    existingSnap.forEach((d) => {
      if (!currentIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    // Set/update current items
    items.forEach((item) => {
      const docRef = doc(db, COLLECTIONS.OPERATORS, item.id);
      batch.set(docRef, cleanForFirestore(item), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing operators to Firestore:', error);
    throw error;
  }
}

export async function syncAllPresets(items: ProductPreset[]) {
  try {
    const batch = writeBatch(db);
    const existingSnap = await getDocs(collection(db, COLLECTIONS.PRESETS));
    const currentIds = new Set(items.map((i) => i.id));

    // Delete items removed
    existingSnap.forEach((d) => {
      if (!currentIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    // Set/update current items
    items.forEach((item) => {
      const docRef = doc(db, COLLECTIONS.PRESETS, item.id);
      batch.set(docRef, cleanForFirestore(item), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing product presets to Firestore:', error);
    throw error;
  }
}

export async function dbSaveDriverRules(rules: CostDriverRule[]) {
  const docRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
  await setDoc(
    docRef,
    cleanForFirestore({
      id: 'driver_rules',
      type: 'driver_rules',
      rules,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );
}

export async function dbSaveVarianceThresholds(thresholds: VarianceThresholdConfig) {
  const docRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
  await setDoc(
    docRef,
    cleanForFirestore({
      id: 'variance_thresholds',
      type: 'variance_thresholds',
      thresholds,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );
}

export async function dbResetAllToDefaults() {
  const batch = writeBatch(db);

  // Clear batches_state flag
  const batchesStateRef = doc(db, COLLECTIONS.CONFIGS, 'batches_state');
  batch.delete(batchesStateRef);

  // Clear existing orders
  const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
  ordersSnap.forEach((d) => batch.delete(d.ref));

  // Clear existing presets
  const presetsSnap = await getDocs(collection(db, COLLECTIONS.PRESETS));
  presetsSnap.forEach((d) => batch.delete(d.ref));

  // Clear existing bioreactors
  const biosSnap = await getDocs(collection(db, COLLECTIONS.BIOREACTORS));
  biosSnap.forEach((d) => batch.delete(d.ref));

  // Clear existing operators
  const opsSnap = await getDocs(collection(db, COLLECTIONS.OPERATORS));
  opsSnap.forEach((d) => batch.delete(d.ref));

  // Insert mock orders
  INITIAL_MOCK_ORDERS.forEach((order) => {
    const orderRef = doc(db, COLLECTIONS.ORDERS, order.id);
    batch.set(orderRef, cleanForFirestore(order));
  });

  // Insert normalized presets
  const normalizedPresets = normalizeProductPresets(PRODUCT_PRESETS);
  normalizedPresets.forEach((preset) => {
    const presetRef = doc(db, COLLECTIONS.PRESETS, preset.id);
    batch.set(presetRef, cleanForFirestore(preset));
  });

  // Insert bioreactors
  INITIAL_BIOREACTORS.forEach((bio) => {
    const bioRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
    batch.set(bioRef, cleanForFirestore(bio));
  });

  // Insert operators
  INITIAL_OPERATORS.forEach((op) => {
    const opRef = doc(db, COLLECTIONS.OPERATORS, op.id);
    batch.set(opRef, cleanForFirestore(op));
  });

  // Reset driver rules
  const driverRulesRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
  batch.set(
    driverRulesRef,
    cleanForFirestore({
      id: 'driver_rules',
      type: 'driver_rules',
      rules: DEFAULT_COST_DRIVER_RULES,
      updatedAt: new Date().toISOString(),
    })
  );

  // Reset variance thresholds
  const thresholdsRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
  batch.set(
    thresholdsRef,
    cleanForFirestore({
      id: 'variance_thresholds',
      type: 'variance_thresholds',
      thresholds: DEFAULT_VARIANCE_THRESHOLDS,
      updatedAt: new Date().toISOString(),
    })
  );

  await batch.commit();
}
