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

// Configuração padrão vinda do projeto provisionado pelo Google AI Studio
import rawFirebaseConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
};

// Identifica se está rodando no projeto gerenciado do Google AI Studio
const isAiStudioProject =
  firebaseConfig.projectId === rawFirebaseConfig.projectId &&
  rawFirebaseConfig.projectId === 'biocontent-app';

const explicitDbId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

// Se for vazio, 'default' ou '(default)', tratamos como banco padrão do Firebase
const isStandardDatabase =
  !explicitDbId ||
  explicitDbId === 'default' ||
  explicitDbId === '(default)';

const isAiStudioCustomDb =
  isAiStudioProject &&
  rawFirebaseConfig.firestoreDatabaseId &&
  rawFirebaseConfig.firestoreDatabaseId !== '(default)' &&
  rawFirebaseConfig.firestoreDatabaseId !== 'default';

export const databaseId = !isStandardDatabase
  ? explicitDbId
  : isAiStudioCustomDb
  ? rawFirebaseConfig.firestoreDatabaseId
  : '(default)';

// Inicializa o app do Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicializa o Firestore:
// Se for o banco padrão, chama getFirestore(app) sem segundo parâmetro
// evitando o erro "Database 'default' not found".
export const db =
  databaseId && databaseId !== '(default)' && databaseId !== 'default'
    ? getFirestore(app, databaseId)
    : getFirestore(app);

// Coleções do Firestore
export const COLLECTIONS = {
  ORDERS: 'orders',
  PRESETS: 'product_presets',
  BIOREACTORS: 'bioreactors',
  OPERATORS: 'operators',
  CONFIGS: 'system_configs',
};

