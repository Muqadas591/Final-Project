import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDkX1W2u6DySXHFMdNuSDkNia35ze1X2qk",
  authDomain: "mental-health-app-68c4b.firebaseapp.com",
  projectId: "mental-health-app-68c4b",
  storageBucket: "mental-health-app-68c4b.firebasestorage.app",
  messagingSenderId: "578028762858",
  appId: "1:578028762858:web:6da464109fba1c282e0993"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth (always loaded)
const auth = getAuth(app);

// Lazy load Firestore only when needed
let firestoreInstance = null;

export const getFirestore = async () => {
  if (!firestoreInstance) {
    const { getFirestore } = await import("firebase/firestore");
    firestoreInstance = getFirestore(app);
  }
  return firestoreInstance;
};

export { auth };
