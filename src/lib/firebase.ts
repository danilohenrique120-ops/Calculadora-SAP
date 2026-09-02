import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDoc,
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

// Initialize Firestore with specific database ID if configured
export const db =
  databaseId && databaseId !== '(default)'
    ? getFirestore(app, databaseId)
    : getFirestore(app);

// Collection Names
export const COLLECTIONS = {
  ORDERS: 'orders',
  PRESETS: 'product_presets',
  BIOREACTORS: 'bioreactors',
  OPERATORS: 'operators',
  CONFIGS: 'system_configs',
};

// Check and Seed Database if Empty
export async function seedDatabaseIfEmpty() {
  try {
    const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
    if (ordersSnap.empty) {
      console.log('Seeding initial database data...');
      const batch = writeBatch(db);

      // Seed Initial Orders
      INITIAL_MOCK_ORDERS.forEach((order) => {
        const orderRef = doc(db, COLLECTIONS.ORDERS, order.id);
        batch.set(orderRef, order);
      });

      // Seed Initial Presets
      const normalizedPresets = normalizeProductPresets(PRODUCT_PRESETS);
      normalizedPresets.forEach((preset) => {
        const presetRef = doc(db, COLLECTIONS.PRESETS, preset.id);
        batch.set(presetRef, preset);
      });

      // Seed Initial Bioreactors
      INITIAL_BIOREACTORS.forEach((bio) => {
        const bioRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
        batch.set(bioRef, bio);
      });

      // Seed Initial Operators
      INITIAL_OPERATORS.forEach((op) => {
        const opRef = doc(db, COLLECTIONS.OPERATORS, op.id);
        batch.set(opRef, op);
      });

      // Seed Driver Rules
      const driverRulesRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
      batch.set(driverRulesRef, {
        id: 'driver_rules',
        type: 'driver_rules',
        rules: DEFAULT_COST_DRIVER_RULES,
        updatedAt: new Date().toISOString(),
      });

      // Seed Variance Thresholds
      const thresholdsRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
      batch.set(thresholdsRef, {
        id: 'variance_thresholds',
        type: 'variance_thresholds',
        thresholds: DEFAULT_VARIANCE_THRESHOLDS,
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
      console.log('Initial database seeded successfully.');
    }
  } catch (error) {
    console.error('Error checking/seeding database:', error);
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
      console.error('Realtime orders error:', error);
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
      if (presets.length > 0) {
        onUpdate(normalizeProductPresets(presets));
      }
    },
    (error) => {
      console.error('Realtime presets error:', error);
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
      if (bios.length > 0) {
        onUpdate(bios);
      }
    },
    (error) => {
      console.error('Realtime bioreactors error:', error);
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
      if (ops.length > 0) {
        onUpdate(ops);
      }
    },
    (error) => {
      console.error('Realtime operators error:', error);
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
      console.error('Realtime driver rules error:', error);
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
      console.error('Realtime variance thresholds error:', error);
      if (onError) onError(error);
    }
  );
}

// ----------------------------------------------------
// Database Mutation Functions (Realtime Cloud Sync)
// ----------------------------------------------------

export async function dbSaveOrder(order: ProductionOrder) {
  const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
  await setDoc(docRef, {
    ...order,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function dbDeleteOrder(orderId: string) {
  const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
  await deleteDoc(docRef);
}

export async function dbSavePreset(preset: ProductPreset) {
  const docRef = doc(db, COLLECTIONS.PRESETS, preset.id);
  await setDoc(docRef, preset, { merge: true });
}

export async function dbDeletePreset(presetId: string) {
  const docRef = doc(db, COLLECTIONS.PRESETS, presetId);
  await deleteDoc(docRef);
}

export async function dbSaveBioreactor(bio: BioreactorItem) {
  const docRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
  await setDoc(docRef, bio, { merge: true });
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
      batch.set(docRef, item, { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing bioreactors to Firestore:', error);
  }
}

export async function dbSaveOperator(op: OperatorItem) {
  const docRef = doc(db, COLLECTIONS.OPERATORS, op.id);
  await setDoc(docRef, op, { merge: true });
}

export async function dbDeleteOperator(opId: string) {
  const docRef = doc(db, COLLECTIONS.OPERATORS, opId);
  await deleteDoc(docRef);
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
      batch.set(docRef, item, { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing operators to Firestore:', error);
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
      batch.set(docRef, item, { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing product presets to Firestore:', error);
  }
}

export async function dbSaveDriverRules(rules: CostDriverRule[]) {
  const docRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
  await setDoc(docRef, {
    id: 'driver_rules',
    type: 'driver_rules',
    rules,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function dbSaveVarianceThresholds(thresholds: VarianceThresholdConfig) {
  const docRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
  await setDoc(docRef, {
    id: 'variance_thresholds',
    type: 'variance_thresholds',
    thresholds,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function dbResetAllToDefaults() {
  const batch = writeBatch(db);

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
    batch.set(orderRef, order);
  });

  // Insert normalized presets
  const normalizedPresets = normalizeProductPresets(PRODUCT_PRESETS);
  normalizedPresets.forEach((preset) => {
    const presetRef = doc(db, COLLECTIONS.PRESETS, preset.id);
    batch.set(presetRef, preset);
  });

  // Insert bioreactors
  INITIAL_BIOREACTORS.forEach((bio) => {
    const bioRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
    batch.set(bioRef, bio);
  });

  // Insert operators
  INITIAL_OPERATORS.forEach((op) => {
    const opRef = doc(db, COLLECTIONS.OPERATORS, op.id);
    batch.set(opRef, op);
  });

  // Reset driver rules
  const driverRulesRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
  batch.set(driverRulesRef, {
    id: 'driver_rules',
    type: 'driver_rules',
    rules: DEFAULT_COST_DRIVER_RULES,
    updatedAt: new Date().toISOString(),
  });

  // Reset variance thresholds
  const thresholdsRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
  batch.set(thresholdsRef, {
    id: 'variance_thresholds',
    type: 'variance_thresholds',
    thresholds: DEFAULT_VARIANCE_THRESHOLDS,
    updatedAt: new Date().toISOString(),
  });

  await batch.commit();
}
