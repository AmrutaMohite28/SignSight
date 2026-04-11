// 🚨 SOS FUNCTION
function triggerSOS() {
    if (confirm("do you really want to activate 🚨 Emergency SOS ?")) {
        startEmergencyProtocol();
    }
}

function startEmergencyProtocol() {
    // 1. GPS Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Google Maps link
                const mapLink = `https://www.google.com/maps?q=${lat},${lon}`;

                // 2. WhatsApp Share
                const emergencyContact = "919769176126"; // Tujha contact number tak
                const message = encodeURIComponent(
                    `🚨 SOS! Mala madat pahije.\nMajhi location: ${mapLink}`
                );

                window.open(
                    `https://wa.me/${emergencyContact}?text=${message}`,
                    "_blank"
                );

                // 3. Emergency Call
                setTimeout(() => {
                    window.location.href = "tel:112";
                }, 2000);
            },
            (error) => {
                console.error("Location Error:", error);
                alert("Location access deny jhala. Please GPS enable kar.");
            }
        );
    } else {
        alert("Geolocation browser madhye support nahi.");
    }
}