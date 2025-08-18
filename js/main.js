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

    // 2. ตั้งค่า Event Listeners ทั้งหมด
    setupInitialListeners();
    
    // 3. แสดงหน้าจอแรก
    showScreen('splash');

    // 4. จัดการการเล่นเสียงพื้นหลังเมื่อผู้ใช้มีการโต้ตอบครั้งแรก
    const playBackgroundMusic = () => {
        if (sounds.background.paused && !state.isMuted) {
            sounds.background.play().catch(e => console.log("Autoplay was prevented."));
        }
        document.body.removeEventListener('click', playBackgroundMusic);
        document.body.removeEventListener('touchend', playBackgroundMusic);
    };

    document.body.addEventListener('click', playBackgroundMusic);
    document.body.addEventListener('touchend', playBackgroundMusic);
}

// รอให้โครงสร้าง HTML (DOM) โหลดเสร็จสมบูรณ์ก่อนที่จะเริ่มทำงาน
document.addEventListener('DOMContentLoaded', main);
