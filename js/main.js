import { initializeFirebase } from './firebase/config.js';
import { setupInitialListeners } from './ui/eventListeners.js';
import { showScreen } from './ui/core.js';
import { playSound, sounds } from './audio.js';
import { state } from './state.js';

function debugLog(message) {
    const debugOutput = document.getElementById('mobile-debug-output');
    if (debugOutput) {
        const p = document.createElement('p');
        p.style.margin = '2px 0';
        p.textContent = message;
        debugOutput.appendChild(p);
        debugOutput.scrollTop = debugOutput.scrollHeight;
    }
    console.log(message);
}

function setupDebugToggle() {
    const toggleBtn = document.getElementById('toggle-debug-btn');
    const container = document.getElementById('mobile-debug-container');
    if (toggleBtn && container) {
        toggleBtn.addEventListener('click', () => {
            container.classList.toggle('collapsed');
            container.classList.toggle('expanded');
            toggleBtn.textContent = container.classList.contains('collapsed') ? 'ขยาย' : 'ย่อ';
        });
    }
}

debugLog("1. main.js is loaded.");

function main() {
    debugLog("3. main() function has started.");
    try {
        initializeFirebase();
        debugLog("4. Firebase initialized successfully.");

        setupInitialListeners();
        debugLog("5. Event listeners setup complete.");

        setupDebugToggle();
        debugLog("INFO: Debug toggle button is now active.");

        showScreen('splash');
        debugLog("6. Splash screen should be visible now.");

        const playBackgroundMusic = () => {
            debugLog("INFO: User interaction detected, trying to play audio.");
            if (sounds.background.paused && !state.isMuted) {
                sounds.background.play().catch(e => debugLog(`ERROR: Audio play failed: ${e.message}`));
            }
            document.body.removeEventListener('click', playBackgroundMusic);
            document.body.removeEventListener('touchend', playBackgroundMusic);
        };
        document.body.addEventListener('click', playBackgroundMusic);
        document.body.addEventListener('touchend', playBackgroundMusic);

    } catch (error) {
        debugLog(`CRITICAL ERROR in main(): ${error.message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    debugLog("2. DOMContentLoaded event fired. The page is ready.");
    main();
});

export { debugLog };
