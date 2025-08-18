// js/firebase/roomManager.js (Rebuilding - Step 1: Restore loadAndDisplayRooms)

import { db } from './config.js';
import { state } from '../state.js';
import { ui } from '../ui/elements.js';
import { showScreen, showToast } from '../ui/core.js';
import { playSound, sounds } from '../audio.js';

// --- ฟังก์ชันนี้ยังเป็นตัวทดสอบ ---
export function createRoom() {
    alert("createRoom function is still a test function.");
}

// --- ใส่โค้ดของจริงกลับเข้าไปในฟังก์ชันนี้ ---
export function loadAndDisplayRooms() {
    const roomsRef = db.ref('rooms').orderByChild('gameState').equalTo('waiting');
    if (state.roomListListener) roomsRef.off('value', state.roomListListener);

    state.roomListListener = roomsRef.on('value', snapshot => {
        ui.roomListContent.innerHTML = '';
        if (!snapshot.exists()) {
            ui.roomListContent.innerHTML = '<p class="no-rooms-message">ยังไม่มีห้องว่างในขณะนี้...</p>';
            return;
        }
        snapshot.forEach(childSnapshot => {
            const roomData = childSnapshot.val();
            if (!roomData.players) return;

            const playerCount = Object.values(roomData.players).filter(p => p.connected).length;
            if (playerCount === 0) {
                db.ref('rooms/' + childSnapshot.key).remove();
                return;
            }

            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            roomItem.innerHTML = `<div class="room-info"><div class="room-name">${roomData.roomName}</div><div class="host-name">สร้างโดย: ${roomData.hostName}</div></div><div class="room-status">${playerCount} / 4</div>`;

            roomItem.addEventListener('click', () => {
                playSound(sounds.click);
                if (playerCount >= 4) {
                    showToast("ห้องนี้เต็มแล้ว");
                    return;
                }
                ui.passwordModalRoomName.textContent = `ห้อง: ${roomData.roomName}`;
                ui.passwordModal.dataset.roomId = childSnapshot.key;
                ui.passwordModal.dataset.roomName = roomData.roomName;
                ui.passwordModal.classList.add('show');
            });
            ui.roomListContent.appendChild(roomItem);
        });
    });
}

// --- ฟังก์ชันที่เหลือยังไม่ต้องใส่โค้ดจริง ---
export function handlePasswordSubmit() {
    // ยังไม่ต้องทำอะไร
}
export function joinRoom() {
    // ยังไม่ต้องทำอะไร
}
