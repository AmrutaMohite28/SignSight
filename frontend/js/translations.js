const translations = {
    en: {
        welcome: "Welcome",
        deaf: "Deaf Mode",
        blind: "Blind Mode",
        sos: "SOS",
        stats: "Statistics",
        start: "Start Exploring"
    },
    mr: {
        welcome: "स्वागत आहे",
        deaf: "बधिर मोड",
        blind: "अंध मोड",
        sos: "तातडीची मदत (SOS)",
        stats: "आकडेवारी",
        start: "सुरुवात करा"
    },
    hi: {
        welcome: "स्वागत है",
        deaf: "बधिर मोड",
        blind: "अंध मोड",
        sos: "आपातकालीन मदद",
        stats: "सांख्यिकी",
        start: "शुरू करें"
    }
};

function changeLanguage(lang) {
    localStorage.setItem('selectedLang', lang);
    applyTranslations(lang);
}

function applyTranslations(lang) {
    const t = translations[lang] || translations['en'];
    
    // IDs update kara
    if(document.getElementById('displayName')) {
        document.getElementById('displayName').innerText = t.welcome;
    }
    
    // Buttons ani Labels update kara
    document.querySelectorAll('.mode-title').forEach(el => {
        if(el.innerText.includes("Deaf")) el.innerText = t.deaf;
        if(el.innerText.includes("Blind")) el.innerText = t.blind;
    });
}

// Page load honyar default language set kara
window.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('selectedLang') || 'en';
    applyTranslations(savedLang);
});