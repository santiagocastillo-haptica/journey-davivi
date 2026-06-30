// firebase.js
// Configuración e inicialización de Firebase para Journey Experience Intelligence.
// Este archivo solo inicializa la app y exporta la instancia de Firestore;
// toda la lógica de lectura/escritura vive en JourneyExperienceApp.jsx.

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnvu92eDBKW62uJE7rYPLOofE5B-SvtbQ",
  authDomain: "journey-davivi.firebaseapp.com",
  projectId: "journey-davivi",
  storageBucket: "journey-davivi.firebasestorage.app",
  messagingSenderId: "388746017603",
  appId: "1:388746017603:web:585c2c53aed896a3f80df6",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
