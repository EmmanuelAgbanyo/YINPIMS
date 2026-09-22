import { initializeApp, deleteApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup, 
  GoogleAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  type User as FirebaseUser,
  type ConfirmationResult
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration as requested by user
export const firebaseConfig = {
  apiKey: "AIzaSyArcu4M4AX7Ow9car6K7N03IGKieAfFpho",
  authDomain: "yinpims.firebaseapp.com",
  projectId: "yinpims",
  storageBucket: "yinpims.firebasestorage.app",
  messagingSenderId: "43618757422",
  appId: "1:43618757422:web:d317caca1403e41f5ca8bf",
  measurementId: "G-HYN7K0H61S"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Initialize Analytics conditionally (safely for SSG/browser environments)
export const analyticsPromise = isSupported().then((supported) => supported ? getAnalytics(app) : null);

// Auth Helpers
const googleProvider = new GoogleAuthProvider();

export const signUpWithEmail = async (email: string, pass: string, name?: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && userCredential.user) {
    await updateProfile(userCredential.user, { displayName: name });
  }
  return userCredential.user;
};

export const signInWithEmail = async (email: string, pass: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
};

export const signInWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  return userCredential.user;
};

export const createRecaptchaVerifier = (containerId: string) => {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      // Response expired
    }
  });
};

export const sendPhoneVerificationCode = async (
  phoneNumber: string, 
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};

export const resetUserPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const onAuthUserChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Sync user profile data to Firestore
      try {
        await syncFirestoreDoc('users', user.uid, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          phoneNumber: user.phoneNumber || '',
          photoURL: user.photoURL || '',
          lastLoginAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Failed to sync user profile to Firestore:', e);
      }
    }
    callback(user);
  });
};

// Firestore Sync & Storage Helpers
export const syncFirestoreDoc = async (collectionName: string, docId: string, data: any) => {
  const docRef = doc(firestore, collectionName, docId);
  await setDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const getFirestoreDoc = async (collectionName: string, docId: string) => {
  const docRef = doc(firestore, collectionName, docId);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
};

export const subscribeFirestoreDoc = (collectionName: string, docId: string, callback: (data: any) => void) => {
  const docRef = doc(firestore, collectionName, docId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  });
};

export const updateCurrentUserPassword = async (newPassword: string) => {
  if (auth.currentUser) {
    try {
      await updatePassword(auth.currentUser, newPassword);
    } catch (e) {
      console.warn('Firebase Auth updatePassword note:', e);
    }
  }
};

// Cross-Device Staff Account Firestore Synchronization
export const syncStaffAccountToFirestore = async (user: any) => {
  try {
    const docId = user.email.toLowerCase().trim().replace(/[\/\\]/g, '_');
    await syncFirestoreDoc('staff_accounts', docId, {
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase().trim(),
      phone: user.phone || '',
      role: user.role,
      organizationId: user.organizationId || 'org-001',
      assignedEvents: user.assignedEvents || ['*'],
      status: user.status || 'Active',
      avatarUrl: user.avatarUrl || '',
      provisionalPassword: user.provisionalPassword || null,
      password: user.password || null,
      mustChangePassword: user.mustChangePassword !== false,
      passwordSetAt: user.passwordSetAt || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to sync staff account to Firestore:', err);
  }
};

export const getStaffAccountFromFirestore = async (email: string) => {
  try {
    const docId = email.toLowerCase().trim().replace(/[\/\\]/g, '_');
    const data = await getFirestoreDoc('staff_accounts', docId);
    return data;
  } catch (err) {
    console.warn('Failed to fetch staff account from Firestore:', err);
    return null;
  }
};

/**
 * Universal Cloud Staff Registration via Secondary Firebase Auth App
 * Creates the user account directly in Firebase Authentication so the staff member can
 * log in on any device (phone, laptop, desktop) anywhere in the world without session interference!
 */
export const registerStaffInFirebaseAuth = async (
  email: string, 
  provisionalPass: string, 
  displayName?: string
): Promise<{ success: boolean; isExisting?: boolean; error?: string }> => {
  const tempAppName = `staff-reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  let tempApp = null;
  try {
    tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    const cred = await createUserWithEmailAndPassword(tempAuth, email.trim().toLowerCase(), provisionalPass.trim());
    if (displayName && cred.user) {
      try {
        await updateProfile(cred.user, { displayName });
      } catch {
        // non-critical
      }
    }
    return { success: true };
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      return { success: true, isExisting: true };
    }
    console.warn('Firebase Auth staff registration note:', err);
    return { success: false, error: err.message || 'Registration failed' };
  } finally {
    if (tempApp) {
      try {
        await deleteApp(tempApp);
      } catch {
        // non-critical
      }
    }
  }
};

export const encodeStaffProfile = (name: string, role: string, assignedEvents: string[] = ['*']): string => {
  return `${name.replace(/[#|]/g, ' ')}|${role}|${assignedEvents.join(',')}`;
};

export const decodeStaffProfile = (displayName?: string | null): { name: string; role: string; assignedEvents: string[] } => {
  if (!displayName || !displayName.includes('|')) {
    return {
      name: displayName || 'Staff Member',
      role: 'CHECKIN_STAFF',
      assignedEvents: ['*'],
    };
  }
  const parts = displayName.split('|');
  return {
    name: parts[0] || 'Staff Member',
    role: parts[1] || 'CHECKIN_STAFF',
    assignedEvents: parts[2] ? parts[2].split(',') : ['*'],
  };
};
