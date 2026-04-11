// ================= 1. PAGE LOAD EVENTS =================
document.addEventListener("DOMContentLoaded", function() {
    
    // --- Menu Toggle Logic (Tujha aadhicha code) ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
            menuToggle.setAttribute('aria-expanded', !expanded);
        });
    }

    document.addEventListener('click', function(event) {
        if (menuToggle && navMenu && !menuToggle.contains(event.target) && !navMenu.contains(event.target)) {
            navMenu.classList.remove('active');
        }
    });

    // --- Account Status Logic ---
    const usernameElement = document.getElementById("displayUsername");
    if(usernameElement) {
        usernameElement.innerText = "SignSightUser"; 
    }

    // --- Text Size Logic ---
    const textSizeDropdown = document.getElementById("textSize");
    if (textSizeDropdown) {
        const savedSize = localStorage.getItem("textSize") || "medium";
        textSizeDropdown.value = savedSize;
        applyTextSize(savedSize);

        textSizeDropdown.addEventListener("change", function() {
            applyTextSize(this.value);
        });
    }

    // --- Load Other Saved Settings ---
    if(localStorage.getItem("speechRate")) {
        document.getElementById("speechRate").value = localStorage.getItem("speechRate");
    }
    if(localStorage.getItem("detectionSpeed")) {
        document.getElementById("detectionSpeed").value = localStorage.getItem("detectionSpeed");
    }
    if(localStorage.getItem("audioFeedback") !== null) {
        document.getElementById("audioFeedback").checked = (localStorage.getItem("audioFeedback") === "true");
    }
    if(localStorage.getItem("appLanguage")) {
        document.getElementById("appLanguage").value = localStorage.getItem("appLanguage");
    }
});

// ================= 2. HELPER FUNCTION (Text Size) =================
function applyTextSize(size) {
    document.body.classList.remove("text-small", "text-medium", "text-large");
    document.body.classList.add("text-" + size);
}

// ================= 3. SAVE SETTINGS FUNCTION =================
function saveSettings() {
    try {
        const speechRate = document.getElementById("speechRate").value;
        const detectionSpeed = document.getElementById("detectionSpeed").value;
        const audioFeedback = document.getElementById("audioFeedback").checked;
        const textSize = document.getElementById("textSize").value;
        const appLanguage = document.getElementById("appLanguage").value;

        localStorage.setItem("speechRate", speechRate);
        localStorage.setItem("detectionSpeed", detectionSpeed);
        localStorage.setItem("audioFeedback", audioFeedback);
        localStorage.setItem("textSize", textSize);
        localStorage.setItem("appLanguage", appLanguage);

        const saveBtn = document.querySelector(".btn-primary");
        if(saveBtn) {
            saveBtn.innerText = "Saved Successfully! ✅";
            saveBtn.style.backgroundColor = "#10b981"; 

            setTimeout(function() {
                saveBtn.innerText = "Save Changes";
                saveBtn.style.backgroundColor = ""; 
            }, 2000);
        }

    } catch (error) {
        console.error("Error saving settings:", error);
        alert("Kahitari chukla aahe. Console check kara.");
    }
}