/**
 * Higieniza objetos antes de enviar ao Firestore.
 * Remove chaves com valor `undefined` para evitar erros de escrita.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

// Inicializa o banco com dados padrão apenas se estiver completamente vazio
export async function seedDatabaseIfEmpty() {
  try {
    const initRef = doc(db, COLLECTIONS.CONFIGS, 'system_init');
    const initSnap = await getDoc(initRef);

    if (initSnap.exists()) {
      return;
    }

    const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
    const presetsSnap = await getDocs(collection(db, COLLECTIONS.PRESETS));

    if (!ordersSnap.empty || !presetsSnap.empty) {
      await setDoc(initRef, {
        isInitialized: true,
        initializedAt: new Date().toISOString(),
      });
      return;
    }

    console.log('Primeira inicialização: Criando dados iniciais no Firestore...');
    const batch = writeBatch(db);

    INITIAL_MOCK_ORDERS.forEach((order) => {
      const orderRef = doc(db, COLLECTIONS.ORDERS, order.id);
      batch.set(orderRef, sanitizeForFirestore(order));
    });

    const normalizedPresets = normalizeProductPresets(PRODUCT_PRESETS);
    normalizedPresets.forEach((preset) => {
      const presetRef = doc(db, COLLECTIONS.PRESETS, preset.id);
      batch.set(presetRef, sanitizeForFirestore(preset));
    });

    INITIAL_BIOREACTORS.forEach((bio) => {
      const bioRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
      batch.set(bioRef, sanitizeForFirestore(bio));
    });

    INITIAL_OPERATORS.forEach((op) => {
      const opRef = doc(db, COLLECTIONS.OPERATORS, op.id);
      batch.set(opRef, sanitizeForFirestore(op));
    });

    const driverRulesRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
    batch.set(driverRulesRef, sanitizeForFirestore({
      id: 'driver_rules',
      type: 'driver_rules',
      rules: DEFAULT_COST_DRIVER_RULES,
      updatedAt: new Date().toISOString(),
    }));

    const thresholdsRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
    batch.set(thresholdsRef, sanitizeForFirestore({
      id: 'variance_thresholds',
      type: 'variance_thresholds',
      thresholds: DEFAULT_VARIANCE_THRESHOLDS,
      updatedAt: new Date().toISOString(),
    }));

    batch.set(initRef, {
      isInitialized: true,
      initializedAt: new Date().toISOString(),
    });

    await batch.commit();
    console.log('Banco de dados inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao verificar ou inicializar banco:', error);
  }
}

// ----------------------------------------------------
// Inscrições em Tempo Real (onSnapshot)
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
        const data = docSnap.data() as Partial<ProductionOrder>;
        orders.push({
          ...data,
          id: docSnap.id || data.id || `ord-${Math.random().toString(36).substring(2, 9)}`,
        } as ProductionOrder);
      });

      // Ordena por data decrescente ou número da OP
      orders.sort((a, b) => {
        const timeA = a.createdAt || (a.prepDate ? `${a.prepDate}T00:00:00Z` : '') || '';
        const timeB = b.createdAt || (b.prepDate ? `${b.prepDate}T00:00:00Z` : '') || '';
        if (timeB && timeA && timeB !== timeA) {
          return timeB.localeCompare(timeA);
        }
        return (b.opNumber || '').localeCompare(a.opNumber || '');
      });

      onUpdate(orders);
    },
    (error) => {
      console.error('Erro no listener em tempo real de ordens:', error);
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
        const data = docSnap.data() as Partial<ProductPreset>;
        presets.push({
          ...data,
          id: docSnap.id || data.id || 'preset',
        } as ProductPreset);
      });
      if (presets.length > 0) {
        onUpdate(normalizeProductPresets(presets));
      }
    },
    (error) => {
      console.error('Erro no listener de presets:', error);
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
        const data = docSnap.data() as Partial<BioreactorItem>;
        bios.push({
          ...data,
          id: docSnap.id || data.id || 'bio',
        } as BioreactorItem);
      });
      if (bios.length > 0) {
        onUpdate(bios);
      }
    },
    (error) => {
      console.error('Erro no listener de biorreatores:', error);
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
        const data = docSnap.data() as Partial<OperatorItem>;
        ops.push({
          ...data,
          id: docSnap.id || data.id || 'op',
        } as OperatorItem);
      });
      if (ops.length > 0) {
        onUpdate(ops);
      }
    },
    (error) => {
      console.error('Erro no listener de operadores:', error);
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
      console.error('Erro no listener de regras de custo:', error);
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
      console.error('Erro no listener de faixas de desvio:', error);
      if (onError) onError(error);
    }
  );
}

// ----------------------------------------------------
// Operações de Gravação e Sincronização na Nuvem
// ----------------------------------------------------

export async function dbSaveOrder(order: ProductionOrder) {
  const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
  const cleanData = sanitizeForFirestore({
    ...order,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, cleanData, { merge: true });
}

export async function dbDeleteOrder(orderId: string) {
  const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
  await deleteDoc(docRef);
}

export async function dbSavePreset(preset: ProductPreset) {
  const docRef = doc(db, COLLECTIONS.PRESETS, preset.id);
  await setDoc(docRef, sanitizeForFirestore(preset), { merge: true });
}

export async function dbDeletePreset(presetId: string) {
  const docRef = doc(db, COLLECTIONS.PRESETS, presetId);
  await deleteDoc(docRef);
}

export async function dbSaveBioreactor(bio: BioreactorItem) {
  const docRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
  await setDoc(docRef, sanitizeForFirestore(bio), { merge: true });
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
    
    existingSnap.forEach((d) => {
      if (!currentIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    items.forEach((item) => {
      const docRef = doc(db, COLLECTIONS.BIOREACTORS, item.id);
      batch.set(docRef, sanitizeForFirestore(item), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Erro ao sincronizar biorreatores no Firestore:', error);
    throw error;
  }
}

export async function dbSaveOperator(op: OperatorItem) {
  const docRef = doc(db, COLLECTIONS.OPERATORS, op.id);
  await setDoc(docRef, sanitizeForFirestore(op), { merge: true });
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
    
    existingSnap.forEach((d) => {
      if (!currentIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    items.forEach((item) => {
      const docRef = doc(db, COLLECTIONS.OPERATORS, item.id);
      batch.set(docRef, sanitizeForFirestore(item), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Erro ao sincronizar operadores no Firestore:', error);
    throw error;
  }
}

export async function syncAllPresets(items: ProductPreset[]) {
  try {
    const batch = writeBatch(db);
    const existingSnap = await getDocs(collection(db, COLLECTIONS.PRESETS));
    const currentIds = new Set(items.map((i) => i.id));
    
    existingSnap.forEach((d) => {
      if (!currentIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    items.forEach((item) => {
      const docRef = doc(db, COLLECTIONS.PRESETS, item.id);
      batch.set(docRef, sanitizeForFirestore(item), { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Erro ao sincronizar padrões no Firestore:', error);
    throw error;
  }
}

export async function dbSaveDriverRules(rules: CostDriverRule[]) {
  const docRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
  await setDoc(docRef, sanitizeForFirestore({
    id: 'driver_rules',
    type: 'driver_rules',
    rules,
    updatedAt: new Date().toISOString(),
  }), { merge: true });
}

export async function dbSaveVarianceThresholds(thresholds: VarianceThresholdConfig) {
  const docRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
  await setDoc(docRef, sanitizeForFirestore({
    id: 'variance_thresholds',
    type: 'variance_thresholds',
    thresholds,
    updatedAt: new Date().toISOString(),
  }), { merge: true });
}

export async function dbResetAllToDefaults() {
  const batch = writeBatch(db);

  const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
  ordersSnap.forEach((d) => batch.delete(d.ref));

  const presetsSnap = await getDocs(collection(db, COLLECTIONS.PRESETS));
  presetsSnap.forEach((d) => batch.delete(d.ref));

  const biosSnap = await getDocs(collection(db, COLLECTIONS.BIOREACTORS));
  biosSnap.forEach((d) => batch.delete(d.ref));

  const opsSnap = await getDocs(collection(db, COLLECTIONS.OPERATORS));
  opsSnap.forEach((d) => batch.delete(d.ref));

  INITIAL_MOCK_ORDERS.forEach((order) => {
    const orderRef = doc(db, COLLECTIONS.ORDERS, order.id);
    batch.set(orderRef, sanitizeForFirestore(order));
  });

  const normalizedPresets = normalizeProductPresets(PRODUCT_PRESETS);
  normalizedPresets.forEach((preset) => {
    const presetRef = doc(db, COLLECTIONS.PRESETS, preset.id);
    batch.set(presetRef, sanitizeForFirestore(preset));
  });

  INITIAL_BIOREACTORS.forEach((bio) => {
    const bioRef = doc(db, COLLECTIONS.BIOREACTORS, bio.id);
    batch.set(bioRef, sanitizeForFirestore(bio));
  });

  INITIAL_OPERATORS.forEach((op) => {
    const opRef = doc(db, COLLECTIONS.OPERATORS, op.id);
    batch.set(opRef, sanitizeForFirestore(op));
  });

  const driverRulesRef = doc(db, COLLECTIONS.CONFIGS, 'driver_rules');
  batch.set(driverRulesRef, sanitizeForFirestore({
    id: 'driver_rules',
    type: 'driver_rules',
    rules: DEFAULT_COST_DRIVER_RULES,
    updatedAt: new Date().toISOString(),
  }));

  const thresholdsRef = doc(db, COLLECTIONS.CONFIGS, 'variance_thresholds');
  batch.set(thresholdsRef, sanitizeForFirestore({
    id: 'variance_thresholds',
    type: 'variance_thresholds',
    thresholds: DEFAULT_VARIANCE_THRESHOLDS,
    updatedAt: new Date().toISOString(),
  }));

  await batch.commit();
}

/**
 * Função de diagnóstico para testar conexão e latência com a nuvem
 */
export async function testFirestoreConnection(): Promise<{
  success: boolean;
  latencyMs: number;
  databaseId: string;
  projectId: string;
  error?: string;
}> {
  const start = Date.now();
  const dbName = databaseId || '(default)';
  try {
    const testId = `ping-${Date.now()}`;
    const testDoc = doc(db, COLLECTIONS.CONFIGS, testId);
    await setDoc(testDoc, { ping: true, createdAt: new Date().toISOString() });
    await deleteDoc(testDoc);
    return {
      success: true,
      latencyMs: Date.now() - start,
      databaseId: dbName,
      projectId: firebaseConfig.projectId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Teste de conexão do Firestore falhou:', err);
    return {
      success: false,
      latencyMs: Date.now() - start,
      databaseId: dbName,
      projectId: firebaseConfig.projectId,
      error: errorMsg,
    };
  }
}

export function getDatabaseInfo() {
  return {
    projectId: firebaseConfig.projectId,
    databaseId: databaseId || '(default)',
    authDomain: firebaseConfig.authDomain,
  };
}
