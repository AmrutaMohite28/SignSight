// ============================================
// 1. FIREBASE INITIALIZATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyDDDGEDZPcHUjpmCjJwIuVV4ZhwFwaIZJQ",
    authDomain: "signsight-25082.firebaseapp.com",
    projectId: "signsight-25082",
    storageBucket: "signsight-25082.firebasestorage.app",
    messagingSenderId: "1016278940224",
    appId: "1:1016278940224:web:9a8eaef508be5e2ae87da5",
    measurementId: "G-K63J1VKZ6X"
};

var auth, db;

if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("✅ Firebase initialized for Dashboard!");
}

// ============================================
// 2. AUTHENTICATION CHECK
// ============================================
window.addEventListener('load', function() {
    if (auth) {
        auth.onAuthStateChanged(function(user) {
            if (user) {
                console.log("User detected:", user.email);
                loadDashboardData(user);
            } else {
                // User login nasel tar login page var pathva
                window.location.replace('login.html');
            }
        });
    }
});

// ============================================
// 3. FIRESTORE मधून डेटा लोड करणे
// ============================================
async function loadDashboardData(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};

        // नाव आणि Initial सेट करणे (Profile sathi)
        const fullName = userData.displayName || userData.fullName || user.email.split('@')[0];
        const initial = fullName.charAt(0).toUpperCase();

        // UI Updates
        updateElement('profile-btn', initial); // Top right profile circle
        updateElement('sidebarAvatar', initial); 
        
        // Jar tula Firebase madhun progress dakhavaychi asel tar he chalel
        const progress = (userData.overallProgress || userData.progress || "0") + '%';
        const progressFill = document.querySelector('.progress-bar-fill');
        const progressText = document.querySelector('.progress-percent');
        
        if (progressFill) progressFill.style.width = progress;
        if (progressText) progressText.textContent = progress;

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Utility function
function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================
// 4. LOGOUT LOGIC
// ============================================
document.addEventListener("DOMContentLoaded", function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await auth.signOut();
                    window.location.replace('index.html');
                } catch (error) {
                    console.error('Logout error:', error);
                }
            }
        });
    }
});

// ============================================
// 5. UI LOGIC (Sidebar, Streak, Dropdown)
// ============================================
document.addEventListener("DOMContentLoaded", function() {
    
    // --- Dynamic Streak Logic ---
    function updateStreak() {
        const streakEl = document.getElementById('streak-value');
        if (!streakEl) return;

        let currentStreak = parseInt(localStorage.getItem('signsight_streak')) || 0;
        let lastVisit = localStorage.getItem('signsight_last_visit');
        const today = new Date().toDateString(); 
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        if (lastVisit === today) {
            streakEl.textContent = currentStreak + " Days 🔥";
        } else if (lastVisit === yesterday) {
            currentStreak++;
            localStorage.setItem('signsight_streak', currentStreak);
            localStorage.setItem('signsight_last_visit', today);
            streakEl.textContent = currentStreak + " Days 🔥";
        } else {
            currentStreak = 1;
            localStorage.setItem('signsight_streak', currentStreak);
            localStorage.setItem('signsight_last_visit', today);
            streakEl.textContent = currentStreak + " Day 🔥";
        }
    }
    updateStreak();

    // --- Sidebar Logic ---
    const openMenuBtn = document.getElementById('open-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (openMenuBtn && sidebar) {
        openMenuBtn.addEventListener('click', function() {
            sidebar.classList.add('active'); // Sidebar baher yeil
        });
    }

    if (closeMenuBtn && sidebar) {
        closeMenuBtn.addEventListener('click', function() {
            sidebar.classList.remove('active'); // Sidebar aat jail
        });
    }

    // --- Profile Dropdown Logic ---
    const profileBtn = document.getElementById('profile-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (profileBtn && dropdownMenu) {
        profileBtn.addEventListener('click', function(event) {
            dropdownMenu.classList.toggle('active');
            event.stopPropagation(); 
        });
    }

    // Baher click kelyavar dropdown band honyasathi
    window.onclick = function(event) {
        if (!event.target.closest('.profile-section')) {
            if (dropdownMenu && dropdownMenu.classList.contains('active')) {
                dropdownMenu.classList.remove('active');
            }
        }
    }
});

// He tujhya existing dash.js madhe UI Logic chya aat thev
document.addEventListener("DOMContentLoaded", function() {
    
    // Sidebar Toggle Logic
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', function() {
            // He click kelyavar collapsed class lagel kiva nighun jail
            sidebar.classList.toggle('collapsed'); 
        });
    }

    // Dropdown Logic
    const profileBtn = document.getElementById('profile-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (profileBtn && dropdownMenu) {
        profileBtn.addEventListener('click', function(event) {
            dropdownMenu.classList.toggle('active');
            event.stopPropagation(); 
        });
    }

    window.onclick = function(event) {
        if (!event.target.closest('.profile-section')) {
            if (dropdownMenu && dropdownMenu.classList.contains('active')) {
                dropdownMenu.classList.remove('active');
            }
        }
    }
});
document.getElementById('profile-btn').addEventListener('click', function(e) {
    document.getElementById('dropdown-menu').classList.toggle('active');
    e.stopPropagation();
});