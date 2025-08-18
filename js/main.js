import { initializeFirebase } from './firebase/config.js';
import { setupInitialListeners } from './ui/eventListeners.js';
import { showScreen } from './ui/core.js';
import { playSound, sounds } from './audio.js';
import { state } from './state.js';

/**
 * ฟังก์ชันหลักในการเริ่มต้นแอปพลิเคชัน
 */
function main() {
    // 1. เริ่มต้นการเชื่อมต่อกับ Firebase
    initializeFirebase();

    // 2. ตั้งค่า Event Listeners ทั้งหมดหลังจากที่ DOM พร้อมใช้งาน
    // ใช้ DOMContentLoaded เพื่อให้แน่ใจว่า HTML โหลดเสร็จแล้ว
    document.addEventListener('DOMContentLoaded', () => {
        setupInitialListeners();
        showScreen('splash'); // แสดงหน้าจอแรก

        // จัดการการเล่นเสียงพื้นหลังเมื่อผู้ใช้มีการโต้ตอบครั้งแรก
        // แก้ปัญหาเบราว์เซอร์บล็อกเสียง
        const playBackgroundMusic = () => {
            if (sounds.background.paused && !state.isMuted) {
                sounds.background.play().catch(e => console.log("Autoplay was prevented. User interaction needed."));
            }
            // ลบ listener นี้ออกไปหลังจากทำงานแล้ว เพื่อไม่ให้ทำงานซ้ำ
            document.body.removeEventListener('click', playBackgroundMusic);
            document.body.removeEventListener('touchend', playBackgroundMusic);
        };

        document.body.addEventListener('click', playBackgroundMusic);
        document.body.addEventListener('touchend', playBackgroundMusic);
    });
}

// เริ่มต้นการทำงานของแอป
main();
