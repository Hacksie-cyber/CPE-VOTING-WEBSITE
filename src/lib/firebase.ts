/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer, setDoc, onSnapshot } from 'firebase/firestore';
import { ExhibitProject, ExhibitSettings, ExhibitVote } from '../types';
import { INITIAL_EXHIBIT_PROJECTS, INITIAL_EXHIBIT_SETTINGS } from '../data/initialData';

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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

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

export const updateVoterProfileInFirestore = async (
  currentIdOrEmail: string,
  updates: { name: string; studentNumber: string; course?: string; yearLevel?: string; email?: string }
) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentVoters = Array.isArray(data.voters) ? [...data.voters] : [];
      const currentVotes = Array.isArray(data.votes) ? [...data.votes] : [];

      const cleanQuery = currentIdOrEmail.toLowerCase().trim();
      const cleanNewId = updates.studentNumber.trim().toUpperCase();
      const cleanNewName = updates.name.trim();
      const cleanNewCourse = updates.course?.trim() || 'BS Computer Engineering';
      const cleanNewYear = updates.yearLevel || '3rd Year';

      let oldId = '';
      let matched = false;

      const updatedVoters = currentVoters.map((v: any) => {
        const vId = v.id ? String(v.id).toLowerCase().trim() : '';
        const vEmail = v.email ? String(v.email).toLowerCase().trim() : '';
        if (vId === cleanQuery || vEmail === cleanQuery || (cleanNewId && vId === cleanNewId.toLowerCase())) {
          matched = true;
          oldId = v.id;
          return {
            ...v,
            id: cleanNewId,
            studentNumber: cleanNewId,
            name: cleanNewName,
            course: cleanNewCourse,
            yearLevel: cleanNewYear,
            ...(updates.email ? { email: updates.email.trim().toLowerCase() } : {}),
          };
        }
        return v;
      });

      if (!matched) {
        updatedVoters.push({
          id: cleanNewId,
          studentNumber: cleanNewId,
          name: cleanNewName,
          email: updates.email || `${cleanNewId.toLowerCase()}@cpe.edu.ph`,
          course: cleanNewCourse,
          yearLevel: cleanNewYear,
          hasVoted: false,
        });
      }

      // Update associated votes if id changed
      const updatedVotes = oldId && oldId !== cleanNewId
        ? currentVotes.map((vt: any) => (vt.voterId === oldId ? { ...vt, voterId: cleanNewId } : vt))
        : currentVotes;

      await setDoc(docRef, {
        ...data,
        voters: updatedVoters,
        votes: updatedVotes,
        updatedAt: new Date().toISOString(),
      });
      return updatedVoters.find((v: any) => v.id === cleanNewId) || true;
    }
  } catch (err) {
    console.warn('Firestore voter profile update error:', err);
  }
  return null;
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

export const clearAllVotersInFirestore = async () => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      await setDoc(docRef, {
        ...data,
        voters: [],
        votes: [],
        updatedAt: new Date().toISOString(),
      });
      return [];
    }
  } catch (err) {
    console.warn('Firestore clear all voters error:', err);
  }
  return null;
};

