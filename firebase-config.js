// Firebase Modular SDK Integration Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/**
 * Replace the credentials below with your actual Firebase Project config.
 * You can get this from Firebase Console (https://console.firebase.google.com) -> Project Settings -> General -> Web App.
 */
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if developer has replaced placeholder API key
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY";

let app = null;
let db = null;
let storage = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log("Firebase initialized successfully!");
  } catch (err) {
    console.warn("Firebase initialization error, fallback mode active:", err);
  }
} else {
  console.info("Notice: Firebase config contains placeholders. App will run in local-storage/fallback mode until Firebase credentials are provided.");
}

export { 
  app, 
  db, 
  storage, 
  auth, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
};

