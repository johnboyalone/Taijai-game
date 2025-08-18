// js/main.js (อัปเดตเพื่อทดสอบ Firebase)

// 1. Import จาก ui.js (ยังคงใช้เวอร์ชันเริ่มต้นใหม่)
import { ui, showScreen } from './ui.js';

// 2. Import 'db' จาก firebase.js (ส่วนที่เพิ่มเข้ามา)
import { db } from './firebase.js';

// 3. รอให้ HTML โหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    console.log("main.js: DOM Loaded.");
    
    // 4. ตรวจสอบว่า import 'db' มาสำเร็จหรือไม่
    if (db) {
        console.log("main.js: Successfully imported 'db' from Firebase module.");
    } else {
        console.error("main.js: Failed to import 'db' from Firebase module!");
    }
    
    // 5. ผูก Event กับ Splash Screen (เหมือนเดิม)
    if (ui.screens.splash) {
        ui.screens.splash.addEventListener('click', () => {
            console.log("main.js: Splash screen clicked!");
            showScreen('lobby');
        });
    }
});
