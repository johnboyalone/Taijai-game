// js/main.js

// =================================================================
// ======== IMPORTS ========
// =================================================================
// นำเข้าตัวแปร ui และฟังก์ชันที่จำเป็นจาก ui.js
import { ui, showScreen, showToast } from './ui.js'; 
// (ในอนาคตเราจะ import จาก game.js และ firebase.js ด้วย)

// =================================================================
// ======== GAME STATE VARIABLES ========
// =================================================================
let isMuted = false;
// (ตัวแปรสถานะอื่นๆ จะมาอยู่ที่นี่ เช่น currentRoomId, currentPlayerId)

// =================================================================
// ======== INITIALIZATION ========
// =================================================================
// รอให้ HTML โหลดเสร็จสมบูรณ์ก่อนที่จะเริ่มทำงานกับ Element ใดๆ
document.addEventListener('DOMContentLoaded', () => {
    console.log("App is ready. Setting up listeners.");
    setupEventListeners();
    showScreen('splash'); // เริ่มต้นด้วยการแสดง Splash Screen
});

// =================================================================
// ======== EVENT LISTENERS SETUP ========
// =================================================================
// ฟังก์ชันนี้มีหน้าที่รวมการผูก Event Listener ทั้งหมดไว้ในที่เดียว
function setupEventListeners() {
    
    // --- Splash Screen Listener ---
    // นี่คือส่วนที่แก้ไขปัญหาโดยตรง
    // เราใช้ ui.screens.splash ที่ import เข้ามา
    if (ui.screens.splash) {
        ui.screens.splash.addEventListener('click', handleSplashClick);
    } else {
        console.error("CRITICAL: Splash Screen element not found in UI object.");
    }

    // --- Sound Control Listener ---
    if (ui.soundControl) {
        ui.soundControl.addEventListener('click', toggleMute);
    }

    // --- Lobby Buttons Listeners ---
    // เราจะผูก Event ของปุ่มอื่นๆ ที่นี่ต่อไป
    // if (ui.goToCreateBtn) {
    //     ui.goToCreateBtn.addEventListener('click', () => {
    //         // playSound('click', isMuted);
    //         showScreen('createRoom');
    //     });
    // }
    // if (ui.goToJoinBtn) {
    //     ui.goToJoinBtn.addEventListener('click', () => {
    //         // playSound('click', isMuted);
    //         showScreen('roomList');
    //         // loadAndDisplayRooms();
    //     });
    // }
}

// =================================================================
// ======== EVENT HANDLER FUNCTIONS ========
// =================================================================
// ฟังก์ชันที่ถูกเรียกเมื่อมีการคลิกที่ Splash Screen
function handleSplashClick() {
    console.log("Splash screen clicked, moving to lobby.");
    // playSound('click', isMuted); // จะเปิดใช้งานเมื่อ import เสียงเข้ามา
    showScreen('lobby');
    
    // ลองเล่นเสียงพื้นหลัง (จะเปิดใช้งานเมื่อ import เสียงเข้ามา)
    // if (sounds.background.paused && !isMuted) {
    //     sounds.background.play().catch(e => console.log("Autoplay was prevented."));
    // }
}

function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        // sounds.background.pause();
        ui.soundIcon.textContent = '🔇';
    } else {
        // sounds.background.play().catch(e => console.log("Autoplay was prevented."));
        ui.soundIcon.textContent = '🔊';
    }
    // playSound('click', isMuted);
    console.log(`Sound is now ${isMuted ? 'Muted' : 'On'}`);
}
