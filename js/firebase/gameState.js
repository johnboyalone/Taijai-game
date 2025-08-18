import { db, firebase } from './config.js';
import { state, constants } from '../state.js';
import { ui, screens } from '../ui/elements.js';
import { showScreen, showToast, showActionToast, updateWaitingRoomUI, displayGameOver, updateGameOverUI } from '../ui/core.js';
import { createNumberPad } from '../ui/eventListeners.js';
import { updateScoreboard, updateCardDisplay, updateHistoryLog, updateChances, updateTurnIndicator, updateGuessControls } from '../ui/gameScreen.js';
import { drawNewCard } from '../cards.js';
import { debugLog } from '../main.js';

function generateRandomNumber() {
    let result = [];
    for (let i = 0; i < constants.GUESS_LENGTH; i++) {
        result.push(Math.floor(Math.random() * 10).toString());
    }
    return result.join('');
}

function initializeGameUI(roomData) {
    debugLog("GAME: Initializing Game UI.");
    showScreen('game');
    const myData = roomData.players[state.currentPlayerId];

    if (!myData.numberSet) {
        const ourNumber = generateRandomNumber();
        db.ref(`rooms/${state.currentRoomId}/players/${state.currentPlayerId}`).update({ number: ourNumber, numberSet: true });
        showToast('เกมเริ่ม! เลขลับของคุณถูกตั้งแล้ว');
    }
    createNumberPad();
    state.currentGuess = [];
}

function updatePlayingUI(roomData) {
    const myData = roomData.players[state.currentPlayerId];
    const currentTurnId = roomData.turn;
    state.currentTargetId = currentTurnId;

    if (myData.status === 'eliminated') {
        ui.spectatorOverlay.classList.add('show');
    } else {
        ui.spectatorOverlay.classList.remove('show');
    }

    const activePlayers = Object.values(roomData.players).filter(p => p.status === 'playing' && p.connected);
    if (activePlayers.length <= 1 && roomData.playerCount > 1 && roomData.gameState === 'playing') {
        let winnerId = null;
        let reason = 'ไม่มีผู้ชนะ';
        let finalScores = null;

        if (roomData.gameMode === 'arcade') {
            const allPlayers = Object.values(roomData.players).filter(p => p.connected);
            const sortedByScore = allPlayers.sort((a, b) => b.score - a.score);
            winnerId = sortedByScore[0].id;
            reason = `ทำคะแนนสูงสุด: ${sortedByScore[0].score} แต้ม!`;
            finalScores = allPlayers.map(p => ({ name: p.name, score: p.score }));
        } else { // Normal mode
            winnerId = activePlayers[0]?.id || null;
            reason = 'เป็นผู้รอดชีวิตคนสุดท้าย!';
        }

        db.ref(`rooms/${state.currentRoomId}`).update({
            gameState: 'finished',
            winner: winnerId,
            reason: reason,
            finalScores: finalScores
        });
        return;
    }

    updateTurnIndicator(roomData);
    updateHistoryLog(roomData);
    updateChances(myData.finalChances);
    handleTurnTimer(roomData);
    updateGuessControls(roomData);

    const arcadeElements = document.querySelectorAll('.arcade-only');
    if (roomData.gameMode === 'arcade') {
        arcadeElements.forEach(el => el.style.display = 'block');
        updateScoreboard(roomData);
        updateCardDisplay(roomData);
    } else {
        arcadeElements.forEach(el => el.style.display = 'none');
    }
}

function handleTurnTimer(roomData) {
    if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);

    const turnStartTime = roomData.turnStartTime || Date.now();
    const timePassed = (Date.now() - turnStartTime) / 1000;
    let timeLeft = Math.round(constants.TURN_DURATION - timePassed);

    state.turnTimerInterval = setInterval(() => {
        if (timeLeft >= 0) {
            ui.turnTimerDisplay.textContent = timeLeft;
        }
        if (timeLeft <= 0) {
            clearInterval(state.turnTimerInterval);
            db.ref(`rooms/${state.currentRoomId}/turn`).get().then(snapshot => {
                if (snapshot.val() === roomData.turn) {
                    skipTurn();
                }
            });
        }
        timeLeft--;
    }, 1000);
}

function skipTurn() {
    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing') {
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
            if (activePlayers.length === 0) return roomData;
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers[nextTurnIndex];
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            roomData.currentCard = roomData.gameMode === 'arcade' ? drawNewCard() : null;
            roomData.players[roomData.turn].guesses = {};
        }
        return roomData;
    });
}

function resetGameForRematch(roomData) {
    showToast("เริ่มเกมใหม่อีกครั้ง!");
    const updates = {};
    updates[`rooms/${state.currentRoomId}/gameState`] = 'setup';
    updates[`rooms/${state.currentRoomId}/turn`] = roomData.turnOrder[0];
    updates[`rooms/${state.currentRoomId}/winner`] = null;
    updates[`rooms/${state.currentRoomId}/reason`] = null;
    updates[`rooms/${state.currentRoomId}/rematch`] = {};
    updates[`rooms/${state.currentRoomId}/lastAction`] = null;
    updates[`rooms/${state.currentRoomId}/turnStartTime`] = firebase.database.ServerValue.TIMESTAMP;
    updates[`rooms/${state.currentRoomId}/currentCard`] = roomData.gameMode === 'arcade' ? drawNewCard() : null;
    updates[`rooms/${state.currentRoomId}/finalScores`] = null;

    Object.keys(roomData.players).forEach(playerId => {
        if (roomData.players[playerId].connected) {
            updates[`rooms/${state.currentRoomId}/players/${playerId}/numberSet`] = false;
            updates[`rooms/${state.currentRoomId}/players/${playerId}/finalChances`] = 3;
            updates[`rooms/${state.currentRoomId}/players/${playerId}/status`] = 'playing';
            updates[`rooms/${state.currentRoomId}/players/${playerId}/guesses`] = null;
            updates[`rooms/${state.currentRoomId}/players/${playerId}/score`] = 0;
        }
    });
    db.ref().update(updates);
}

export function listenToRoomUpdates() {
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
        state.roomData = roomData; // เก็บข้อมูลห้องล่าสุดไว้ใน state
        const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);

        if (roomData.rematch && Object.values(roomData.rematch).filter(v => v === true).length === connectedPlayers.length && connectedPlayers.length > 1) {
            resetGameForRematch(roomData);
            return;
        }

        if (roomData.lastAction && roomData.lastAction.timestamp > (Date.now() - 3000)) {
            const { actorName, targetName, type } = roomData.lastAction;
            let message = '';
            if (type === 'guess') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong>`;
            else if (type === 'final_correct') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ถูกต้อง!`;
            else if (type === 'final_wrong') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ผิด!`;
            showActionToast(message);
        }

        switch(roomData.gameState) {
            case 'waiting':
                updateWaitingRoomUI(roomData);
                break;
            case 'setup':
                if (!screens.game.classList.contains('show')) initializeGameUI(roomData);
                const allPlayersSetNumber = connectedPlayers.every(p => p.numberSet);
                if (allPlayersSetNumber) {
                    db.ref(`rooms/${state.currentRoomId}`).update({ gameState: 'playing' });
                }
                break;
            case 'playing':
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
