// ================================================================
//  deaf-mode.js — SignSight
//  KEY FIXES:
//  1. switchMode() is a proper function DECLARATION (hoisted)
//     — was window.switchMode = function  (assigned late, line 202)
//     — if ANY error happened before line 202, it was never defined
//  2. socket creation wrapped in try-catch
//     — if socket.io CDN fails, whole script was crashing at line 1
//     — now rest of functions always get defined even if socket fails
//  3. clearSentence() — single definition
//  4. handleSentenceBuilding() — single definition
// ================================================================

'use strict';

// ── State ────────────────────────────────────────────────────────
var currentMode        = 'learning';
var currentStream      = null;
var videoInterval      = null;
var currentSentence    = '';
var lastDetectedLetter = '';
var detectionCounter   = 0;
var REQUIRED_HOLD_TIME = 20;

// ── Socket — wrapped in try/catch so script never crashes ────────
// If socket.io CDN fails to load, rest of the functions still work
var socket = null;
try {
    socket = io('http://localhost:5000');

    socket.on('connect', function () {
        console.log('✅ Socket connected');
    });

    socket.on('disconnect', function () {
        console.warn('⚠️ Socket disconnected — is backend running?');
    });

    socket.on('asl_result', function (data) {
        var imgId     = (currentMode === 'learning') ? 'processedFeed' : 'processedConvFeed';
        var targetImg = document.getElementById(imgId);

        if (data.frame && targetImg) {
            targetImg.src           = data.frame;
            targetImg.style.display = 'block';
            if (currentMode === 'conversation') {
                var ph = document.getElementById('convPlaceholder');
                if (ph) ph.style.display = 'none';
            }
        }

        // Update confidence ring in learning mode
        if (currentMode === 'learning' && data.letters && data.letters.length > 0) {
            updateConfidenceRing(Math.round(data.letters[0].confidence * 100));
        }

        // Sentence building in conversation mode
        if (currentMode === 'conversation') {
            if (data.letters && data.letters.length > 0) {
                handleSentenceBuilding(data.letters[0].letter, data.letters[0].confidence * 100);
            } else if (data.letter) {
                handleSentenceBuilding(data.letter, (data.confidence || 0) * 100);
            }
        }
    });

} catch (err) {
    console.error('❌ Socket.IO failed to initialize:', err);
    console.warn('Camera will still work but sign recognition needs backend running.');
}

// ================================================================
//  ✅ FIX 1: switchMode as FUNCTION DECLARATION
//  JavaScript hoists function declarations to the top of the file.
//  This means switchMode() is ALWAYS available, even if code
//  below it crashes. "window.switchMode = function" was NOT hoisted
//  — it was only assigned when execution reached line 202.
// ================================================================
function switchMode(mode) {
    console.log('🔄 Switching to:', mode);
    currentMode = mode;

    stopCamera();

    var learningSection     = document.getElementById('learningMode');
    var conversationSection = document.getElementById('conversationMode');
    var learningBtn         = document.getElementById('learningBtn');
    var conversationBtn     = document.getElementById('conversationBtn');

    // Hide both sections, deactivate both buttons
    if (learningSection)     { learningSection.classList.remove('active');     }
    if (conversationSection) { conversationSection.classList.remove('active'); }
    if (learningBtn)         { learningBtn.classList.remove('active');         }
    if (conversationBtn)     { conversationBtn.classList.remove('active');     }

    if (mode === 'learning') {
        if (learningSection) learningSection.classList.add('active');
        if (learningBtn)     learningBtn.classList.add('active');
        startCamera('cameraFeed', 'processedFeed');
        var camBtn = document.getElementById('cameraToggle');
        if (camBtn) { camBtn.innerHTML = '🛑 Stop Camera'; camBtn.style.background = '#ef4444'; }

    } else if (mode === 'conversation') {
        if (conversationSection) conversationSection.classList.add('active');
        if (conversationBtn)     conversationBtn.classList.add('active');
        // Don't auto-start — let user click Start Camera
        var convBtn = document.getElementById('convToggleBtn');
        if (convBtn) { convBtn.innerHTML = '📹 Start Camera'; convBtn.style.background = '#10b981'; }
        var ph = document.getElementById('convPlaceholder');
        if (ph) ph.style.display = 'flex';
    }
}

// ================================================================
//  CAMERA FUNCTIONS
// ================================================================
function startCamera(videoTagId, imgTagId) {
    console.log('▶ Starting camera:', videoTagId);
    stopCamera();

    var video = document.getElementById(videoTagId);
    var img   = document.getElementById(imgTagId);

    if (!video) {
        console.error('❌ Video element not found:', videoTagId);
        return;
    }

    navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    })
    .then(function (stream) {
        currentStream = stream;

        // Show raw video immediately — user sees camera, not black screen
        video.srcObject      = stream;
        video.style.display  = 'block';
        video.onloadedmetadata = function () { video.play(); };

        // Hide processed feed until backend sends first frame
        if (img) img.style.display = 'none';

        // Send frames to backend
        var canvas = document.createElement('canvas');
        var ctx    = canvas.getContext('2d');

        videoInterval = setInterval(function () {
            if (!currentStream || !video.videoWidth) return;
            canvas.width  = 480;
            canvas.height = 360;
            ctx.drawImage(video, 0, 0, 480, 360);
            if (socket && socket.connected) {
                socket.emit('video_frame', { frame: canvas.toDataURL('image/jpeg', 0.5) });
            }
        }, 150);

        console.log('✅ Camera started');
    })
    .catch(function (err) {
        console.error('❌ Camera Error:', err);
        alert('Camera access denied! Please allow camera permissions.');
    });
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(function (t) { t.stop(); });
        currentStream = null;
    }
    if (videoInterval) {
        clearInterval(videoInterval);
        videoInterval = null;
    }
    ['cameraFeed', 'convVideo'].forEach(function (id) {
        var v = document.getElementById(id);
        if (v) { v.srcObject = null; v.style.display = 'none'; }
    });
    ['processedFeed', 'processedConvFeed'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.src = ''; el.style.display = 'none'; }
    });
}

