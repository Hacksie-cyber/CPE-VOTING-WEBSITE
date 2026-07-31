/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyBTfsyK4baxpqOUTctWj2OgruW13UoDIc8",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0544605864.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0544605864",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0544605864.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "841862565435",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:841862565435:web:2bd950947f8ecec031161e",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export { signOut };
export default app;