export const deleteBulkVotersInFirestore = async (voterIds: string[]) => {
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentVoters = Array.isArray(data.voters) ? data.voters : [];
      const currentVotes = Array.isArray(data.votes) ? data.votes : [];

      const idsSet = new Set(voterIds.map((id) => String(id).toLowerCase().trim()));

      const updatedVoters = currentVoters.filter((v: any) => {
        const vId = v.id ? String(v.id).toLowerCase() : '';
        const vEmail = v.email ? String(v.email).toLowerCase() : '';
        return !idsSet.has(vId) && !idsSet.has(vEmail);
      });

      const updatedVotes = currentVotes.filter((v: any) => {
        const vId = v.voterId ? String(v.voterId).toLowerCase() : '';
        return !idsSet.has(vId);
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
    console.warn('Firestore bulk delete voters error:', err);
  }
  return null;
};

export const saveExhibitVoteToFirestoreDirect = async (
  voter: { id: string; name: string; email?: string; yearLevel: string },
  projectId: string,
  receiptHash: string,
  timestamp: string
): Promise<{ success: boolean; message?: string; vote?: ExhibitVote }> => {
  const path = 'elections/cpe2026';
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const currentExhibitVotes: ExhibitVote[] = Array.isArray(data.exhibitVotes) ? [...data.exhibitVotes] : [];
    const currentProjects: ExhibitProject[] = Array.isArray(data.exhibitProjects)
      ? data.exhibitProjects
      : INITIAL_EXHIBIT_PROJECTS;

    if (!currentProjects.some((p) => p.id === projectId)) {
      return { success: false, message: 'Selected project exhibit not found.' };
    }

    const cleanId = voter.id.trim().toUpperCase();
    const cleanEmail = voter.email ? voter.email.trim().toLowerCase() : '';
    const normName = voter.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');

    const alreadyVoted = currentExhibitVotes.find(
      (ev) =>
        ev.voterId?.toUpperCase() === cleanId ||
        (cleanEmail && ev.voterEmail && ev.voterEmail.toLowerCase() === cleanEmail) ||
        (normName.length > 2 && ev.voterName?.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ') === normName)
    );

    if (alreadyVoted) {
      return {
        success: false,
        message: 'You have already cast your People\'s Choice vote for the Project Exhibit.',
        vote: alreadyVoted,
      };
    }

    const newVote: ExhibitVote = {
      id: `exhvote-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      receiptHash,
      voterId: cleanId,
      voterName: voter.name.trim(),
      voterEmail: cleanEmail,
      yearLevel: (voter.yearLevel as ExhibitVote['yearLevel']) || '3rd Year',
      projectId,
      timestamp,
      isInvalidated: false,
    };

    currentExhibitVotes.push(newVote);

    await setDoc(
      docRef,
      {
        ...data,
        exhibitProjects: currentProjects,
        exhibitVotes: currentExhibitVotes,
        exhibitSettings: data.exhibitSettings || INITIAL_EXHIBIT_SETTINGS,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true, vote: newVote };
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    console.warn('Direct Firestore exhibit vote save error:', err);
    return { success: false, message: 'Failed to record exhibit vote.' };
  }
};

export const saveExhibitProjectInFirestore = async (project: ExhibitProject): Promise<boolean> => {
  const path = 'elections/cpe2026';
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const currentProjects: ExhibitProject[] = (
      Array.isArray(data.exhibitProjects) ? data.exhibitProjects : INITIAL_EXHIBIT_PROJECTS
    ).map((p: any) => ({
      id: p.id,
      title: p.title,
      teamName: p.teamName,
      description: p.description || p.tagline || '',
    }));

    const cleanProject: ExhibitProject = {
      id: project.id,
      title: project.title.trim(),
      teamName: project.teamName.trim(),
      description: project.description.trim(),
    };

    const idx = currentProjects.findIndex((p) => p.id === cleanProject.id);
    if (idx >= 0) {
      currentProjects[idx] = cleanProject;
    } else {
      currentProjects.push(cleanProject);
    }

    await setDoc(
      docRef,
      {
        ...data,
        exhibitProjects: currentProjects,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    console.warn('Firestore exhibit project save error:', err);
    return false;
  }
};

export const deleteExhibitProjectInFirestore = async (projectId: string): Promise<boolean> => {
  const path = 'elections/cpe2026';
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const currentProjects: ExhibitProject[] = (
      Array.isArray(data.exhibitProjects) ? data.exhibitProjects : INITIAL_EXHIBIT_PROJECTS
    ).map((p: any) => ({
      id: p.id,
      title: p.title,
      teamName: p.teamName,
      description: p.description || p.tagline || '',
    }));
    const currentVotes: ExhibitVote[] = Array.isArray(data.exhibitVotes) ? data.exhibitVotes : [];

    await setDoc(
      docRef,
      {
        ...data,
        exhibitProjects: currentProjects.filter((p) => p.id !== projectId),
        exhibitVotes: currentVotes.filter((v) => v.projectId !== projectId),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
    console.warn('Firestore exhibit project delete error:', err);
  }
  return false;
};

export const updateExhibitSettingsInFirestore = async (
  newExhibitSettings: Partial<ExhibitSettings>
): Promise<boolean> => {
  const path = 'elections/cpe2026';
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};
    const current = data.exhibitSettings || INITIAL_EXHIBIT_SETTINGS;

    await setDoc(
      docRef,
      {
        ...data,
        exhibitSettings: { ...current, ...newExhibitSettings },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
    console.warn('Firestore exhibit settings update error:', err);
  }
  return false;
};

export const resetExhibitVotesInFirestore = async (): Promise<boolean> => {
  const path = 'elections/cpe2026';
  try {
    const docRef = doc(db, 'elections', 'cpe2026');
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};

    await setDoc(
      docRef,
      {
        ...data,
        exhibitVotes: [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    console.warn('Firestore reset exhibit votes error:', err);
  }
  return false;
};

export { signOut };
export default app;




