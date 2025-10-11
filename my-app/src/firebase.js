// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // 👈 add this line

const firebaseConfig = {
  apiKey: "AIzaSyADSJhSL-mUkh_HsHr6r0InrPxoxMo7QPU",
  authDomain: "wallpaper-c74a3.firebaseapp.com",
  projectId: "wallpaper-c74a3",
  storageBucket: "wallpaper-c74a3.appspot.com",
  messagingSenderId: "704605252889",
  appId: "1:704605252889:web:fd7d4f666da70d2aeda988",
};

// ✅ Initialize Firebase
export const app = initializeApp(firebaseConfig);

// ✅ Firestore
export const db = getFirestore(app);

// ✅ Storage
export const storage = getStorage(app);

// ✅ Auth
export const auth = getAuth(app); // 👈 add this export
