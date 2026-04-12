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

'use strict';

(function () {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const profileBtn = document.getElementById('profile-btn');
  const dropdownMenu = document.getElementById('dropdown-menu');
  const logoutBtn = document.getElementById('logout-btn');

  const displayNameEl = document.getElementById('displayName');
  const sidebarAvatarEl = document.getElementById('sidebarAvatar');
  const sidebarStreakEl = document.getElementById('sidebarStreak');
  const timeSpentEl = document.getElementById('timeSpent');
  const sidebarProgressTextEl = document.getElementById('sidebarProgressText');
  const sidebarProgressFillEl = document.getElementById('sidebarProgressFill');

  const deafModeCard = document.getElementById('deaf-mode-card');
  const blindModeCard = document.getElementById('blind-mode-card');

  const isMobile = () => window.matchMedia('(max-width: 980px)').matches;

  function closeMobileSidebar() {
    if (isMobile() && sidebar) {
      sidebar.classList.remove('open');
      sidebar.classList.add('collapsed');
    }
  }

  function toggleSidebar() {
    if (!sidebar) return;

    if (isMobile()) {
      sidebar.classList.toggle('open');
      return;
    }

    sidebar.classList.toggle('collapsed');
  }

  function toggleDropdown(event) {
    event.stopPropagation();
    dropdownMenu?.classList.toggle('active');
  }

  function closeDropdownIfOutside(event) {
    if (!event.target.closest('#profile-section')) {
      dropdownMenu?.classList.remove('active');
    }

    if (isMobile() && sidebar?.classList.contains('open')) {
      const insideSidebar = event.target.closest('#sidebar');
      const clickedMenuBtn = event.target.closest('#mobile-menu-btn');
      if (!insideSidebar && !clickedMenuBtn) {
        closeMobileSidebar();
      }
    }
  }

  function normalizePercent(value) {
    const number = Math.max(0, Math.min(100, Number(value) || 0));
    return number;
  }

  function updateProgress(value) {
    const percent = normalizePercent(value);
    if (sidebarProgressTextEl) sidebarProgressTextEl.textContent = `${percent}%`;
    if (sidebarProgressFillEl) sidebarProgressFillEl.style.width = `${percent}%`;
  }

  function updateStreak() {
    const storageKeyStreak = 'signsight_streak';
    const storageKeyLastVisit = 'signsight_last_visit';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let streak = Number(localStorage.getItem(storageKeyStreak)) || 0;
    const lastVisit = Number(localStorage.getItem(storageKeyLastVisit)) || 0;

    if (lastVisit === today) {
      // unchanged
    } else if (lastVisit === today - oneDayMs) {
      streak += 1;
      localStorage.setItem(storageKeyStreak, String(streak));
      localStorage.setItem(storageKeyLastVisit, String(today));
    } else {
      streak = 1;
      localStorage.setItem(storageKeyStreak, '1');
      localStorage.setItem(storageKeyLastVisit, String(today));
    }

    if (sidebarStreakEl) sidebarStreakEl.textContent = `${streak} ${streak === 1 ? 'Day' : 'Days'}`;
  }

  function updateTimeSpent(userData) {
    const timeText = userData.timeSpentToday || userData.totalTime || '0m';
    if (timeSpentEl) timeSpentEl.textContent = timeText;
  }

  function hydrateUser(user, userData) {
    const fullName = userData.displayName || userData.fullName || user.displayName || user.email?.split('@')[0] || 'User';
    const safeName = fullName.trim() || 'User';
    const initial = safeName.charAt(0).toUpperCase();

    if (displayNameEl) displayNameEl.textContent = safeName;
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = initial;

    const progress = userData.dailyGoalProgress ?? userData.overallProgress ?? userData.progress ?? 0;
    updateProgress(progress);
    updateTimeSpent(userData);
  }

  async function loadDashboardData(user) {
    if (typeof db === 'undefined') return;

    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      hydrateUser(user, userData || {});
    } catch (error) {
      console.error('Dashboard load error:', error);
      hydrateUser(user, {});
    }
  }

  async function logout(event) {
    event.preventDefault();
    if (typeof auth === 'undefined') {
      window.location.replace('index.html');
      return;
    }

    try {
      await auth.signOut();
      window.location.replace('index.html');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  function routeTo(path) {
    closeMobileSidebar();
    window.location.href = path;
  }

  menuBtn?.addEventListener('click', toggleSidebar);
  mobileMenuBtn?.addEventListener('click', toggleSidebar);
  profileBtn?.addEventListener('click', toggleDropdown);
  window.addEventListener('click', closeDropdownIfOutside);
  logoutBtn?.addEventListener('click', logout);

  deafModeCard?.addEventListener('click', () => routeTo('deaf-mode.html'));
  blindModeCard?.addEventListener('click', () => routeTo('blind-mode.html'));

  window.addEventListener('resize', () => {
    if (!isMobile() && sidebar) {
      sidebar.classList.remove('open');
    }
  });

  updateStreak();

  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        window.location.replace('login.html');
        return;
      }
      loadDashboardData(user);
    });
  }
})();
