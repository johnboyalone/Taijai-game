// js/main.js
import { initializeFirebase } from './firebase/config.js';
import { initializeAudio } from './audio.js';
import { setupInitialListeners } from './ui/eventListeners.js';
import { showScreen } from './ui/core.js';

/**
 * ฟังก์ชันหลักของแอปพลิเคชัน
 * ทำหน้าที่เริ่มต้นระบบต่างๆ ตามลำดับ
 */
function main() {
    // 1. เริ่มการเชื่อมต่อกับ Firebase
    initializeFirebase();

    // 2. ตั้งค่าระบบเสียง
    initializeAudio();

    // 3. ผูก Event Listeners ทั้งหมดเข้ากับปุ่มและ element ต่างๆ
    setupInitialListeners();

    // 4. แสดงหน้าจอแรก (Splash Screen)
    showScreen('splash');
}

// รอให้โครงสร้าง HTML (DOM) โหลดเสร็จสมบูรณ์ก่อนที่จะเริ่มทำงานของ JavaScript
document.addEventListener('DOMContentLoaded', main);
