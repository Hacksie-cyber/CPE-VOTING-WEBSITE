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

export const saveVoteToFirestoreDirect = async (
  voter: { id: string; name: string; email: string; yearLevel: string },
  choices: Record<string, string>,
  receiptHash: string,
  timestamp: string
) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentVotes = Array.isArray(data.votes) ? [...data.votes] : [];
      const currentVoters = Array.isArray(data.voters) ? [...data.voters] : [];

      const existingVote = currentVotes.find((v: any) => v.receiptHash === receiptHash);
      if (!existingVote) {
        currentVotes.push({
          id: `vote-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          receiptHash,
          timestamp,
          yearLevel: voter.yearLevel || '3rd Year',
          choices,
        });
      }

      const normName = voter.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
      let found = false;
      const updatedVoters = currentVoters.map((v: any) => {
        const vNorm = v.name ? v.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ') : '';
        if (
          v.id?.toUpperCase() === voter.id?.toUpperCase() ||
          (v.email && voter.email && v.email.toLowerCase() === voter.email.toLowerCase()) ||
          (normName.length > 2 && vNorm === normName)
        ) {
          found = true;
          return {
            ...v,
            hasVoted: true,
            votedAt: timestamp,
            receiptHash,
          };
        }
        return v;
      });

      if (!found) {
        updatedVoters.push({
          id: voter.id,
          name: voter.name,
          email: voter.email,
          yearLevel: voter.yearLevel || '3rd Year',
          hasVoted: true,
          votedAt: timestamp,
          receiptHash,
        });
      }

      await setDoc(docRef, {
        ...data,
        votes: currentVotes,
        voters: updatedVoters,
        updatedAt: new Date().toISOString(),
      });
      console.log('Direct Firestore vote save successful!');
    }
  } catch (err) {
    console.warn('Direct Firestore vote save note:', err);
  }
};

export { signOut };
export default app;



