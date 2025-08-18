// js/firebase/roomManager.js (Final Confirmed Version)

import { db } from './config.js';
import { state } from '../state.js';
import { ui } from '../ui/elements.js';
import { showScreen, showToast } from '../ui/core.js';
import { playSound, sounds } from '../audio.js';
// เราจะ import gameState.js ในไฟล์อื่นแทน เพื่อป้องกันการพังที่นี่
import { listenToRoomUpdates } from './gameState.js';

export function createRoom() {
    const hostName = ui.hostNameInput.value.trim();
    const roomName = ui.newRoomNameInput.value.trim();
    const password = ui.newRoomPasswordInput.value;

    if (!hostName || !roomName || !/^\d{4}$/.test(password)) {
        showToast('กรุณากรอกข้อมูลให้ครบ (รหัสผ่าน 4 ตัวเลข)');
        return;
    }

    const newRoomId = db.ref('rooms').push().key;
    state.currentPlayerId = 'player1';
    state.currentRoomId = newRoomId;

    const roomData = { /* ... โค้ด roomData เหมือนเดิม ... */ 
        roomName, hostName, password,
        players: {
            'player1': { id: 'player1', name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3, status: 'playing' },
            'player2': { id: 'player2', name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
            'player3': { id: 'player3', name: 'ผู้เล่น 3', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
            'player4': { id: 'player4', name: 'ผู้เล่น 4', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' }
        },
        playerCount: 1, gameState: 'waiting', turn: null, turnOrder: [], rematch: {}, lastAction: null
    };

    db.ref('rooms/' + newRoomId).set(roomData).then(() => {
        showToast(`สร้างห้อง "${roomName}" สำเร็จ!`);
        listenToRoomUpdates(); // เรียกใช้ listener
        showScreen('waiting');
    }).catch(error => showToast('เกิดข้อผิดพลาด: ' + error.message));
}

// ฟังก์ชัน loadAndDisplayRooms และอื่นๆ เหมือนเดิม
export function loadAndDisplayRooms() { /* ... โค้ดเหมือนเดิม ... */ 
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
export function handlePasswordSubmit() { /* ... โค้ดเหมือนเดิม ... */ 
    const roomId = ui.passwordModal.dataset.roomId;
    const roomName = ui.passwordModal.dataset.roomName;
    const enteredPassword = ui.passwordModalInput.value;
    db.ref(`rooms/${roomId}/password`).get().then(snapshot => {
        if (snapshot.val() === enteredPassword) {
            ui.passwordModalInput.value = '';
            ui.passwordModal.classList.remove('show');
            state.joiningRoomData = { id: roomId, name: roomName };
            ui.joinerRoomNameDisplay.textContent = roomName;
            showScreen('joinerSetup');
        } else {
            showToast('รหัสผ่านไม่ถูกต้อง!');
        }
    });
}
export function joinRoom() { /* ... โค้ดเหมือนเดิม ... */ 
    const joinerName = ui.joinerNameInput.value.trim();
    if (!joinerName) {
        showToast('กรุณากรอกชื่อของคุณ');
        return;
    }
    const roomId = state.joiningRoomData.id;
    state.currentRoomId = roomId;
    if (state.roomListListener) db.ref('rooms').off('value', state.roomListListener);
    const roomRef = db.ref(`rooms/${roomId}`);
    roomRef.transaction(currentRoomData => {
        if (currentRoomData) {
            if (currentRoomData.gameState !== 'waiting') return;
            let availableSlotId = null;
            for (const playerId in currentRoomData.players) {
                if (!currentRoomData.players[playerId].connected) {
                    availableSlotId = playerId;
                    break;
                }
            }
            if (availableSlotId) {
                state.currentPlayerId = availableSlotId;
                currentRoomData.players[availableSlotId].connected = true;
                currentRoomData.players[availableSlotId].name = joinerName;
                currentRoomData.playerCount = (currentRoomData.playerCount || 0) + 1;
            } else {
                return;
            }
        }
        return currentRoomData;
    }, (error, committed) => {
        if (error) {
            showToast("เกิดข้อผิดพลาด: " + error.message);
            showScreen('lobby');
        } else if (!committed) {
            showToast("ไม่สามารถเข้าร่วมห้องได้ อาจจะเต็มหรือเริ่มเกมไปแล้ว");
            showScreen('lobby');
        } else {
            showToast(`เข้าร่วมห้องสำเร็จ!`);
            listenToRoomUpdates();
            showScreen('waiting');
        }
    });
}
