// js/main.js (เวอร์ชันเริ่มต้นใหม่)

// 1. Import เฉพาะสิ่งที่จำเป็นสำหรับการทดสอบนี้
import { ui, showScreen } from './ui.js';

// 2. รอให้ HTML โหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    console.log("main.js: DOM Loaded. Setting up initial listener.");
    
    // 3. ผูก Event กับ Splash Screen
    if (ui.screens.splash) {
        ui.screens.splash.addEventListener('click', () => {
            console.log("main.js: Splash screen clicked!");
            showScreen('lobby');
        });
    } else {
        console.error("main.js: Splash screen element not found!");
    }
});
