// js/firebase.js
import { showScreen, showToast, updateWaitingRoomUI, ui } from './ui.js';

let currentRoomId = null;
let joiningRoomData = null; 
let currentPlayerId = null;
let roomListener = null;
let roomListListener = null;
let callbacks = {};

const firebaseConfig = {
    apiKey: "AIzaSyAAeQyoxlwHv8Qe9yrsoxw0U5SFHTGzk8o",
    authDomain: "taijai.firebaseapp.com",
    databaseURL: "https://taijai-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "taijai",
    storageBucket: "taijai.appspot.com",
    messagingSenderId: "262573756581",
    appId: "1:262573756581:web:c17bfc795b5cf139693d4c"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

export function setCallbacks(c) {
    callbacks = c;
}

export function createRoom() {
    const hostName = ui.hostNameInput.value.trim();
    const roomName = ui.newRoomNameInput.value.trim();
    const password = ui.newRoomPasswordInput.value;

    if (!hostName || !roomName || !/^\d{4}$/.test(password)) {
        showToast('กรุณากรอกข้อมูลให้ครบ (รหัสผ่าน 4 ตัวเลข)');
        return;
    }

    const newRoomRef = db.ref('rooms').push();
    currentRoomId = newRoomRef.key;
    currentPlayerId = 'player1';

    const roomData = {
        roomName, hostName, password,
        players: {
            'player1': { id: 'player1', name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3, status: 'playing' },
            'player2': { id: 'player2', name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
            'player3': { id: 'player3', name: 'ผู้เล่น 3', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
            'player4': { id: 'player4', name: 'ผู้เล่น 4', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' }
        },
        playerCount: 1,
        gameState: 'waiting',
        turn: null, 
        turnOrder: [],
        rematch: {},
        lastAction: null,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    newRoomRef.set(roomData).then(() => {
        localStorage.setItem('currentRoomId', currentRoomId);
        localStorage.setItem('currentPlayerId', currentPlayerId);
        showToast(`สร้างห้อง "${roomName}" สำเร็จ!`);
        listenToRoomUpdates();
        showScreen('waiting');
    }).catch(error => showToast('เกิดข้อผิดพลาด: ' + error.message));
}

export function loadAndDisplayRooms() {
    const roomsRef = db.ref('rooms').orderByChild('gameState').equalTo('waiting');
    if (roomListListener) roomsRef.off('value', roomListListener);

    roomListListener = roomsRef.on('value', snapshot => {
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
            roomItem.innerHTML = `<div class="room-info"><div class="room-name">${roomData.roomName}</div><div class="host-name">สร้างโดย: ${roomData.hostName}</div></div><div class="room-status">${playerCount} / 4</div>`;

            roomItem.addEventListener('click', () => {
                callbacks.playSound(callbacks.sounds.click);
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

export function handlePasswordSubmit() {
    const roomId = ui.passwordModal.dataset.roomId;
    const roomName = ui.passwordModal.dataset.roomName;
    const enteredPassword = ui.passwordModalInput.value;
    db.ref(`rooms/${roomId}/password`).get().then(snapshot => {
        if (snapshot.val() === enteredPassword) {
            ui.passwordModalInput.value = '';
            ui.passwordModal.classList.remove('show');

            joiningRoomData = { id: roomId, name: roomName };
            ui.joinerRoomNameDisplay.textContent = roomName;
            showScreen('joinerSetup');
        } else {
            showToast('รหัสผ่านไม่ถูกต้อง!');
        }
    });
}

export function joinRoom() {
    const joinerName = ui.joinerNameInput.value.trim();
    if (!joinerName) {
        showToast('กรุณากรอกชื่อของคุณ');
        return;
    }

    const roomId = joiningRoomData.id;
    currentRoomId = roomId;
    if (roomListListener) db.ref('rooms').off('value', roomListListener);

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
                currentPlayerId = availableSlotId;
                currentRoomData.players[availableSlotId].connected = true;
                currentRoomData.players[availableSlotId].name = joinerName;
                currentRoomData.playerCount++;
                return currentRoomData;
            } else {
                return; // ห้องเต็มแล้ว, ไม่ทำอะไร
            }
        }
        return; // ห้องไม่มีอยู่แล้ว, ไม่ทำอะไร
    }, (error, committed, snapshot) => {
        if (error) {
            showToast("เกิดข้อผิดพลาด: " + error.message);
            showScreen('lobby');
        } else if (!committed) {
            showToast("ไม่สามารถเข้าร่วมห้องได้ อาจจะเต็มแล้ว");
            showScreen('lobby');
        } else {
            localStorage.setItem('currentRoomId', currentRoomId);
            localStorage.setItem('currentPlayerId', currentPlayerId);
            showToast(`เข้าร่วมห้องสำเร็จ!`);
            listenToRoomUpdates();
            showScreen('waiting');
        }
    });
}

export function listenToRoomUpdates() {
    currentPlayerId = localStorage.getItem('currentPlayerId');
    currentRoomId = localStorage.getItem('currentRoomId');
    if (!currentRoomId || !currentPlayerId) {
        showScreen('lobby');
        return;
    }

    const roomRef = db.ref('rooms/' + currentRoomId);
    if (roomListener) roomRef.off('value', roomListener);

    roomListener = roomRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            if (callbacks.turnTimerInterval) clearInterval(callbacks.turnTimerInterval);
            showToast("ห้องถูกปิดแล้ว กลับสู่หน้าหลัก");
            setTimeout(() => window.location.reload(), 3000);
            return;
        }
        const roomData = snapshot.val();
        const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);

        if (roomData.rematch && Object.values(roomData.rematch).filter(v => v === true).length === connectedPlayers.length && connectedPlayers.length > 1) {
            resetGameForRematch(roomData);
            return;
        }

        if (roomData.lastAction && roomData.lastAction.timestamp > (Date.now() - 3000)) {
            const { actorName, targetName, type } = roomData.lastAction;
            let message = '';
            if (type === 'guess') message = `<strong>${actorName}</strong> กำลังทายเลขของ <strong>${targetName}</strong>`;
            else if (type === 'final_correct') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ถูกต้อง!`;
            else if (type === 'final_wrong') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ผิด!`;
            callbacks.showActionToast(message);
        }

        switch(roomData.gameState) {
            case 'waiting':
                updateWaitingRoomUI(roomData);
                break;
            case 'setup':
                if (!ui.screens.game.classList.contains('show')) callbacks.initializeGameUI(roomData, currentRoomId, currentPlayerId, callbacks);
                const allPlayersSetNumber = connectedPlayers.every(p => p.numberSet);
                if (allPlayersSetNumber) {
                    db.ref(`rooms/${currentRoomId}`).update({ 
                        gameState: 'playing',
                        turnStartTime: firebase.database.ServerValue.TIMESTAMP
                    });
                }
                break;
            case 'playing':
                callbacks.updatePlayingUI(roomData, currentRoomId, currentPlayerId);
                break;
            case 'finished':
                if (callbacks.turnTimerInterval) clearInterval(callbacks.turnTimerInterval);
                if (!ui.screens.gameOver.classList.contains('show')) callbacks.displayGameOver(roomData, currentRoomId, currentPlayerId);
                callbacks.updateGameOverUI(roomData, currentPlayerId);
                break;
        }
    });
}

export function startGame() {
    const gameRef = db.ref(`rooms/${currentRoomId}`);
    gameRef.get().then(snapshot => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            if (roomData.gameState === 'waiting') {
                const connectedPlayerIds = Object.values(roomData.players).filter(p => p.connected).map(p => p.id);
                const updates = {
                    gameState: 'setup',
                    turnOrder: connectedPlayerIds,
                    turn: connectedPlayerIds[0],
                    turnStartTime: firebase.database.ServerValue.TIMESTAMP,
                    lastAction: null
                };
                gameRef.update(updates);
            }
        }
    });
}

