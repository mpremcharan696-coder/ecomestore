import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB-3u_10pQWLj6HE9-nTEkYu-z4bs3zyL8",
  authDomain: "auth-f826f.firebaseapp.com",
  projectId: "auth-f826f",
  storageBucket: "auth-f826f.firebasestorage.app",
  messagingSenderId: "888053285644",
  appId: "1:888053285644:web:1aac406ab14eaeabe7bf29",
  measurementId: "G-2EQ1H7NRFX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
