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

(function () {
  'use strict';

  var sidebar = document.getElementById('sidebar');
  var menuBtn = document.getElementById('menu-btn');
  var mobileMenuBtn = document.getElementById('mobile-menu-btn');
  var profileBtn = document.getElementById('profile-btn');
  var dropdownMenu = document.getElementById('dropdown-menu');
  var logoutBtn = document.getElementById('logout-btn');
  var sosBtn = document.getElementById('sos-btn');

  var displayNameEl = document.getElementById('displayName');
  var sidebarAvatarEl = document.getElementById('sidebarAvatar');
  var sidebarStreakEl = document.getElementById('sidebarStreak');
  var timeSpentEl = document.getElementById('timeSpent');
  var sidebarProgressTextEl = document.getElementById('sidebarProgressText');
  var sidebarProgressFillEl = document.getElementById('sidebarProgressFill');

  function isMobile() {
    return window.matchMedia('(max-width: 980px)').matches;
  }

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
    if (!dropdownMenu) return;
    event.stopPropagation();
    dropdownMenu.classList.toggle('active');
  }

  function closeDropdownIfOutside(event) {
    if (!event.target.closest('#profile-section') && dropdownMenu) {
      dropdownMenu.classList.remove('active');
    }

    if (isMobile() && sidebar && sidebar.classList.contains('open')) {
      var insideSidebar = event.target.closest('#sidebar');
      var clickedMenuBtn = event.target.closest('#mobile-menu-btn');
      if (!insideSidebar && !clickedMenuBtn) {
        closeMobileSidebar();
      }
    }
  }

  function normalizePercent(value) {
    var number = Number(value);
    if (isNaN(number)) number = 0;
    if (number < 0) number = 0;
    if (number > 100) number = 100;
    return number;
  }

  function updateProgress(value) {
    var percent = normalizePercent(value);
    if (sidebarProgressTextEl) sidebarProgressTextEl.textContent = percent + '%';
    if (sidebarProgressFillEl) sidebarProgressFillEl.style.width = percent + '%';
  }

  function updateStreak() {
    var storageKeyStreak = 'signsight_streak';
    var storageKeyLastVisit = 'signsight_last_visit';

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var oneDayMs = 24 * 60 * 60 * 1000;

    var streak = Number(localStorage.getItem(storageKeyStreak)) || 0;
    var lastVisit = Number(localStorage.getItem(storageKeyLastVisit)) || 0;

    if (lastVisit === today) {
      // same day
    } else if (lastVisit === today - oneDayMs) {
      streak += 1;
      localStorage.setItem(storageKeyStreak, String(streak));
      localStorage.setItem(storageKeyLastVisit, String(today));
    } else {
      streak = 1;
      localStorage.setItem(storageKeyStreak, '1');
      localStorage.setItem(storageKeyLastVisit, String(today));
    }

    if (sidebarStreakEl) sidebarStreakEl.textContent = streak + ' ' + (streak === 1 ? 'Day' : 'Days');
  }

  function updateTimeSpent(userData) {
    var timeText = (userData && (userData.timeSpentToday || userData.totalTime)) || '0m';
    if (timeSpentEl) timeSpentEl.textContent = timeText;
  }

  function hydrateUser(user, userData) {
    userData = userData || {};

    var emailPrefix = 'User';
    if (user && user.email && user.email.indexOf('@') > -1) {
      emailPrefix = user.email.split('@')[0];
    }

    var fullName = userData.displayName || userData.fullName || (user && user.displayName) || emailPrefix || 'User';
    var safeName = String(fullName).trim() || 'User';
    var initial = safeName.charAt(0).toUpperCase();

    if (displayNameEl) displayNameEl.textContent = safeName;
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = initial;

    var progress = 0;
    if (typeof userData.dailyGoalProgress !== 'undefined') progress = userData.dailyGoalProgress;
    else if (typeof userData.overallProgress !== 'undefined') progress = userData.overallProgress;
    else if (typeof userData.progress !== 'undefined') progress = userData.progress;

    updateProgress(progress);
    updateTimeSpent(userData);
  }

  function loadDashboardData(user) {
    if (typeof db === 'undefined') return;

    db.collection('users').doc(user.uid).get()
      .then(function (userDoc) {
        var userData = userDoc && userDoc.exists ? userDoc.data() : {};
        hydrateUser(user, userData || {});
      })
      .catch(function (error) {
        console.error('Dashboard load error:', error);
        hydrateUser(user, {});
      });
  }

  function logout(event) {
    event.preventDefault();

    if (typeof auth === 'undefined') {
      window.location.replace('index.html');
      return;
    }

    auth.signOut()
      .then(function () {
        window.location.replace('index.html');
      })
      .catch(function (error) {
        console.error('Logout error:', error);
      });
  }

  function triggerSosFallback() {
    if (typeof window.triggerInnovativeSOS === 'function') {
      window.triggerInnovativeSOS();
      return;
    }
    if (typeof window.triggerSOS === 'function') {
      window.triggerSOS();
      return;
    }
    alert('SOS is not available right now.');
  }

  if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleSidebar);
  if (profileBtn) profileBtn.addEventListener('click', toggleDropdown);
  window.addEventListener('click', closeDropdownIfOutside);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  if (sosBtn) sosBtn.addEventListener('click', triggerSosFallback);

  window.addEventListener('resize', function () {
    if (!isMobile() && sidebar) {
      sidebar.classList.remove('open');
    }
  });

  updateStreak();

  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        window.location.replace('login.html');
        return;
      }
      loadDashboardData(user);
    });
  }
})();
