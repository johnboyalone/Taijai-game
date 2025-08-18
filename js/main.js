// js/main.js (REVISED to work with new UI structure)

import { ui, showScreen, showToast } from './ui.js';
import { db, createRoom } from './firebase.js';

let currentRoomId = null;
let currentPlayerId = null;

// ฟังก์ชันสำหรับผูก Event Listener ทั้งหมด
function setupEventListeners() {
    // การตรวจสอบ if ยังคงเป็นสิ่งที่ดี แต่ตอนนี้มันจะทำงานได้อย่างถูกต้อง
    if (ui.screens.splash) {
        ui.screens.splash.addEventListener('click', () => {
            showScreen('lobby');
        });
    }

    if (ui.buttons.goToCreate) {
        ui.buttons.goToCreate.addEventListener('click', () => {
            showScreen('createRoom');
        });
    }

    if (ui.buttons.goToJoin) {
        ui.buttons.goToJoin.addEventListener('click', () => {
            showToast("ฟังก์ชัน 'เข้าร่วมห้อง' ยังไม่เปิดใช้งาน");
        });
    }

    if (ui.buttons.confirmCreate) {
        ui.buttons.confirmCreate.addEventListener('click', handleCreateRoom);
    }
}

// ฟังก์ชัน Handler สำหรับการสร้างห้อง
async function handleCreateRoom() {
    const hostName = ui.inputs.hostName.value.trim();
    const roomName = ui.inputs.roomName.value.trim();
    const password = ui.inputs.roomPassword.value;

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
    } catch (error) {
        showToast('เกิดข้อผิดพลาด: ' + error.message);
    }
}

// รอให้ HTML โหลดเสร็จแล้วค่อยเริ่มทำงาน
document.addEventListener('DOMContentLoaded', setupEventListeners);
