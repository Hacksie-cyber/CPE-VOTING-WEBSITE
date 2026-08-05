/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "",
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

export const updateVoterInvalidationInFirestore = async (
  voterIds: string[],
  invalidate: boolean,
  reason?: string
) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentVoters = Array.isArray(data.voters) ? [...data.voters] : [];
      const currentVotes = Array.isArray(data.votes) ? [...data.votes] : [];

      const updatedVoters = currentVoters.map((v: any) => {
        if (voterIds.includes(v.id)) {
          const newV = {
            ...v,
            isInvalidated: invalidate,
          };
          if (invalidate) {
            newV.invalidatedReason = reason || 'Flagged by Commission Audit';
          } else {
            delete newV.invalidatedReason;
          }
          return newV;
        }
        return v;
      });

      const updatedVotes = currentVotes.map((v: any) => {
        if (voterIds.includes(v.voterId)) {
          const newV = {
            ...v,
            isInvalidated: invalidate,
          };
          if (invalidate) {
            newV.invalidatedReason = reason || 'Flagged by Commission Audit';
          } else {
            delete newV.invalidatedReason;
          }
          return newV;
        }
        return v;
      });

      await setDoc(docRef, {
        ...data,
        voters: updatedVoters,
        votes: updatedVotes,
        updatedAt: new Date().toISOString(),
      });
      return updatedVoters;
    }
  } catch (err) {
    console.warn('Firestore voter invalidation update note:', err);
  }
  return null;
};

export const resetVotesInFirestore = async () => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentVoters = Array.isArray(data.voters) ? [...data.voters] : [];

      const resetVoters = currentVoters.map((v: any) => {
        const newV = {
          ...v,
          hasVoted: false,
          isInvalidated: false,
        };
        delete newV.votedAt;
        delete newV.receiptHash;
        delete newV.invalidatedReason;
        delete newV.invalidatedAt;
        return newV;
      });

      await setDoc(docRef, {
        ...data,
        votes: [],
        voters: resetVoters,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } else {
      await setDoc(docRef, {
        votes: [],
        voters: [],
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return true;
    }
  } catch (err) {
    console.warn('Firestore reset votes error:', err);
  }
  return false;
};

export const resetDemoInFirestore = async (
  initialPositions: any[],
  initialCandidates: any[],
  initialVotes: any[],
  sampleVoters: any[],
  initialSettings: any
) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    await setDoc(docRef, {
      positions: initialPositions,
      candidates: initialCandidates,
      votes: initialVotes,
      voters: sampleVoters,
      settings: initialSettings,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('Firestore reset demo error:', err);
  }
  return false;
};

export const saveCandidateInFirestore = async (candidate: any) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const currentCandidates = Array.isArray(data.candidates) ? [...data.candidates] : [];

    const existingIndex = currentCandidates.findIndex((c: any) => c.id === candidate.id);
    if (existingIndex >= 0) {
      currentCandidates[existingIndex] = candidate;
    } else {
      currentCandidates.push(candidate);
    }

    await setDoc(docRef, {
      ...data,
      candidates: currentCandidates,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore candidate save error:', err);
  }
  return false;
};

export const deleteCandidateInFirestore = async (candidateId: string) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentCandidates = Array.isArray(data.candidates) ? data.candidates : [];
      const updatedCandidates = currentCandidates.filter((c: any) => c.id !== candidateId);

      await setDoc(docRef, {
        ...data,
        candidates: updatedCandidates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
  } catch (err) {
    console.warn('Firestore candidate delete error:', err);
  }
  return false;
};

export const updateSettingsInFirestore = async (newSettings: any) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const currentSettings = data.settings || {};

    await setDoc(docRef, {
      ...data,
      settings: { ...currentSettings, ...newSettings },
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore settings update error:', err);
  }
  return false;
};

export const deleteVoterInFirestore = async (voterId: string, voterEmail?: string) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentVoters = Array.isArray(data.voters) ? data.voters : [];
      const currentVotes = Array.isArray(data.votes) ? data.votes : [];

      const targetIdClean = voterId ? String(voterId).toLowerCase() : '';
      const targetEmailClean = voterEmail ? String(voterEmail).toLowerCase() : '';

      const updatedVoters = currentVoters.filter((v: any) => {
        const vId = v.id ? String(v.id).toLowerCase() : '';
        const vEmail = v.email ? String(v.email).toLowerCase() : '';
        if (targetIdClean && vId === targetIdClean) return false;
        if (targetEmailClean && vEmail === targetEmailClean) return false;
        return true;
      });

      const updatedVotes = currentVotes.filter((v: any) => {
        const vId = v.voterId ? String(v.voterId).toLowerCase() : '';
        return !(targetIdClean && vId === targetIdClean);
      });

      await setDoc(docRef, {
        ...data,
        voters: updatedVoters,
        votes: updatedVotes,
        updatedAt: new Date().toISOString(),
      });
      return updatedVoters;
    }
  } catch (err) {
    console.warn('Firestore voter delete error:', err);
  }
  return null;
};

export { signOut };
export default app;



