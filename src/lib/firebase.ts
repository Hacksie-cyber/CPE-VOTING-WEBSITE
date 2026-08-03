/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyAOT_2VW4VYSWjILqaC-4qqCkBmk2xSGJ8",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "cpe-voting-website.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "cpe-voting-website",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "cpe-voting-website.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "316255839130",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:316255839130:web:ca4a61e33c6555dac39023",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-HQJX6DJ6JH"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const loadElectionDataFromFirestore = async () => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Client Firestore load error:', err);
  }
  return null;
};

export const subscribeToElectionData = (onUpdate: (data: any) => void) => {
  const docRef = doc(db, 'elections', 'cpe2026');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data());
    }
  }, (err) => {
    console.warn('Snapshot listener error:', err);
  });
};

export { signOut };
export default app;



