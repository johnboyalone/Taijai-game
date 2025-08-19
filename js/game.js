// js/game.js
import { ui } from './ui.js';

let currentGuess = [];
let currentTargetId = null;
let turnTimerInterval = null;
let callbacks = {};

const GUESS_LENGTH = 4;
const TURN_DURATION = 20;

export function setCallbacks(c) {
    callbacks = c;
}

export function setCurrentTargetId(id) {
    currentTargetId = id;
}

export function initializeGameUI(roomData, currentRoomId, currentPlayerId, mainCallbacks) {
    callbacks = { ...callbacks, ...mainCallbacks }; // Merge callbacks
    callbacks.showScreen('game');
    const ourNumber = generateRandomNumber();
    ui.ourNumberDisplay.innerHTML = '';
    for (let i = 0; i < GUESS_LENGTH; i++) {
        ui.ourNumberDisplay.innerHTML += `<div class="number-input">${ourNumber[i]}</div>`;
    }
    createNumberPad(currentPlayerId);
    currentGuess = [];
    const firstTarget = roomData.turnOrder.find(id => id !== currentPlayerId);
    currentTargetId = firstTarget;
    db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ number: ourNumber.join(''), numberSet: true });
    callbacks.showToast('เกมเริ่ม! กรุณาตั้งเลขของคุณ');
}

export function updatePlayingUI(roomData, currentRoomId, currentPlayerId) {
    const myData = roomData.players[currentPlayerId];
    if (myData.status === 'eliminated') {
        ui.spectatorOverlay.classList.add('show');
        ui.spectatorMessage.textContent = `คุณแพ้แล้ว! กำลังรับชม...`;
    } else {
        ui.spectatorOverlay.classList.remove('show');
    }
    const activePlayers = Object.values(roomData.players).filter(p => p.status === 'playing' && p.connected);
    if (activePlayers.length <= 1 && roomData.playerCount > 1 && roomData.gameState === 'playing') {
        db.ref(`rooms/${currentRoomId}`).update({
            gameState: 'finished',
            winner: activePlayers[0]?.id || null,
            reason: 'เป็นผู้รอดชีวิตคนสุดท้าย!'
        });
        return;
    }
    callbacks.updateTurnIndicator(roomData, currentPlayerId, callbacks);
    updatePlayerSummaryGrid(roomData, currentPlayerId, currentTargetId);
    updateHistoryLog(roomData);
    callbacks.updateChances(myData.finalChances);
    handleTurnTimer(roomData, currentRoomId, currentPlayerId);
}

function updatePlayerSummaryGrid(roomData, currentPlayerId, currentTargetId) {
    ui.playerSummaryGrid.innerHTML = '';
    const opponents = roomData.turnOrder.filter(id => id !== currentPlayerId);
    opponents.forEach(opponentId => {
        const opponentData = roomData.players[opponentId];
        const card = document.createElement('div');
        card.className = 'player-summary-card';
        card.dataset.playerId = opponentId;
        if (opponentData.status === 'eliminated') card.classList.add('is-eliminated');
        if (opponentId === currentTargetId) card.classList.add('is-target');
        card.innerHTML = `<div class="summary-card-name">${opponentData.name}</div><div class="summary-card-status">${opponentData.status === 'eliminated' ? 'แพ้แล้ว' : 'กำลังเล่น'}</div>`;
        if (opponentData.status !== 'eliminated') {
            card.addEventListener('click', () => {
                callbacks.playSound(callbacks.sounds.click);
                currentTargetId = opponentId;
                updatePlayerSummaryGrid(roomData, currentPlayerId, currentTargetId);
                updateHistoryLog(roomData);
            });
        }
        ui.playerSummaryGrid.appendChild(card);
    });
}

function updateHistoryLog(roomData) {
    callbacks.updateHistoryLog(roomData, currentTargetId);
}

function generateRandomNumber() {
    let result = [];
    for (let i = 0; i < GUESS_LENGTH; i++) {
        result.push(Math.floor(Math.random() * 10).toString());
    }
    return result;
}

function createNumberPad(currentPlayerId) {
    ui.numberPadContainer.innerHTML = '';
    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ลบ', '0', 'ทาย'];
    buttons.forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = val;
        if (val === 'ลบ' || val === 'ทาย') cell.classList.add('special');
        cell.addEventListener('click', () => handleNumberPadClick(val, currentPlayerId));
        ui.numberPadContainer.appendChild(cell);
    });
}

function handleNumberPadClick(value, currentPlayerId) {
    callbacks.playSound(callbacks.sounds.click);
    if (ui.turnIndicator.classList.contains('their-turn')) {
        callbacks.showToast("ยังไม่ถึงตาของคุณ!");
        return;
    }
    if (value === 'ลบ') {
        if (currentGuess.length > 0) currentGuess.pop();
    } else if (value === 'ทาย') {
        if (!currentTargetId) { callbacks.showToast("กรุณาเลือกเป้าหมายที่จะทายก่อน"); return; }
        if (currentGuess.length === GUESS_LENGTH) submitGuess(currentPlayerId);
        else callbacks.showToast(`กรุณาใส่เลขให้ครบ ${GUESS_LENGTH} ตัว`);
    } else {
        if (currentGuess.length < GUESS_LENGTH) currentGuess.push(value);
    }
    callbacks.updateGuessDisplay(currentGuess);
}

