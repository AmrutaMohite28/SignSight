// Firebase Config
        const firebaseConfig = {
            apiKey: "AIzaSyDDDGEDZPcHUjpmCjJwIuVV4ZhwFwaIZJQ",
            authDomain: "signsight-25082.firebaseapp.com",
            projectId: "signsight-25082",
            storageBucket: "signsight-25082.firebasestorage.app",
            messagingSenderId: "1016278940224",
            appId: "1:1016278940224:web:9a8eaef508be5e2ae87da5",
            measurementId: "G-K63J1VKZ6X"
        };

        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Global Variables
        let cameraStream = null;
        let lastAnswer = ""; 
        let sessionStartTime = new Date();

        // ===== 1. TEXT TO SPEECH (FEATURE 2) =====
        function speak(text) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 1;
                window.speechSynthesis.speak(utterance);
                document.getElementById('recognizedText').textContent = text;
                lastAnswer = text;
            }
        }

        function speakCurrentText() {
            if(lastAnswer) speak(lastAnswer);
            else speak("I haven't said anything yet.");
        }

        // ===== 2. VOICE ASSISTANT =====
        function activateVoiceAssistant() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                speak("Voice features work best in Google Chrome.");
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = false;

            recognition.onstart = () => {
                document.getElementById('voiceStatus').textContent = "Listening...";
                document.getElementById('micIcon').style.color = "red";
                speak("I am listening.");
            };

            recognition.onend = () => {
                document.getElementById('voiceStatus').textContent = "Tap 'Ask Question'";
                document.getElementById('micIcon').style.color = "white";
            };

            recognition.onresult = (event) => {
                const question = event.results[0][0].transcript.toLowerCase();
                document.getElementById('recognizedText').textContent = "You asked: " + question;
                processCommand(question);
            };

            recognition.start();
        }

        // ===== 3. COMMAND PROCESSOR =====
        function processCommand(question) {
            if (question.includes("what is this") || question.includes("read") || question.includes("see")) {
                speak("Checking the scene...");
                readScreen();
            } 
            else if (question.includes("where am i") || question.includes("location")) {
                speak("Getting your location...");
                shareLocation();
            } 
            else if (question.includes("camera") || question.includes("start")) {
                startCamera();
            } 
            else {
                speak("Please ask 'What is this?' or 'Where am I?'.");
            }
        }

        // ===== 4. CAMERA =====
        async function startCamera() {
            try {
                if (cameraStream) {
                    speak("Camera is already on.");
                    return;
                }
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                document.getElementById('cameraFeed').srcObject = cameraStream;
                document.getElementById('cameraContainer').style.display = 'block';
                speak("Camera started.");
            } catch (error) {
                speak("Camera permission denied.");
            }
        }

        // ===== 5. OBJECT DETECTION =====
        async function readScreen() {
            if (!cameraStream) {
                speak("Starting camera first...");
                await startCamera();
                setTimeout(captureAndSend, 2000); 
            } else {
                captureAndSend();
            }
        }

        function captureAndSend() {
            speak("Scanning...");
            const video = document.getElementById('cameraFeed');
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('image', blob, 'capture.jpg');

                try {
                    const response = await fetch('http://localhost:5000/api/describe-image', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    const answer = data.description || "I cannot identify anything.";
                    speak(answer);
                } catch (error) {
                    speak("Error connecting to server.");
                }
            }, 'image/jpeg');
        }

        // ===== 6. LOCATION (LOGGING TO FIREBASE) =====
        function shareLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude.toFixed(4);
                        const lon = position.coords.longitude.toFixed(4);
                        const answer = `You are at Latitude ${lat} and Longitude ${lon}.`;
                        speak(answer);
                        
                        if (auth.currentUser) {
                            db.collection('location_logs').add({
                                userId: auth.currentUser.uid,
                                latitude: lat,
                                longitude: lon,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                mode: 'blind'
                            });
                        }
                    },
                    (error) => speak("Cannot get location.")
                );
            } else {
                speak("GPS not supported.");
            }
        }

        // ===== 7. SOS FUNCTIONALITY =====
        function triggerSOS() {
            speak("Emergency triggered! Calling 100.");
            
            if (navigator.geolocation && auth.currentUser) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    db.collection('sos_logs').add({
                        userId: auth.currentUser.uid,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        mode: 'blind' 
                    });
                }, (err) => console.log("SOS GPS Error", err));
            }
            window.location.href = 'tel:100';
        }

        // ===== NAVIGATION =====
        async function goBack() {
            if(cameraStream) cameraStream.getTracks().forEach(track => track.stop());
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            
            const user = auth.currentUser;
            if (user) {
                const duration = Math.round((new Date() - sessionStartTime) / 60000) || 1;
                await db.collection('users').doc(user.uid).update({
                    totalMinutes: firebase.firestore.FieldValue.increment(duration),
                    sessionsCompleted: firebase.firestore.FieldValue.increment(1),
                    blindSessions: firebase.firestore.FieldValue.increment(1),
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            window.location.href = 'dashboard.html';
        }

        // ===== WORKING MENU LINKS [cite: 2026-02-19] =====
        function openSettings() { 
            speak("Opening settings."); 
            window.location.href = 'settings.html'; 
        }

        function openPreferences() { 
            speak("Opening preferences."); 
            window.location.href = 'preferences.html'; 
        }

        function openHelp() { 
            speak("Opening help and support."); 
            window.location.href = 'help.html'; 
        }

        function openAbout() { 
            speak("SignSight version 1.0. Empowering freedom of communication."); 
            alert("SignSight v1.0"); 
        }
function editProfile() {
    window.location.href = 'edit-profile.html';
}
        // Menu Utilities
        function toggleSettingsMenu() {
            document.getElementById('settingsMenu').classList.toggle('show');
            document.getElementById('profileMenu').classList.remove('show');
        }

        function toggleProfileMenu() {
            document.getElementById('profileMenu').classList.toggle('show');
            document.getElementById('settingsMenu').classList.remove('show');
        }

        function editProfile() { alert('Edit Profile coming soon!'); }

        function logout() {
            if (confirm('Logout?')) {
                auth.signOut().then(() => window.location.href = 'index.html');
            }
        }

        // Load User
        auth.onAuthStateChanged(user => {
            if (user) {
                document.getElementById('profileName').textContent = user.displayName || 'User';
                document.getElementById('profileEmail').textContent = user.email;
                const initial = (user.displayName || 'U').charAt(0).toUpperCase();
                document.getElementById('profileBadge').textContent = initial;
                document.getElementById('profileAvatar').textContent = initial;
            } else {
                window.location.href = 'login.html';
            }
        });

        // Close menus
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.nav-icon-btn') && !e.target.closest('.dropdown-menu')) {
                document.getElementById('settingsMenu').classList.remove('show');
                document.getElementById('profileMenu').classList.remove('show');
            }
        });

        // Accessibility Announcement [cite: 2025-12-15]
        window.addEventListener('load', function() {
            setTimeout(() => {
                speak("Blind Mode Active. Focus on any button to hear its function.");
            }, 500);
        });
