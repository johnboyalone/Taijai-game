// js/ui/gameScreen.js
import { ui } from './elements.js';
import { state, constants } from '../state.js';
import { playSound, sounds } from '../audio.js';
import { skipTurn } from '../firebase/gameActions.js';
import { showToast } from './core.js';

// --- Game Screen UI Updates ---
export function updatePlayingUI(roomData) {
    const myData = roomData.players[state.currentPlayerId];
    if (myData.status === 'eliminated') {
        ui.spectatorOverlay.classList.add('show');
        ui.spectatorMessage.textContent = `คุณแพ้แล้ว! กำลังรับชม...`;
    } else {
        ui.spectatorOverlay.classList.remove('show');
    }
    updateTurnIndicator(roomData);
    updatePlayerSummaryGrid(roomData);
    updateHistoryLog(roomData);
    updateChances(myData.finalChances);
    handleTurnTimer(roomData);
}

export function updateGuessDisplay() {
    const guessInputs = ui.guessNumberContainer.children;
    for (let i = 0; i < constants.GUESS_LENGTH; i++) {
        guessInputs[i].textContent = state.currentGuess[i] || '';
    }
}

function updatePlayerSummaryGrid(roomData) {
    ui.playerSummaryGrid.innerHTML = '';
    const opponents = roomData.turnOrder.filter(id => id !== state.currentPlayerId && roomData.players[id].connected);
    opponents.forEach(opponentId => {
        const opponentData = roomData.players[opponentId];
        const card = document.createElement('div');
        card.className = 'player-summary-card';
        card.dataset.playerId = opponentId;
        if (opponentData.status === 'eliminated') card.classList.add('is-eliminated');
        if (opponentId === state.currentTargetId) card.classList.add('is-target');
        card.innerHTML = `<div class="summary-card-name">${opponentData.name}</div><div class="summary-card-status">${opponentData.status === 'eliminated' ? 'แพ้แล้ว' : 'กำลังเล่น'}</div>`;
        if (opponentData.status !== 'eliminated') {
            card.addEventListener('click', () => {
                playSound(sounds.click);
                state.currentTargetId = opponentId;
                updatePlayerSummaryGrid(roomData); // Re-render to show target change
                updateHistoryLog(roomData);
            });
        }
        ui.playerSummaryGrid.appendChild(card);
    });
}

function updateHistoryLog(roomData) {
    ui.historyLog.innerHTML = '';
    if (!state.currentTargetId) { ui.historyTargetName.textContent = 'ไม่มี'; return; }
    const targetData = roomData.players[state.currentTargetId];
    ui.historyTargetName.textContent = targetData.name;
    if (!targetData.guesses) return;
    Object.values(targetData.guesses).forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        let cluesHTML = '';
        if (item.strikes > 0) cluesHTML += `<div class="clue-box clue-strike">${item.strikes}S</div>`;
        if (item.balls > 0) cluesHTML += `<div class="clue-box clue-ball">${item.balls}B</div>`;
        if (item.strikes === 0 && item.balls === 0) cluesHTML = `<div class="clue-box clue-out">OUT</div>`;
        historyItem.innerHTML = `<div class="history-guess">${item.guess}</div><div class="history-clues">${cluesHTML}</div>`;
        ui.historyLog.appendChild(historyItem);
    });
    ui.historyLog.scrollTop = ui.historyLog.scrollHeight;
}

function updateChances(chances) {
    for (let i = 0; i < 3; i++) {
        ui.chanceDots[i].classList.toggle('used', i >= chances);
    }
}

function updateTurnIndicator(roomData) {
    const currentTurnId = roomData.turn;
    const isMyTurn = currentTurnId === state.currentPlayerId;
    if (isMyTurn && !ui.turnIndicator.classList.contains('my-turn')) {
        playSound(sounds.turn);
    }
    ui.turnIndicator.classList.toggle('my-turn', isMyTurn);
    ui.turnIndicator.classList.toggle('their-turn', !isMyTurn);
    if (isMyTurn) {
        ui.turnText.textContent = "ตาของคุณ";
    } else {
        const turnPlayerName = roomData.players[currentTurnId]?.name || 'เพื่อน';
        ui.turnText.textContent = `ตาของ ${turnPlayerName}`;
    }
}

function handleTurnTimer(roomData) {
    if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);

    const isMyTurn = roomData.turn === state.currentPlayerId;
    ui.turnTimerDisplay.textContent = '';

    if (!isMyTurn) return;

    const turnStartTime = roomData.turnStartTime || Date.now();
    const timePassed = (Date.now() - turnStartTime) / 1000;
    let timeLeft = Math.round(constants.TURN_DURATION - timePassed);

    state.turnTimerInterval = setInterval(() => {
        if (timeLeft >= 0) {
            ui.turnTimerDisplay.textContent = timeLeft;
        }

        if (timeLeft <= 0) {
            clearInterval(state.turnTimerInterval);
            const db = firebase.database();
            db.ref(`rooms/${state.currentRoomId}/turn`).get().then(snapshot => {
                if (snapshot.val() === state.currentPlayerId) {
                    showToast("หมดเวลา! ข้ามตาอัตโนมัติ");
                    skipTurn();
                }
            });
        }
        timeLeft--;
    }, 1000);
}
