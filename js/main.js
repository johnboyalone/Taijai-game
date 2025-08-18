// js/main.js (Final Stand - Step 1)

// เราจะ import แค่ 2 อย่างที่เรารู้ว่าปลอดภัย
import { showScreen } from './ui/core.js';
import { setupInitialListeners } from './ui/eventListeners.js';

// เรียกใช้ฟังก์ชันหลัก
setupInitialListeners();
showScreen('splash');
