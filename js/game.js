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
    buttons.forEach(buttonValue => {
        const button = document.createElement('button');
        button.className = 'number-pad-btn';
        button.textContent = buttonValue;
        button.dataset.value = buttonValue;
        button.addEventListener('click', onPadClick);
        ui.numberPadContainer.appendChild(button);
    });
}

export function submitGuess(currentRoomId, currentPlayerId, currentGuess) {
    if (currentGuess.length !== GUESS_LENGTH) {
        showToast('กรุณากรอกตัวเลขให้ครบ 4 หลัก');
        return;
    }
    
    const roomRef = db.ref(`rooms/${currentRoomId}`);
    roomRef.transaction(roomData => {
        if (roomData) {
            const myData = roomData.players[currentPlayerId];
            if (myData) {
                const guessStr = currentGuess.join('');
                if (!myData.guesses) {
                    myData.guesses = {};
                }
                const newGuessKey = db.ref().push().key;
                myData.guesses[newGuessKey] = {
                    guess: guessStr,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
            }
        }
        return roomData;
    }).then(() => {
        skipTurn(currentRoomId, currentPlayerId);
    });
}

export function submitFinalAnswer(currentRoomId, currentPlayerId, currentGuess, targetPlayerId) {
    if (!targetPlayerId) {
        showToast('กรุณาเลือกเป้าหมายที่จะทาย');
        return;
    }
    if (currentGuess.length !== GUESS_LENGTH) {
        showToast('กรุณากรอกตัวเลขให้ครบ 4 หลัก');
        return;
    }
    
    const roomRef = db.ref(`rooms/${currentRoomId}`);
    roomRef.transaction(roomData => {
        if (roomData) {
            const myData = roomData.players[currentPlayerId];
            const targetData = roomData.players[targetPlayerId];
            if (!myData || !targetData) return;

            const guessStr = currentGuess.join('');
            const answerStr = targetData.number;
            
            if (guessStr === answerStr) {
                myData.status = 'playing';
                targetData.status = 'eliminated';
                roomData.lastAction = `${myData.name} ทายถูก! ${targetData.name} ถูกกำจัด!`;
            } else {
                myData.finalChances--;
                if (myData.finalChances <= 0) {
                    myData.status = 'eliminated';
                    roomData.lastAction = `${myData.name} ทายผิดและถูกกำจัด!`;
                } else {
                    const { strikes, balls } = calculateClues(currentGuess, answerStr.split(''));
                    roomData.lastAction = `${myData.name} ทาย ${targetData.name} ได้ ${strikes} Strikes, ${balls} Balls`;
                }
            }
        }
        return roomData;
    }).then(() => {
        skipTurn(currentRoomId, currentPlayerId);
    });
}

export function skipTurn(currentRoomId, currentPlayerId) {
    const roomRef = db.ref(`rooms/${currentRoomId}`);
    roomRef.transaction(roomData => {
        if (roomData && roomData.turn === currentPlayerId) {
            const activePlayers = roomData.turnOrder.filter(pId => roomData.players[pId].status === 'playing');
            if (activePlayers.length > 0) {
                const currentTurnIndex = activePlayers.indexOf(currentPlayerId);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            } else {
                // No active players left, handle game over
                roomData.gameState = 'finished';
            }
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