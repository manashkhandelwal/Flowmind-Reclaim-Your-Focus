import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, collection, setDoc, getDocs, query, where, addDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase using the provisioned credentials
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const databaseId = (firebaseConfig as any).firestoreDatabaseId || "ai-studio-f2fb372a-f6cc-4026-8522-7ff2abb6e99c";
export const db = getFirestore(app, databaseId);
export const googleProvider = new GoogleAuthProvider();

// Request Calendar Read/Write access on sign-in
googleProvider.addScope("https://www.googleapis.com/auth/calendar");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");

export { onAuthStateChanged, signInWithPopup, signOut };
