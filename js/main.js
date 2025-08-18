// js/main.js (ฉบับแก้ไข null error)

// 1. Import ให้ครบถ้วน (เหมือนเดิม)
import { ui, showScreen, showToast } from './ui.js';
import { db, createRoom } from './firebase.js';

// 2. เพิ่มตัวแปร Game State (เหมือนเดิม)
let currentRoomId = null;
let currentPlayerId = null;

// 3. รอให้ HTML โหลดเสร็จ (เหมือนเดิม)
document.addEventListener('DOMContentLoaded', () => {
    console.log("main.js: DOM Loaded. Setting up ALL listeners.");
    setupEventListeners();
});

// 4. ฟังก์ชันสำหรับผูก Event Listener ทั้งหมด (ส่วนที่แก้ไข)
function setupEventListeners() {
    
    // --- ตรวจสอบก่อนผูก Event ทุกครั้ง ---

    if (ui.screens.splash) {
        ui.screens.splash.addEventListener('click', () => {
            showScreen('lobby');
        });
    }

    if (ui.goToCreateBtn) {
        ui.goToCreateBtn.addEventListener('click', () => {
            showScreen('createRoom');
        });
    }

    if (ui.goToJoinBtn) {
        ui.goToJoinBtn.addEventListener('click', () => {
            showToast("ฟังก์ชัน 'เข้าร่วมห้อง' ยังไม่เปิดใช้งาน");
        });
    }

    if (ui.confirmCreateBtn) {
        ui.confirmCreateBtn.addEventListener('click', handleCreateRoom);
    }
}

// 5. ฟังก์ชัน Handler สำหรับการสร้างห้อง (เหมือนเดิม)
async function handleCreateRoom() {
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
        // listenToRoomUpdates(currentRoomId, onRoomUpdate); // <-- ขั้นตอนต่อไป
    } catch (error) {
        showToast('เกิดข้อผิดพลาด: ' + error.message);
    }
}