function submitGuess(currentPlayerId) {
    const guessString = currentGuess.join('');
    const currentRoomId = localStorage.getItem('currentRoomId');
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.turn === currentPlayerId) {
            const opponentNumber = roomData.players[currentTargetId].number;
            const clues = calculateClues(currentGuess, opponentNumber.split(''));
            const guessData = { guess: guessString, strikes: clues.strikes, balls: clues.balls, by: currentPlayerId };
            const historyPath = `players/${currentTargetId}/guesses`;
            if (!roomData.players[currentTargetId].guesses) roomData.players[currentTargetId].guesses = {};
            const newGuessKey = db.ref(`rooms/${currentRoomId}/${historyPath}`).push().key;
            roomData.players[currentTargetId].guesses[newGuessKey] = guessData;
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers[nextTurnIndex];
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            roomData.lastAction = { actorName: roomData.players[currentPlayerId].name, targetName: roomData.players[currentTargetId].name, type: 'guess', timestamp: Date.now() };
        }
        return roomData;
    }).then(() => {
        currentGuess = [];
        callbacks.updateGuessDisplay(currentGuess);
    });
}

function calculateClues(guess, answer) {
    let strikes = 0, balls = 0;
    const answerCopy = [...answer], guessCopy = [...guess];
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

export function submitFinalAnswer() {
    const currentPlayerId = localStorage.getItem('currentPlayerId');
    const currentRoomId = localStorage.getItem('currentRoomId');
    callbacks.playSound(callbacks.sounds.click);
    if (ui.turnIndicator.classList.contains('their-turn')) { callbacks.showToast("ไม่สามารถส่งคำตอบในตาของเพื่อนได้!"); return; }
    if (!currentTargetId) { callbacks.showToast("กรุณาเลือกเป้าหมายที่จะส่งคำตอบสุดท้าย"); return; }
    if (currentGuess.length !== GUESS_LENGTH) { callbacks.showToast(`กรุณาใส่เลขคำตอบให้ครบ ${GUESS_LENGTH} ตัว`); return; }
    const finalAnswer = currentGuess.join('');
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.turn === currentPlayerId) {
            const targetPlayer = roomData.players[currentTargetId];
            const actorPlayer = roomData.players[currentPlayerId];
            let actionType = '';
            if (finalAnswer === targetPlayer.number) {
                targetPlayer.status = 'eliminated';
                actionType = 'final_correct';
            } else {
                callbacks.playSound(callbacks.sounds.wrong);
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
    }).then(() => {
        currentGuess = [];
        callbacks.updateGuessDisplay(currentGuess);
    });
}

export function handleTurnTimer(roomData, currentRoomId, currentPlayerId) {
    if (turnTimerInterval) clearInterval(turnTimerInterval);

    const isMyTurn = roomData.turn === currentPlayerId;
    ui.turnTimerDisplay.textContent = '';

    if (!isMyTurn) return;

    const turnStartTime = roomData.turnStartTime || Date.now();
    let timeLeft = TURN_DURATION - Math.round((Date.now() - turnStartTime) / 1000);
    if (timeLeft < 0) timeLeft = 0;

    ui.turnTimerDisplay.textContent = timeLeft;

    turnTimerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            ui.turnTimerDisplay.textContent = timeLeft;
        }

        if (timeLeft <= 0) {
            clearInterval(turnTimerInterval);
            db.ref(`rooms/${currentRoomId}/turn`).get().then(snapshot => {
                if (snapshot.val() === currentPlayerId) {
                    callbacks.showToast("หมดเวลา! ข้ามตาอัตโนมัติ");
                    skipTurn(currentRoomId, currentPlayerId);
                }
            });
        }
    }, 1000);
}

function skipTurn(currentRoomId, currentPlayerId) {
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.turn === currentPlayerId) {
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers[nextTurnIndex];
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
        }
        return roomData;
    });
}

export function displayGameOver(roomData, currentRoomId, currentPlayerId) {
    if (turnTimerInterval) clearInterval(turnTimerInterval);
    callbacks.showScreen('gameOver');
    const winnerId = roomData.winner;
    const isWinner = winnerId === currentPlayerId;
    const winnerName = roomData.players[winnerId]?.name || 'ไม่มีผู้ชนะ';
    if (isWinner) callbacks.playSound(callbacks.sounds.win);
    ui.screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
    ui.gameOverTitle.textContent = isWinner ? "🎉 คุณชนะ! 🎉" : "จบเกมแล้ว";
    ui.winnerName.textContent = `ผู้ชนะคือ: ${winnerName}`;
    ui.gameOverMessage.textContent = roomData.reason;
    ui.gameOverNumbersContainer.innerHTML = '';
    Object.values(roomData.players).forEach(player => {
        if (player.connected) {
            const numberBox = document.createElement('div');
            numberBox.className = 'final-number-box';
            numberBox.innerHTML = `<div class="final-number-box-title">${player.name}</div><div class="final-number-display">${player.number || '????'}</div>`;
            ui.gameOverNumbersContainer.appendChild(numberBox);
        }
    });
}