// js/main.js (เวอร์ชันสมบูรณ์)

import { initializeAudio } from './audio.js';
import { setupInitialListeners } from './ui/eventListeners.js';
import { showScreen } from './ui/core.js';
// ไม่ต้อง import อะไรจาก firebase/config.js ที่นี่โดยตรง

function main() {
    initializeAudio();
    setupInitialListeners();
    showScreen('splash');
}

main();
