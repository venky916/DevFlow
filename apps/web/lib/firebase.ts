import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);


// const firebaseConfig = {
//     apiKey: "AIzaSyD-MjEk8rOn5ihz2KpdKXzwURt6PBGXJ1s",
//     authDomain: "devflow-a3af4.firebaseapp.com",
//     projectId: "devflow-a3af4",
//     storageBucket: "devflow-a3af4.firebasestorage.app",
//     messagingSenderId: "833436051055",
//     appId: "1:833436051055:web:17727136947dc1ba2a0f9a",
//     measurementId: "G-NJLW7JJK1X"
// };

