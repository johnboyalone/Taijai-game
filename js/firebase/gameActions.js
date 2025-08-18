// js/firebase/gameActions.js (เวอร์ชันแก้ไข)
// 🔥 1. Import db และ serverValue
import { db, serverValue } from './config.js'; 
import { state, constants } from '../state.js';
import { ui } from '../ui/elements.js';
import { showToast } from '../ui/core.js';
import { updateGuessDisplay } from '../ui/gameScreen.js';
import { playSound, sounds } from '../audio.js';

// ... (ฟังก์ชัน generateRandomNumber, calculateClues, initializePlayerForGame เหมือนเดิม) ...
function generateRandomNumber() {
    let result = [];
    for (let i = 0; i < constants.GUESS_LENGTH; i++) {
        result.push(Math.floor(Math.random() * 10).toString());
    }
    return result;
}
function calculateClues(guess, answer) {
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
export function initializePlayerForGame(roomData) {
    const ourNumber = generateRandomNumber();
    ui.ourNumberDisplay.innerHTML = '';
    for (let i = 0; i < constants.GUESS_LENGTH; i++) {
        ui.ourNumberDisplay.innerHTML += `<div class="number-input">${ourNumber[i]}</div>`;
    }
    state.currentGuess = [];
    const firstTarget = roomData.turnOrder.find(id => id !== state.currentPlayerId);
    state.currentTargetId = firstTarget;
    db.ref(`rooms/${state.currentRoomId}/players/${state.currentPlayerId}`).update({ number: ourNumber.join(''), numberSet: true });
}


export function submitGuess() {
    const guessString = state.currentGuess.join('');
    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === state.currentPlayerId) {
            // ...
            roomData.turnStartTime = serverValue.TIMESTAMP; // 🔥 2. แก้ไข
            // ...
        }
        return roomData;
    }).then(() => {
        state.currentGuess = [];
        updateGuessDisplay();
    });
}

export function submitFinalAnswer() {
    // ...
    const finalAnswer = state.currentGuess.join('');
    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === state.currentPlayerId) {
            // ...
            roomData.turnStartTime = serverValue.TIMESTAMP; // 🔥 3. แก้ไข
            // ...
        }
        return roomData;
    }).then((result) => {
        // ...
    });
}

export function skipTurn() {
    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === state.currentPlayerId) {
            // ...
            roomData.turnStartTime = serverValue.TIMESTAMP; // 🔥 4. แก้ไข
        }
        return roomData;
    });
}

export function requestRematch() {
    ui.rematchBtn.disabled = true;
    ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
    db.ref(`rooms/${state.currentRoomId}/rematch/${state.currentPlayerId}`).set(true);
}
