// js/main.js

// =================================================================
// ======== IMPORTS ========
// =================================================================
import { ui, showScreen, showToast } from './ui.js';
import { initializeSounds, playSound, playBackgroundMusic } from './game.js';
import { createRoom, loadAndDisplayRooms } from './firebase.js'; // <-- Import ฟังก์ชันจาก Firebase

// =================================================================
// ======== GAME STATE VARIABLES ========
// =================================================================
let isMuted = false;
let currentRoomId = null;
let currentPlayerId = null;

// =================================================================
// ======== INITIALIZATION ========
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("App is ready. Setting up listeners.");
    initializeSounds(); // <-- เรียกใช้ฟังก์ชันตั้งค่าเสียง
    setupEventListeners();
    showScreen('splash');
});

// =================================================================
// ======== EVENT LISTENERS SETUP ========
// =================================================================
function setupEventListeners() {
    // --- Splash Screen Listener ---
    if (ui.screens.splash) {
        ui.screens.splash.addEventListener('click', handleSplashClick);
    }

    // --- Sound Control Listener ---
    if (ui.soundControl) {
        ui.soundControl.addEventListener('click', toggleMute);
    }

    // --- Lobby Buttons Listeners (ส่วนที่เพิ่มเข้ามา) ---
    if (ui.goToCreateBtn) {
        ui.goToCreateBtn.addEventListener('click', () => {
            playSound('click', isMuted);
            showScreen('createRoom');
        });
    }
    if (ui.goToJoinBtn) {
        ui.goToJoinBtn.addEventListener('click', () => {
            playSound('click', isMuted);
            showScreen('roomList');
            loadAndDisplayRooms(); // <-- เรียกใช้ฟังก์ชันโหลดห้อง
        });
    }

    // --- Create Room Listener (ส่วนที่เพิ่มเข้ามา) ---
    if (ui.confirmCreateBtn) {
        ui.confirmCreateBtn.addEventListener('click', handleCreateRoom);
    }
}

// =================================================================
// ======== EVENT HANDLER FUNCTIONS ========
// =================================================================
function handleSplashClick() {
    playSound('click', isMuted);
    showScreen('lobby');
    playBackgroundMusic(isMuted); // <-- เริ่มเล่นเพลงพื้นหลัง
}

function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        // stopBackgroundMusic(); // ฟังก์ชันนี้ยังไม่มี แต่จะเพิ่มทีหลัง
        ui.soundIcon.textContent = '🔇';
    } else {
        playBackgroundMusic(isMuted);
        ui.soundIcon.textContent = '🔊';
    }
    playSound('click', isMuted);
    console.log(`Sound is now ${isMuted ? 'Muted' : 'On'}`);
}

// --- ฟังก์ชันใหม่สำหรับจัดการการสร้างห้อง ---
async function handleCreateRoom() {
    playSound('click', isMuted);

    const hostName = ui.hostNameInput.value.trim();
    const roomName = ui.newRoomNameInput.value.trim();
    const password = ui.newRoomPasswordInput.value;

    if (!hostName || !roomName || !/^\d{4}$/.test(password)) {
        showToast('กรุณากรอกข้อมูลให้ครบ (รหัสผ่าน 4 ตัวเลข)');
        return;
    }

    try {
        // เรียกใช้ฟังก์ชัน createRoom จาก firebase.js
        const result = await createRoom(hostName, roomName, password);
        currentRoomId = result.roomId;
        currentPlayerId = result.playerId;

        showToast(`สร้างห้อง "${roomName}" สำเร็จ!`);
        showScreen('waiting'); // <-- ไปยังห้องรอเล่น
        // listenToRoomUpdates(currentRoomId); // <-- จะเปิดใช้งานในขั้นตอนถัดไป
    } catch (error) {
        showToast('เกิดข้อผิดพลาดในการสร้างห้อง: ' + error.message);
    }
}
