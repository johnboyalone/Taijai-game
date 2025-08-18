// js/main.js

// --- IMPORTS ---
import { ui, showScreen, showToast, updateWaitingRoomUI } from './ui.js'; // <-- เพิ่ม updateWaitingRoomUI
import { initializeSounds, playSound, playBackgroundMusic } from './game.js';
import { createRoom, loadAndDisplayRooms, listenToRoomUpdates, stopListeningToRoom } from './firebase.js'; // <-- เพิ่ม listenToRoomUpdates, stopListeningToRoom

// ... (GAME STATE VARIABLES เดิม) ...

// ... (INITIALIZATION เดิม) ...

// ... (EVENT LISTENERS SETUP เดิม) ...

// --- EVENT HANDLER FUNCTIONS ---

// ... (handleSplashClick, toggleMute เดิม) ...

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
        const result = await createRoom(hostName, roomName, password);
        currentRoomId = result.roomId;
        currentPlayerId = result.playerId;

        showToast(`สร้างห้อง "${roomName}" สำเร็จ!`);
        showScreen('waiting');
        
        // (ส่วนสำคัญ) เริ่มฟังการอัปเดตของห้องนี้
        listenToRoomUpdates(currentRoomId, onRoomUpdate);

    } catch (error) {
        showToast('เกิดข้อผิดพลาดในการสร้างห้อง: ' + error.message);
    }
}

// (เพิ่มใหม่) ฟังก์ชัน Callback ที่จะทำงานทุกครั้งที่ข้อมูลห้องใน Firebase เปลี่ยน
function onRoomUpdate(roomData) {
    if (!roomData) {
        // ถ้า roomData เป็น null หมายความว่าห้องถูกลบ
        stopListeningToRoom(currentRoomId);
        showToast("ห้องถูกปิดแล้ว กลับสู่หน้าหลัก");
        setTimeout(() => window.location.reload(), 3000);
        return;
    }

    console.log("Room data updated:", roomData);

    // ตรวจสอบสถานะของเกม
    switch(roomData.gameState) {
        case 'waiting':
            // ถ้ายังอยู่ในสถานะรอ ให้ทำการอัปเดต UI ของห้องรอเล่น
            if (!ui.screens.waiting.classList.contains('show')) {
                showScreen('waiting'); // เผื่อกรณีกลับมาหน้านี้
            }
            updateWaitingRoomUI(roomData, currentPlayerId);
            break;
        case 'setup':
            // (จะทำในขั้นตอนถัดไป)
            console.log("Game state is now 'setup'");
            break;
        case 'playing':
            // (จะทำในขั้นตอนถัดไป)
            console.log("Game state is now 'playing'");
            break;
        case 'finished':
            // (จะทำในขั้นตอนถัดไป)
            console.log("Game state is now 'finished'");
            break;
    }
}
