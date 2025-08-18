// js/ui/eventListeners.js (Final Stand - Step 2)

// Import เฉพาะสิ่งที่จำเป็นสำหรับหน้า Splash
import { screens } from './elements.js';
import { showScreen } from './core.js';
// เรายังไม่ import เสียง หรือ Firebase หรืออะไรทั้งสิ้น

export function setupInitialListeners() {
    // เราจะผูก Event แค่อันเดียว คือการคลิกที่หน้า Splash
    screens.splash.addEventListener('click', () => {
        // เมื่อคลิก ให้ไปที่หน้า lobby
        showScreen('lobby');
        alert("It works! You clicked the splash screen and moved to the lobby screen.");
    });
}
