// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDDDGEDZPcHUjpmCjJwIuVV4ZhwFwaIZJQ",
  authDomain: "signsight-25082.firebaseapp.com",
  projectId: "signsight-25082",
  storageBucket: "signsight-25082.firebasestorage.app",
  messagingSenderId: "1016278940224",
  appId: "1:1016278940224:web:9a8eaef508be5e2ae87da5",
  measurementId: "G-K63J1VKZ6X"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

console.log("✅ Firebase initialized successfully!");