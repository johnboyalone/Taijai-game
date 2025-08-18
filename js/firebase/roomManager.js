import { firebase } from './config.js';
import { state } from '../state.js';
import { showToast, showScreen } from '../ui/core.js';
import { ui } from '../ui/elements.js';
import { listenToRoomUpdates } from './gameState.js';

const db = firebase.database();

/**
 * สร้างห้องใหม่และบันทึกข้อมูลลง Firebase
 */
export function createRoom() {
    const hostName = ui.hostNameInput.value.trim();
    const roomName = ui.newRoomNameInput.value.trim();
    const password = ui.newRoomPasswordInput.value;

    // ตรวจสอบข้อมูลพื้นฐาน
    if (!hostName || !roomName || !/^\d{4}$/.test(password)) {
        showToast('กรุณากรอกข้อมูลให้ครบ (รหัสผ่าน 4 ตัวเลข)');
        return;
    }

    // ตรวจสอบว่าเลือกโหมดหรือยัง (สำคัญมาก)
    if (!state.selectedGameMode) {
        showToast('กรุณาเลือกโหมดการเล่นก่อนครับ');
        return;
    }

    const newRoomId = db.ref('rooms').push().key;
    state.currentPlayerId = 'player1';
    state.currentRoomId = newRoomId;

    const roomData = {
        roomName,
        hostName,
        password,
        gameMode: state.selectedGameMode, // <-- เพิ่มข้อมูลโหมดที่เลือกเข้ามา
        players: {
            'player1': { id: 'player1', name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3, status: 'playing', score: 0 },
            'player2': { id: 'player2', name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing', score: 0 },
            'player3': { id: 'player3', name: 'ผู้เล่น 3', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing', score: 0 },
            'player4': { id: 'player4', name: 'ผู้เล่น 4', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing', score: 0 }
        },
        playerCount: 1,
        gameState: 'waiting',
        turn: null, // จะถูกกำหนดเมื่อเกมเริ่ม
        turnOrder: [],
        rematch: {},
        lastAction: null,
        currentCard: null // เตรียม field สำหรับการ์ดในอนาคต
    };

    db.ref('rooms/' + newRoomId).set(roomData).then(() => {
        showToast(`สร้างห้อง "${roomName}" สำเร็จ!`);
        listenToRoomUpdates();
        showScreen('waiting');
    }).catch(error => showToast('เกิดข้อผิดพลาด: ' + error.message));
}

/**
 * โหลดและแสดงรายการห้องที่กำลังรอผู้เล่น
 */
export function loadAndDisplayRooms() {
    const roomsRef = db.ref('rooms').orderByChild('gameState').equalTo('waiting');
    if (state.roomListListener) {
        roomsRef.off('value', state.roomListListener);
    }

    state.roomListListener = roomsRef.on('value', snapshot => {
        ui.roomListContent.innerHTML = '';
        if (!snapshot.exists()) {
            ui.roomListContent.innerHTML = '<p class="no-rooms-message">ยังไม่มีห้องว่างในขณะนี้...</p>';
            return;
        }
        snapshot.forEach(childSnapshot => {
            const roomData = childSnapshot.val();
            if (!roomData.players) return;

            const playerCount = roomData.playerCount || Object.values(roomData.players).filter(p => p.connected).length;

            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            // เพิ่มการแสดงโหมดของห้อง
            const modeText = roomData.gameMode === 'arcade' ? 'มันส์โคตร' : 'ธรรมดา';
            roomItem.innerHTML = `
                <div class="room-info">
                    <div class="room-name">${roomData.roomName}</div>
                    <div class="host-name">สร้างโดย: ${roomData.hostName} | โหมด: ${modeText}</div>
                </div>
                <div class="room-status">${playerCount} / 4</div>
            `;

            roomItem.addEventListener('click', () => {
                // playSound(sounds.click); // ควร import playSound และ sounds ถ้าจะใช้
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

/**
 * จัดการการยืนยันรหัสผ่านเพื่อเข้าร่วมห้อง
 */
export function handlePasswordSubmit() {
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

/**
 * เข้าร่วมห้องหลังจากกรอกชื่อ
 */
export function joinRoom() {
    const joinerName = ui.joinerNameInput.value.trim();
    if (!joinerName) {
        showToast('กรุณากรอกชื่อของคุณ');
        return;
    }

    const roomId = state.joiningRoomData.id;
    state.currentRoomId = roomId;
    if (state.roomListListener) {
        db.ref('rooms').off('value', state.roomListListener);
    }

    const roomRef = db.ref(`rooms/${roomId}`);

    roomRef.transaction(currentRoomData => {
        if (currentRoomData) {
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
                currentRoomData.playerCount++;
            } else {
                // ไม่มีที่ว่าง, ยกเลิก transaction
                return;
            }
        }
        return currentRoomData;
    }, (error, committed, snapshot) => {
        if (error) {
            showToast("เกิดข้อผิดพลาด: " + error.message);
            showScreen('lobby');
        } else if (!committed) {
            showToast("ไม่สามารถเข้าร่วมห้องได้ อาจจะเต็มแล้ว");
            showScreen('lobby');
        } else {
            showToast(`เข้าร่วมห้องสำเร็จ!`);
            listenToRoomUpdates();
            showScreen('waiting');
        }
    });
}
