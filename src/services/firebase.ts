import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAuth, type Auth } from 'firebase/auth';
import type { FirebaseConfig } from '../types';

const STORAGE_KEY = 'gxe_firebase_config';

// The official GXE cloud project config
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBNs-r-pL6HJcDrxqGWLAPmTjhTLger1zU",
  authDomain: "gxe-app.firebaseapp.com",
  projectId: "gxe-app",
  storageBucket: "gxe-app.firebasestorage.app",
  messagingSenderId: "442284585270",
  appId: "1:442284585270:web:98b8c6350555eef3f7c397",
};

export function getSavedConfig(): FirebaseConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse saved Firebase config', e);
  }

  // Check if custom env variables exist
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

const config = getSavedConfig();

if (config && config.apiKey && config.projectId) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log('🔥 Firebase Cloud initialized successfully with project:', config.projectId);
  } catch (error) {
    console.warn('⚠️ Could not initialize Firebase with current config:', error);
  }
}

export { app, db, storage, auth };
export const isCloudConnected = () => db !== null && auth !== null;
