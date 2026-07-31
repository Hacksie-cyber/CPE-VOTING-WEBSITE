/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
export const db = getFirestore(app);
export default app;

