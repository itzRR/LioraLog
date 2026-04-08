
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "lioralogg.firebaseapp.com",
  projectId: "lioralogg",
  storageBucket: "lioralogg.firebasestorage.app",
  messagingSenderId: "486651354270",
  appId: "1:486651354270:web:666309f742efcd03ba2f8f",
  measurementId: "G-9QKWLKC6C7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
