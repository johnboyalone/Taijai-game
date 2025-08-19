import { db } from './firebase.js';
import { ui, showToast, updateGuessDisplay } from './ui.js';

export const GUESS_LENGTH = 4;
export const TURN_DURATION = 20;

export function generateRandomNumber() {
    let result = [];
    for (let i = 0; i < GUESS_LENGTH; i++) {
        result.push(Math.floor(Math.random() * 10).toString());
    }
    return result;
}

export function calculateClues(guess, answer) {
    let strikes = 0, balls = 0;
    const answerCopy = [...answer];
    const guessCopy = [...guess];
    for (let i = guessCopy.length - 1; i >= 0; i--) {
        if (guessCopy[i] === answerCopy[i]) {
            strikes++;
            guessCopy.splice(i, 1);
            answerCopy.splice(i, 1);
        }
    }
    for (let i = 0; i < guessCopy.length; i++) {
        const foundIndex = answerCopy.indexOf(guessCopy[i]);
        if (foundIndex !== -1) {
            balls++;
            answerCopy.splice(foundIndex, 1);
        }
    }
    return { strikes, balls };
}

export function createNumberPad(onPadClick) {
    ui.numberPadContainer.innerHTML = '';
    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ลบ', '0', 'ทาย'];
    buttons.forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = val;
        if (val === 'ลบ' || val === 'ทาย') cell.classList.add('special');
        cell.addEventListener('click', () => onPadClick(val));
        ui.numberPadContainer.appendChild(cell);
    });
}

export function submitGuess(currentRoomId, currentPlayerId, currentTargetId, currentGuess) {
    const guessString = currentGuess.join('');
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === currentPlayerId) {
            const opponentNumber = roomData.players[currentTargetId].number;
            const clues = calculateClues(currentGuess, opponentNumber.split(''));
            const guessData = { guess: guessString, strikes: clues.strikes, balls: clues.balls, by: currentPlayerId };
            if (!roomData.players[currentTargetId].guesses) {
                roomData.players[currentTargetId].guesses = {};
            }
            const newGuessKey = db.ref(`rooms/${currentRoomId}/players/${currentTargetId}/guesses`).push().key;
            roomData.players[currentTargetId].guesses[newGuessKey] = guessData;
            
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers[nextTurnIndex];
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            roomData.lastAction = { actorName: roomData.players[currentPlayerId].name, targetName: roomData.players[currentTargetId].name, type: 'guess', timestamp: Date.now() };
        }
        return roomData;
    });
}

export function submitFinalAnswer(currentRoomId, currentPlayerId, currentTargetId, currentGuess, playSound, wrongSound) {
    const finalAnswer = currentGuess.join('');
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === currentPlayerId) {
            const targetPlayer = roomData.players[currentTargetId];
            const actorPlayer = roomData.players[currentPlayerId];
            let actionType = '';
            if (finalAnswer === targetPlayer.number) {
                targetPlayer.status = 'eliminated';
                actionType = 'final_correct';
            } else {
                playSound(wrongSound);
                actorPlayer.finalChances--;
                if (actorPlayer.finalChances <= 0) actorPlayer.status = 'eliminated';
                actionType = 'final_wrong';
            }
            roomData.lastAction = { actorName: actorPlayer.name, targetName: targetPlayer.name, type: actionType, timestamp: Date.now() };
            
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers[nextTurnIndex];
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
        }
        return roomData;
    });
}

export function skipTurn(currentRoomId, currentPlayerId) {
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === currentPlayerId) {
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers[nextTurnIndex];
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
        }
        return roomData;
    });
}

export function requestRematch(currentRoomId, currentPlayerId) {
    db.ref(`rooms/${currentRoomId}/rematch/${currentPlayerId}`).set(true);
}

export function resetGameForRematch(currentRoomId, roomData) {
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
            updates[`rooms/${currentRoomId}/players/${playerId}/number`] = null;
        }
    });
    db.ref().update(updates);
}
