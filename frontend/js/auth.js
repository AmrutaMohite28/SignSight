// ================================================================
//  auth.js — SignSight | Complete Fixed Version
//  Bugs Fixed:
//  1. window.location.replace= /'...' → window.location.replace('...')
//  2. Google login broken structure fixed
//  3. getRedirectResult properly handled for mobile
//  4. togglePassword uses event properly
// ================================================================

'use strict';
console.log("✅ auth.js loaded");

// ── Helpers ───────────────────────────────────────────────────────

function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'message error show';
}

function showSuccess(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'message success show';
}

function setLoading(btnId, spinnerId, textId, isOn) {
    var btn     = document.getElementById(btnId);
    var spinner = document.getElementById(spinnerId);
    var text    = document.getElementById(textId);
    if (btn)     btn.disabled       = isOn;
    if (spinner) spinner.classList.toggle('show', isOn);
    if (text)    text.style.opacity = isOn ? '0.5' : '1';
}

function getErrMsg(code) {
    var map = {
        'auth/user-not-found':         '❌ No account found with this email.',
        'auth/wrong-password':         '❌ Incorrect password.',
        'auth/invalid-credential':     '❌ Email or password is incorrect.',
        'auth/email-already-in-use':   '❌ This email is already registered.',
        'auth/weak-password':          '❌ Password must be at least 6 characters.',
        'auth/too-many-requests':      '❌ Too many attempts. Please wait.',
        'auth/invalid-email':          '❌ Invalid email address.',
        'auth/network-request-failed': '❌ Network error. Check your connection.',
        'auth/invalid-login-credentials': '❌ Email or password is incorrect.',
    };
    return map[code] || '❌ Error: ' + code;
}

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}

async function upsertUserProfile(user) {
    if (!user) return;
    await db.collection('users').doc(user.uid).set({
        uid:         user.uid,
        displayName: user.displayName || '',
        email:       user.email || '',
        photoURL:    user.photoURL || '',
        lastLogin:   new Date(),
        createdAt:   new Date()
    }, { merge: true });
}

// ── Password Toggle ───────────────────────────────────────────────

function togglePassword(inputId) {
    var field = document.getElementById(inputId);
    if (!field) return;
    field.type = field.type === 'password' ? 'text' : 'password';
}

// ── PAGE LOAD — Handle Google Redirect Result ─────────────────────
// ✅ FIX: getRedirectResult() must run on EVERY page load
// Mobile Google login uses redirect — result comes back on next page load

window.addEventListener('DOMContentLoaded', async function () {

    // Handle Google redirect result — works on both mobile and desktop
    try {
        var result = await auth.getRedirectResult();
        if (result && result.user) {
            var user = result.user;
            console.log("✅ Google Redirect Login Success:", user.email);

            await upsertUserProfile(user);

            // ✅ FIX: correct syntax — was window.location.replace= /'...'
            window.location.replace('dashboard.html');
        }
    } catch (error) {
        console.error('Redirect result error:', error.code);
        // Show error if on login/signup page
        var errEl = document.getElementById('loginError') || document.getElementById('signupError');
        if (errEl && error.code) {
            errEl.textContent = getErrMsg(error.code);
            errEl.className = 'message error show';
        }
    }

    // Pre-fill remembered email on login page
    var emailInput = document.getElementById('loginEmail');
    if (emailInput) {
        var saved = localStorage.getItem('ss_remembered_email');
        if (saved) {
            emailInput.value = saved;
            var cb = document.getElementById('rememberMe');
            if (cb) cb.checked = true;
        }
    }

    // Auto redirect if already logged in (login/signup pages only)
    var isAuthPage = document.getElementById('loginForm') || document.getElementById('signupForm');
    if (isAuthPage) {
        auth.onAuthStateChanged(function (user) {
            if (user) window.location.replace('dashboard.html');
        });
    }
});

// ── SIGNUP ────────────────────────────────────────────────────────

var signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        var name     = document.getElementById('fullName').value.trim();
        var email    = document.getElementById('signupEmail').value.trim();
        var password = document.getElementById('signupPassword').value;
        var confirm  = document.getElementById('confirmPassword') ? document.getElementById('confirmPassword').value : password;

        if (!name)               { showError('signupError', '❌ Full name required.');           return; }
        if (!email)              { showError('signupError', '❌ Email required.');               return; }
        if (!password)           { showError('signupError', '❌ Password required.');            return; }
        if (password.length < 6) { showError('signupError', '❌ Password min 6 characters.');   return; }
        if (password !== confirm) { showError('signupError', '❌ Passwords do not match.');      return; }

        setLoading('signupBtn', 'signupSpinner', 'signupBtnText', true);

        try {
            var userCredential = await auth.createUserWithEmailAndPassword(email, password);
            var user = userCredential.user;

            await user.updateProfile({ displayName: name });

            await db.collection('users').doc(user.uid).set({
                uid:           user.uid,
                displayName:   name,
                email:         email,
                createdAt:     new Date(),
                lastLogin:     new Date(),
                deafSessions:  0,
                blindSessions: 0,
                totalTime:     '0m'
            });

            showSuccess('signupSuccess', '✅ Account created! Redirecting…');
            setTimeout(function () {
                // ✅ FIX: correct syntax
                window.location.replace('dashboard.html');
            }, 1000);

        } catch (err) {
            console.error('Signup error:', err.code);
            showError('signupError', getErrMsg(err.code));
            setLoading('signupBtn', 'signupSpinner', 'signupBtnText', false);
        }
    });
}

