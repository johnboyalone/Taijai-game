// js/main.js (เวอร์ชันสำหรับดีบัก)
import { initializeFirebase } from './firebase/config.js';
import { initializeAudio } from './audio.js';
import { setupInitialListeners } from './ui/eventListeners.js';
import { showScreen } from './ui/core.js';

// ป้ายบอกทางที่ 1
alert("1. main.js is running!");

function main() {
    // ป้ายบอกทางที่ 2
    alert("2. main() function started!");

    initializeFirebase();
    alert("3. Firebase Initialized!");

    initializeAudio();
    alert("4. Audio Initialized!");

    setupInitialListeners();
    alert("5. Event Listeners Setup!");

    showScreen('splash');
    alert("6. Splash Screen Shown!");
}

main();
