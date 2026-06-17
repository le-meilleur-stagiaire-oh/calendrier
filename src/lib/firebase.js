import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, setDoc,
  collection, addDoc, getDocs, query, orderBy, deleteDoc
} from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey:      import.meta.env.VITE_FIREBASE_API_KEY      || "",
  authDomain:  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN  || "",
  projectId:   import.meta.env.VITE_FIREBASE_PROJECT_ID   || "",
};

let db = null;
let auth = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) { console.warn("Firebase not configured, using localStorage fallback"); }

export const CLOUDINARY_CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    || "";
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

export {
  db, auth,
  doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
};
