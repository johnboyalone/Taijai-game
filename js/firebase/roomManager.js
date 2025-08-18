// js/firebase/roomManager.js
import { db } from './config.js';
import { listenToRoomUpdates } from './gameState.js';
import { state } from '../state.js';
import { ui } from '../ui/elements.js';
import { showScreen, showToast } from '../ui/core.js';
import { playSound, sounds } from '../audio.js';

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
        turn: null, turnOrder: [], rematch: {}, lastAction: null
    };

    db.ref('rooms/' + newRoomId).set(roomData).then(() => {
        showToast(`สร้างห้อง "${roomName}" สำเร็จ!`);
        listenToRoomUpdates();
        showScreen('waiting');
    }).catch(error => showToast('เกิดข้อผิดพลาด: ' + error.message));
}

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
            if (playerCount === 0) { // Clean up empty rooms
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
                ui.passwordModalRoomName.textContent = `ห้อง: ${roomData.currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === state.currentPlayerId) {
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing' && roomData.players[id].connected);
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers.length > 0
