// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDDDGEDZPcHUjpmCjJwIuVV4ZhwFwaIZJQ",
    authDomain: "signsight-25082.firebaseapp.com",
    projectId: "signsight-25082",
    storageBucket: "signsight-25082.firebasestorage.app",
    messagingSenderId: "1016278940224",
    appId: "1:1016278940224:web:9a8eaef508be5e2ae87da5",
    measurementId: "G-K63J1VKZ6X"
};

// Initialize Firebase logic
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

console.log("✅ SignSight Firebase connected!");

auth.getRedirectResult().then((result) => {
    if (result && result.user) {
        window.location.replace('dashboard.html');
    }
}).catch((error) => {
    console.error('Redirect error:', error);
});

// ==========================================
// 1. SIGNUP LOGIC
// ==========================================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('fullName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        return userCredential.user.updateProfile({
            displayName: name
        })
        .then(() => {
            return userCredential;
        });
    })
    .then((userCredential) => {
        return db.collection('users').doc(userCredential.user.uid).set({
            uid: userCredential.user.uid,
            displayName: name,
            email: email,
            createdAt: new Date(),
            lastLogin: new Date(),
            deafSessions: 0,
            blindSessions: 0,
            totalTime: '0m'
        });
    })
    .then(() => {
        alert("Account created successfully!");
        window.location.replace('dashboard.html');
    })
        .catch((error) => {
            alert("Signup Error: " + error.message);
        });    
    });
}

// ==========================================
// 2. LOGIN LOGIC
// ==========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                return db.collection('users').doc(userCredential.user.uid).set({
                    lastLogin: new Date(),
                    email: userCredential.user.email
                }, { merge: true });
            })
            .then(() => {
                console.log("Login Success!");
                window.location.replace('dashboard.html');
            })
            .catch((error) => {
                alert("Login Error: " + error.message);
            });
    });
}

// ==========================================
// 3. AUTH STATE CHECK (Index Page Control)
// ==========================================
auth.onAuthStateChanged((user) => {
    const cards = document.querySelectorAll('.mode-card');
    const authLinks = document.querySelector('.nav-links');

    if (user) {
        // UI for Logged In User
        if (authLinks) {
            authLinks.innerHTML = `
                <button class="btn-login" onclick="logout()">Logout</button>
            `;
        }
        
        // Mode cards setup (Dashboard pages se match karein)
        if (cards.length > 0) {
            cards[0].onclick = () => window.location.href = 'deaf-mode.html';
            cards[1].onclick = () => window.location.href = 'blind-mode.html';
        }
    } else {
        // UI for Logged Out User
        if (cards.length > 0) {
            cards[0].onclick = () => window.location.href = 'login.html';
            cards[1].onclick = () => window.location.href = 'login.html';
        }
    }
});

async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithRedirect(provider);
}
        const user = result.user;

        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: new Date(),
            lastLogin: new Date()
        }, { merge: true });

        console.log("Google Login Success!");
        window.location.replace('dashboard.html');

    } catch (error) {
        console.error("Google Login Error:", error);
        alert("Google Login Error: " + error.message);
    }
}

function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = event.target;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.innerHTML = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleButton.innerHTML = '👁️';
    }
}

// ==========================================
// 4. LOGOUT FUNCTION
// ==========================================
function logout() {
    auth.signOut().then(() => {
        console.log("Logged out successfully");
        window.location.replace('index.html');
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}
