// js/main.js

// 1. Import ให้ครบถ้วน
import { ui, showScreen, showToast } from './ui.js';
import { db, createRoom } from './firebase.js';

// 2. เพิ่มตัวแปร Game State
let currentRoomId = null;
let currentPlayerId = null;

// 3. รอให้ HTML โหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    console.log("main.js: DOM Loaded. Setting up ALL listeners.");
    setupEventListeners(); // เรียกฟังก์ชันที่รวม Listener ทั้งหมด
});

// 4. สร้างฟังก์ชันสำหรับผูก Event Listener ทั้งหมด
function setupEventListeners() {
    // Splash Screen
    ui.screens.splash.addEventListener('click', () => {
        showScreen('lobby');
    });

    // Lobby Buttons
    ui.goToCreateBtn.addEventListener('click', () => {
        showScreen('createRoom');
    });
    ui.goToJoinBtn.addEventListener('click', () => {
        // จะทำในขั้นตอนถัดไป
        showToast("ฟังก์ชัน 'เข้าร่วมห้อง' ยังไม่เปิดใช้งาน");
    });

    // Create Room Button
    ui.confirmCreateBtn.addEventListener('click', handleCreateRoom);
}

// 5. สร้างฟังก์ชัน Handler สำหรับการสร้างห้อง
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