// ================================================================
//  TOGGLE BUTTONS
// ================================================================
function toggleCamera() {
    var btn = document.getElementById('cameraToggle');
    if (currentStream) {
        stopCamera();
        if (btn) { btn.innerHTML = '📹 Start Camera'; btn.style.background = '#a855f7'; }
    } else {
        startCamera('cameraFeed', 'processedFeed');
        if (btn) { btn.innerHTML = '🛑 Stop Camera'; btn.style.background = '#ef4444'; }
    }
}

function toggleConversationCamera() {
    var btn = document.getElementById('convToggleBtn');
    var ph  = document.getElementById('convPlaceholder');
    if (currentStream) {
        stopCamera();
        if (btn) { btn.innerHTML = '📹 Start Camera'; btn.style.background = '#10b981'; }
        if (ph)  { ph.style.display = 'flex'; }
    } else {
        if (ph) ph.style.display = 'none';
        startCamera('convVideo', 'processedConvFeed');
        if (btn) { btn.innerHTML = '🛑 Stop Camera'; btn.style.background = '#ef4444'; }
    }
}

// ================================================================
//  ALPHABET / SIGN SWITCHING
// ================================================================
function changeSign(element) {
    var letter = element.getAttribute('data-letter') || element.innerText.trim();
    document.querySelectorAll('.alphabet-btn').forEach(function (b) {
        b.classList.remove('active');
    });
    element.classList.add('active');

    var refImg = document.getElementById('referenceImage');
    if (refImg) refImg.src = 'images/signs/' + letter.toLowerCase() + '.jpeg';

    var label = document.getElementById('signLabel');
    if (label) label.innerText = letter;

    updateConfidenceRing(0);
}

// ================================================================
//  CONFIDENCE RING
// ================================================================
function updateConfidenceRing(percent) {
    var ring = document.getElementById('confidenceRing');
    var text = document.getElementById('confidencePercent');
    if (ring) {
        var c = 2 * Math.PI * 45;
        ring.style.strokeDasharray  = c + ' ' + c;
        ring.style.strokeDashoffset = c - (percent / 100) * c;
    }
    if (text) text.textContent = Math.round(percent) + '%';
}

// ================================================================
//  ✅ FIX 2: handleSentenceBuilding — single definition
// ================================================================
function handleSentenceBuilding(letter, confidence) {
    var sentenceBox = document.getElementById('detectedText');
    if (!sentenceBox || !letter) return;

    if (confidence > 70) {
        if (letter === lastDetectedLetter) {
            detectionCounter++;
        } else {
            lastDetectedLetter = letter;
            detectionCounter   = 0;
        }
        if (detectionCounter === REQUIRED_HOLD_TIME) {
            currentSentence      += letter;
            sentenceBox.innerText = currentSentence;
            addToHistory(letter);
            detectionCounter = 0;
            if (navigator.vibrate) navigator.vibrate(100);
        }
    }
}

// ================================================================
//  HISTORY
// ================================================================
function addToHistory(letter) {
    var list = document.getElementById('historyList');
    if (!list) return;
    var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = '<strong style="color:#a855f7">Sign: ' + letter + '</strong>&nbsp;<small style="color:#aaa">' + time + '</small>';
    list.prepend(item);
    var ph = list.querySelector('p');
    if (ph) ph.remove();
}

// ================================================================
//  ✅ FIX 3: clearSentence — single definition
// ================================================================
function clearSentence() {
    currentSentence    = '';
    lastDetectedLetter = '';
    detectionCounter   = 0;
    var box = document.getElementById('detectedText');
    if (box) box.innerText = 'Waiting for signs...';
    var list = document.getElementById('historyList');
    if (list) list.innerHTML = '<p style="color:#888;font-size:0.9em;">History cleared</p>';
}

// ================================================================
//  COPY / SPEAK
// ================================================================
function copySentence() {
    if (!currentSentence) { alert('Nothing to copy yet!'); return; }
    navigator.clipboard.writeText(currentSentence)
        .then(function ()  { alert('Copied: ' + currentSentence); })
        .catch(function () { alert('Copy failed. Text: ' + currentSentence); });
}

function speakText() {
    var label = document.getElementById('signLabel');
    if (!label) return;
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(label.innerText));
}

// ================================================================
//  PROFILE DROPDOWN
// ================================================================
function toggleProfileMenu() {
    var dd = document.getElementById('profileDropdown');
    if (dd) dd.classList.toggle('show');
}
document.addEventListener('click', function (e) {
    var dd     = document.getElementById('profileDropdown');
    var circle = document.querySelector('.profile-circle');
    if (dd && circle && !circle.contains(e.target) && !dd.contains(e.target)) {
        dd.classList.remove('show');
    }
});

// ================================================================
//  PAGE LOAD
// ================================================================
window.addEventListener('DOMContentLoaded', function () {
    updateConfidenceRing(0);
    startCamera('cameraFeed', 'processedFeed');
    var btn = document.getElementById('cameraToggle');
    if (btn) { btn.innerHTML = '🛑 Stop Camera'; btn.style.background = '#ef4444'; }
});