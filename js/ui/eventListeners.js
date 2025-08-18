// js/ui/eventListeners.js (Rebuilding - Step 1: Audio)

// Import สิ่งที่จำเป็น
import { screens, ui } from './elements.js'; // <--- เพิ่ม ui เข้ามา
import { showScreen } from './core.js';
import { playSound, sounds, toggleMute } from '../audio.js'; // <--- เพิ่มการ import เสียง
import { state } from '../state.js'; // <--- เพิ่มการ import state

export function setupInitialListeners() {
    // --- เพิ่มปุ่มควบคุมเสียงกลับเข้ามา ---
    ui.soundControl.addEventListener('click', toggleMute);

    // --- อัปเกรด Event ของ Splash Screen ให้มีเสียง ---
    screens.splash.addEventListener('click', () => {
        playSound(sounds.click); // <--- เพิ่มเสียงคลิก
        showScreen('lobby');

        // เล่นเพลงพื้นหลังถ้ายังไม่ได้เล่น
        if (sounds.background.paused && !state.isMuted) {
            sounds.background.play().catch(e => console.log("Autoplay was prevented."));
        }
    });

    // --- เพิ่ม Event ให้กับปุ่มในหน้า Lobby ---
    ui.goToCreateBtn.addEventListener('click', () => {
        playSound(sounds.click);
        showScreen('createRoom');
    });

    ui.goToJoinBtn.addEventListener('click', () => {
        playSound(sounds.click);
        showScreen('roomList');
        // เรายังไม่ใส่ฟังก์ชัน loadAndDisplayRooms() ที่เชื่อมกับ Firebase
        alert("Clicked 'Join Room'. Firebase function is not connected yet.");
    });
}
