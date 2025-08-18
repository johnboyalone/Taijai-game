// js/firebase/gameState.js (เวอร์ชันแก้ไข)
// 🔥 1. Import db และ serverValue
import { db, serverValue } from './config.js'; 
import { state } from '../state.js';
import { screens } from '../ui/elements.js';
import { showScreen, showToast, showActionToast, updateWaitingRoomUI, displayGameOver, updateGameOverUI } from '../ui/core.js';
import { updatePlayingUI } from '../ui/gameScreen.js';
import { createNumberPad } from '../ui/eventListeners.js';
import { initializePlayerForGame } from './gameActions.js';

function resetGameForRematch(roomData) {
    showToast("เริ่มเกมใหม่อีกครั้ง!");
    const updates = {};
    const roomId = state.currentRoomId;
    updates[`/rooms/${roomId}/gameState`] = 'setup';
    updates[`/rooms/${roomId}/turn`] = roomData.turnOrder[0];
    updates[`/rooms/${roomId}/winner`] = null;
    updates[`/rooms/${roomId}/reason`] = null;
    updates[`/rooms/${roomId}/rematch`] = {};
    updates[`/rooms/${roomId}/lastAction`] = null;
    updates[`/rooms/${roomId}/turnStartTime`] = serverValue.TIMESTAMP; // 🔥 2. แก้ไข

    Object.keys(roomData.players).forEach(playerId => {
        if (roomData.players[playerId].connected) {
            updates[`/rooms/${roomId}/players/${playerId}/numberSet`] = false;
            updates[`/rooms/${roomId}/players/${playerId}/finalChances`] = 3;
            updates[`/rooms/${roomId}/players/${playerId}/status`] = 'playing';
            updates[`/rooms/${roomId}/players/${playerId}/guesses`] = null;
        }
    });
    db.ref().update(updates);
}

export function listenToRoomUpdates() {
    // ... (ส่วนต้นของฟังก์ชันเหมือนเดิม) ...
    const roomRef = db.ref('rooms/' + state.currentRoomId);
    if (state.roomListener) roomRef.off('value', state.roomListener);

    state.roomListener = roomRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);
            showToast("ห้องถูกปิดแล้ว กลับสู่หน้าหลัก");
            setTimeout(() => window.location.reload(), 3000);
            return;
        }
        const roomData = snapshot.val();
        const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);

        if (roomData.gameState === 'finished' && roomData.rematch && Object.values(roomData.rematch).filter(v => v === true).length === connectedPlayers.length && connectedPlayers.length > 1) {
            resetGameForRematch(roomData);
            return;
        }

        if (roomData.lastAction && roomData.lastAction.timestamp > (Date.now() - 3500)) {
            const { actorName, targetName, type } = roomData.lastAction;
            let message = '';
            if (type === 'guess') message = `<strong>${actorName}</strong> กำลังทายเลขของ <strong>${targetName}</strong>`;
            else if (type === 'final_correct') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ถูกต้อง!`;
            else if (type === 'final_wrong') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ผิด!`;
            if(message) showActionToast(message);
        }

        switch(roomData.gameState) {
            case 'waiting':
                updateWaitingRoomUI(roomData);
                break;
            case 'setup':
                if (!screens.game.classList.contains('show')) {
                    showScreen('game');
                    createNumberPad();
                    showToast('เกมเริ่มแล้ว! กรุณารอผู้เล่นคนอื่น', 3000);
                }
                if (!roomData.players[state.currentPlayerId].numberSet) {
                    initializePlayerForGame(roomData);
                }
                const allPlayersSetNumber = connectedPlayers.every(p => p.numberSet);
                if (allPlayersSetNumber && connectedPlayers.length > 1) {
                    db.ref(`rooms/${state.currentRoomId}`).update({
                        gameState: 'playing',
                        turnStartTime: serverValue.TIMESTAMP // 🔥 3. แก้ไข
                    });
                }
                break;
            case 'playing':
                const activePlayers = Object.values(roomData.players).filter(p => p.status === 'playing' && p.connected);
                if (activePlayers.length <= 1 && connectedPlayers.length > 1) {
                    db.ref(`rooms/${state.currentRoomId}`).update({
                        gameState: 'finished',
                        winner: activePlayers[0]?.id || null,
                        reason: 'เป็นผู้รอดชีวิตคนสุดท้าย!'
                    });
                    return;
                }
                updatePlayingUI(roomData);
                break;
            case 'finished':
                if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);
                if (!screens.gameOver.classList.contains('show')) displayGameOver(roomData);
                updateGameOverUI(roomData);
                break;
        }
    });
}
