// Core Firebase services initialization
// Using compat versions for stability
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDkX1W2u6DySXHFMdNuSDkNia35ze1X2qk",
  authDomain: "mental-health-app-68c4b.firebaseapp.com",
  projectId: "mental-health-app-68c4b",
  storageBucket: "mental-health-app-68c4b.firebasestorage.app",
  messagingSenderId: "578028762858",
  appId: "1:578028762858:web:6da464109fba1c282e0993"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize individual services
const auth = firebase.auth();
const db = firebase.firestore();

// Export initialized services
export { auth, db };

console.log('Firebase Initialization, db:',!!db)
// Export individual service initializers
export const initAuth = () => auth;
export const initFirestore = () => db;