export function requestRematch() {
    ui.rematchBtn.disabled = true;
    ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
    db.ref(`rooms/${currentRoomId}/rematch/${currentPlayerId}`).set(true);
}

export function resetGameForRematch(roomData) {
    showToast("เริ่มเกมใหม่อีกครั้ง!");
    const updates = {};
    updates[`rooms/${currentRoomId}/gameState`] = 'setup';
    updates[`rooms/${currentRoomId}/turn`] = roomData.turnOrder[0];
    updates[`rooms/${currentRoomId}/winner`] = null;
    updates[`rooms/${currentRoomId}/reason`] = null;
    updates[`rooms/${currentRoomId}/rematch`] = {};
    updates[`rooms/${currentRoomId}/lastAction`] = null;
    updates[`rooms/${currentRoomId}/turnStartTime`] = firebase.database.ServerValue.TIMESTAMP;

    Object.keys(roomData.players).forEach(playerId => {
        if (roomData.players[playerId].connected) {
            updates[`rooms/${currentRoomId}/players/${playerId}/numberSet`] = false;
            updates[`rooms/${currentRoomId}/players/${playerId}/finalChances`] = 3;
            updates[`rooms/${currentRoomId}/players/${playerId}/status`] = 'playing';
            updates[`rooms/${currentRoomId}/players/${playerId}/guesses`] = null;
        }
    });
    db.ref().update(updates);
}

export function onDisconnect() {
    if (currentRoomId && currentPlayerId) {
        const playerRef = db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`);
        playerRef.update({ connected: false });
        db.ref(`rooms/${currentRoomId}`).get().then(snapshot => {
            const roomData = snapshot.val();
            if (roomData && Object.values(roomData.players).filter(p => p.connected).length <= 1) {
                db.ref(`rooms/${currentRoomId}`).remove();
            }
        });
    }
}