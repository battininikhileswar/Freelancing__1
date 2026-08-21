// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBl9MSzyU61qD66ECmmnBZfFUkV2sU_aYQ",
  authDomain: "agentic-ai-c1849.firebaseapp.com",
  projectId: "agentic-ai-c1849",
  storageBucket: "agentic-ai-c1849.firebasestorage.app",
  messagingSenderId: "863256998648",
  appId: "1:863256998648:web:9f680cf0a1aca09b2f410d",
  measurementId: "G-B7RRXKM77H"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app); 
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
