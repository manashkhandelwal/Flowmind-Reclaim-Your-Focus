/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: (window as any).ENV?.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: (window as any).ENV?.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (window as any).ENV?.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (window as any).ENV?.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (window as any).ENV?.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (window as any).ENV?.VITE_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase using the environment credentials
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const databaseId = (window as any).ENV?.VITE_FIRESTORE_DATABASE_ID || import.meta.env.VITE_FIRESTORE_DATABASE_ID;
export const db = getFirestore(app, databaseId);
export const googleProvider = new GoogleAuthProvider();

// Request Calendar Read/Write access on sign-in
googleProvider.addScope("https://www.googleapis.com/auth/calendar");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");

export { onAuthStateChanged, signInWithPopup, signOut };
