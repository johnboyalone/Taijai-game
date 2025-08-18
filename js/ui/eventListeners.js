// js/ui/eventListeners.js (Rebuilding - Step 3: Firebase Write)

// Import สิ่งที่จำเป็น
import { screens, ui } from './elements.js';
import { showScreen, showToast } from './core.js'; // <--- เพิ่ม showToast
import { playSound, sounds, toggleMute } from '../audio.js';
import { state } from '../state.js';
// --- เพิ่มการ import จาก Firebase ---
import { loadAndDisplayRooms, createRoom } from '../firebase/roomManager.js'; // <--- เพิ่ม createRoom

export function setupInitialListeners() {
    ui.soundControl.addEventListener('click', toggleMute);
    screens.splash.addEventListener('click', () => {
        playSound(sounds.click);
        showScreen('lobby');
        if (sounds.background.paused && !state.isMuted) {
            sounds.background.play().catch(e => console.log("Autoplay was prevented."));
        }
    });

    // --- แก้ไขปุ่มสร้างห้อง ---
    ui.goToCreateBtn.addEventListener('click', () => {
        playSound(sounds.click);
        showScreen('createRoom');
        // ไม่มี alert แล้ว เพราะเราจะให้ปุ่ม "ยืนยัน" ทำงานจริง
    });

    ui.goToJoinBtn.addEventListener('click', () => {
        playSound(sounds.click);
        showScreen('roomList');
        loadAndDisplayRooms();
    });

    // --- เพิ่ม Event Listener ให้กับปุ่ม "ยืนยันและสร้างห้อง" ---
    ui.confirmCreateBtn.addEventListener('click', () => {
        playSound(sounds.click);
        // เรียกใช้ฟังก์ชัน createRoom ของจริง
        createRoom();
    });
}
