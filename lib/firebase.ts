// Firebase configuration and initialization for Trinetra
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqENK2EK8JgtUbBbNGHU-TCFNdjHZUH-0",
  authDomain: "trinetra-2ecaa.firebaseapp.com",
  projectId: "trinetra-2ecaa",
  storageBucket: "trinetra-2ecaa.firebasestorage.app",
  messagingSenderId: "329716671351",
  appId: "1:329716671351:web:4f48342a764be63274b772",
  measurementId: "G-6Q82M88QYW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence for Firestore
// enableIndexedDbPersistence(db).catch((err) => {
//   if (err.code === 'failed-precondition') {
//     // Multiple tabs open, persistence can only be enabled in one tab at a time
//   } else if (err.code === 'unimplemented') {
//     // The current browser does not support all of the features required
//   }
// });

export { auth, db };
