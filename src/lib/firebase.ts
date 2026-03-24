import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "vivalavida-4a5c3.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vivalavida-4a5c3",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "vivalavida-4a5c3.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug: aviso quando API_KEY está faltando (apenas em dev)
if (typeof window !== 'undefined' && !firebaseConfig.apiKey && process.env.NODE_ENV === 'development') {
  console.warn(
    '[Firebase] NEXT_PUBLIC_FIREBASE_API_KEY não encontrada. Verifique:\n' +
    '1. O arquivo .env.local está na raiz do projeto?\n' +
    '2. O nome da variável é exatamente NEXT_PUBLIC_FIREBASE_API_KEY?\n' +
    '3. Reinicie o servidor (Ctrl+C e npm run dev) após alterar o .env.local'
  );
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestoreInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

function initFirebase(): Firestore | undefined {
  if (typeof window === 'undefined') return;
  if (firestoreInstance) return firestoreInstance;
  if (!firebaseConfig.apiKey) return;
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0] as FirebaseApp;
  }
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  firestoreInstance = getFirestore(app);
  storageInstance = getStorage(app);
  return firestoreInstance;
}

if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  initFirebase();
}

/** Retorna o Firestore, inicializando se necessário (útil quando o módulo carrega antes do cliente) */
export function getDb(): Firestore {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Firestore só pode ser usado no navegador');
  }
  const instance = initFirebase();
  if (!instance) {
    throw new Error('Firebase não configurado. Verifique NEXT_PUBLIC_FIREBASE_API_KEY no .env.local');
  }
  return instance;
}

/**
 * Proxy tipado como Firestore para o build TypeScript e APIs como collection(db, ...).
 * Encaminha para a instância real na primeira propriedade acessada.
 */
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
}) as Firestore;

export function getStorageClient(): FirebaseStorage {
  getDb();
  if (!storageInstance) {
    throw new Error('Firebase Storage não inicializado');
  }
  return storageInstance;
}

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    const real = getStorageClient();
    const value = Reflect.get(real, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
}) as FirebaseStorage;

export { app, auth };

