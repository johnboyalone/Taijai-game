// js/firebase/gameActions.js
import { db } from './config.js';
import { state, constants } from '../state.js';
import { ui } from '../ui/elements.js';
import { showToast, showActionToast } from '../ui/core.js';
import { updateGuessDisplay } from '../ui/gameScreen.js';
import { playSound, sounds } from '../audio.js';

// --- Helper Functions ---
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

// --- Game Actions ---
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
            const opponentNumber = roomData.players[state.currentTargetId].number;
            const clues = calculateClues(state.currentGuess, opponentNumber.split(''));
            const guessData = { guess: guessString, strikes: clues.strikes, balls: clues.balls, by: state.currentPlayerId };
            const historyPath = `players/${state.currentTargetId}/guesses`;
            if (!roomData.players[state.currentTargetId].guesses) {
                roomData.players[state.currentTargetId].guesses = {};
            }
            const newGuessKey = db.ref().child(historyPath).push().key;
            roomData.players[state.currentTargetId].guesses[newGuessKey] = guessData;
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing' && roomData.players[id].connected);
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers.length > 0 ? activePlayers[nextTurnIndex] : null;
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            roomData.lastAction = { actorName: roomData.players[state.currentPlayerId].name, targetName: roomData.players[state.currentTargetId].name, type: 'guess', timestamp: Date.now() };
        }
        return roomData;
    }).then(() => {
        state.currentGuess = [];
        updateGuessDisplay();
    });
}

export function submitFinalAnswer() {
    if (ui.turnIndicator.classList.contains('their-turn')) { showToast("ไม่สามารถส่งคำตอบในตาของเพื่อนได้!"); return; }
    if (!state.currentTargetId) { showToast("กรุณาเลือกเป้าหมายที่จะส่งคำตอบสุดท้าย"); return; }
    if (state.currentGuess.length !== constants.GUESS_LENGTH) { showToast(`กรุณาใส่เลขคำตอบให้ครบ ${constants.GUESS_LENGTH} ตัว`); return; }

    const finalAnswer = state.currentGuess.join('');
    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === state.currentPlayerId) {
            const targetPlayer = roomData.players[state.currentTargetId];
            const actorPlayer = roomData.players[state.currentPlayerId];
            let actionType = '';
            if (finalAnswer === targetPlayer.number) {
                targetPlayer.status = 'eliminated';
                actionType = 'final_correct';
            } else {
                actorPlayer.finalChances--;
                if (actorPlayer.finalChances <= 0) {
                    actorPlayer.status = 'eliminated';
                }
                actionType = 'final_wrong';
            }
            roomData.lastAction = { actorName: actorPlayer.name, targetName: targetPlayer.name, type: actionType, timestamp: Date.now() };
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing' && roomData.players[id].connected);
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers.length > 0 ? activePlayers[nextTurnIndex] : null;
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
        }
        return roomData;
    }).then((result) => {
        if(result.committed) {
            const roomData = result.snapshot.val();
            const myData = roomData.players[state.currentPlayerId];
            const chancesBefore = myData.finalChances + 1;
            if (myData.finalChances < chancesBefore && myData.status === 'playing') {
                 playSound(sounds.wrong);
            }
        }
        state.currentGuess = [];
        updateGuessDisplay();
    });
}

export function skipTurn() {
    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'playing' && roomData.turn === state.currentPlayerId) {
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing' && roomData.players[id].connected);
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers.length > 0 ? activePlayers[nextTurnIndex] : null;
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
        }
        return roomData;
    });
}

export function requestRematch() {
    ui.rematchBtn.disabled = true;
    ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
    db.ref(`rooms/${state.currentRoomId}/rematch/${state.currentPlayerId}`).set(true);
}
