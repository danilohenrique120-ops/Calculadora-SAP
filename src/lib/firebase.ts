// Localize onde resolvedDatabaseId e db são definidos e substitua por:

const explicitDbId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

// Se for vazio, 'default' ou '(default)', consideramos banco padrão
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

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Se for o banco padrão do projeto pessoal, chama getFirestore(app) SEM segundo parâmetro
export const db =
  databaseId && databaseId !== '(default)' && databaseId !== 'default'
    ? getFirestore(app, databaseId)
    : getFirestore(app);