// ── LOGIN ─────────────────────────────────────────────────────────

var loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        var email    = document.getElementById('loginEmail').value.trim();
        var password = document.getElementById('loginPassword').value;
        var remember = document.getElementById('rememberMe') ? document.getElementById('rememberMe').checked : false;

        if (!email)    { showError('loginError', '❌ Email required.');    return; }
        if (!password) { showError('loginError', '❌ Password required.'); return; }

        setLoading('loginBtn', 'loginSpinner', 'loginBtnText', true);

        try {
            await auth.setPersistence(
                remember
                    ? firebase.auth.Auth.Persistence.LOCAL
                    : firebase.auth.Auth.Persistence.SESSION
            );

            var userCredential = await auth.signInWithEmailAndPassword(email, password);
            var user = userCredential.user;

            await db.collection('users').doc(user.uid).set(
                { lastLogin: new Date(), email: user.email },
                { merge: true }
            );

            if (remember) {
                localStorage.setItem('ss_remembered_email', email);
            } else {
                localStorage.removeItem('ss_remembered_email');
            }

            showSuccess('loginSuccess', '✅ Login successful! Redirecting…');
            setTimeout(function () {
                // ✅ FIX: correct syntax
                window.location.replace('dashboard.html');
            }, 1000);

        } catch (err) {
            console.error('Login error:', err.code);
            showError('loginError', getErrMsg(err.code));
            setLoading('loginBtn', 'loginSpinner', 'loginBtnText', false);
        }
    });
}

// ── GOOGLE LOGIN ──────────────────────────────────────────────────
// ✅ FIX: Uses signInWithRedirect — works on BOTH mobile and desktop
// Mobile blocks popups — redirect is the only reliable method

async function loginWithGoogle() {
    try {
        var googleBtn = document.querySelector('.btn-social');
        if (googleBtn) googleBtn.disabled = true;

        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({ prompt: 'select_account' });

        if (isMobileDevice()) {
            await auth.signInWithRedirect(provider);
            return;
        }

        try {
            var popupResult = await auth.signInWithPopup(provider);
            if (popupResult && popupResult.user) {
                await upsertUserProfile(popupResult.user);
                window.location.replace('dashboard.html');
            }
            return;
        } catch (popupErr) {
            if (popupErr && (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request')) {
                await auth.signInWithRedirect(provider);
                return;
            }
            throw popupErr;
        }

        // Redirect result handled in DOMContentLoaded when flow returns.

    } catch (err) {
        console.error('Google login error:', err.code);
        var errId = document.getElementById('loginError') ? 'loginError' : 'signupError';
        showError(errId, '❌ Google login failed. Try again.');
        var googleBtn = document.querySelector('.btn-social');
        if (googleBtn) googleBtn.disabled = false;
    }
}

// Signup page Google button
async function signupWithGoogle() {
    await loginWithGoogle();
}

// ── AUTH STATE — Index page nav + mode cards ──────────────────────

auth.onAuthStateChanged(function (user) {
    var cards    = document.querySelectorAll('.mode-card');
    var navLinks = document.querySelector('.nav-links');

    if (user) {
        if (navLinks) {
            navLinks.innerHTML = '<button class="btn-login" id="logoutBtn">Logout</button>';
            var lb = document.getElementById('logoutBtn');
            if (lb) lb.addEventListener('click', logout);
        }
        if (cards.length >= 2) {
            cards[0].onclick = function () { window.location.href = 'deaf-mode.html'; };
            cards[1].onclick = function () { window.location.href = 'blind-mode.html'; };
        }
    } else {
        if (cards.length >= 2) {
            cards[0].onclick = function () { window.location.href = 'login.html'; };
            cards[1].onclick = function () { window.location.href = 'login.html'; };
        }
    }
});

// ── LOGOUT ────────────────────────────────────────────────────────

function logout() {
    auth.signOut().then(function () {
        localStorage.removeItem('ss_remembered_email');
        window.location.replace('index.html');
    }).catch(function (err) {
        console.error('Logout error:', err);
    });
}
