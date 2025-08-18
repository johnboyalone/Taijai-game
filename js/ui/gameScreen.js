import { ui } from './elements.js';
import { state, constants } from '../state.js';

export function updateScoreboard(roomData) {
    const players = Object.values(roomData.players);
    const sortedPlayers = players.filter(p => p.connected).sort((a, b) => b.score - a.score);
    let scoreboardHTML = '';
    sortedPlayers.forEach(player => {
        scoreboardHTML += `<div class="scoreboard-player"><span class="scoreboard-name">${player.name}</span><span class="scoreboard-score">${player.score} แต้ม</span></div>`;
    });
    ui.scoreboardContent.innerHTML = scoreboardHTML;
}

export function updateCardDisplay(roomData) {
    const currentCard = roomData.currentCard;
    const isMyTurnAsTarget = roomData.turn === state.currentPlayerId;
    if (isMyTurnAsTarget && currentCard) {
        ui.cardContent.innerHTML = `<div class="card-item"><h4 class="card-name">${currentCard.name}</h4><p class="card-description">${currentCard.description}</p></div>`;
    } else {
        ui.cardContent.innerHTML = `<p class="no-card-text">เฉพาะคนที่เป็นเป้าหมายเท่านั้นที่จะได้รับการ์ด</p>`;
    }
}

export function updateHistoryLog(roomData) {
    ui.historyLog.innerHTML = '';
    if (!state.currentTargetId) {
        ui.historyTargetName.textContent = 'ไม่มี';
        return;
    }
    const targetData = roomData.players[state.currentTargetId];
    ui.historyTargetName.textContent = targetData.name;
    if (!targetData.guesses) return;

    const sortedGuesses = Object.values(targetData.guesses).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    sortedGuesses.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        let cluesHTML = '';
        if (item.strikes > 0) cluesHTML += `<div class="clue-box clue-strike">${item.strikes}S</div>`;
        if (item.balls > 0) cluesHTML += `<div class="clue-box clue-ball">${item.balls}B</div>`;
        if (item.strikes === 0 && item.balls === 0) cluesHTML = `<div class="clue-box clue-out">OUT</div>`;
        const guesserName = item.byName || 'ผู้เล่น';
        historyItem.innerHTML = `<div class="history-guess-info"><span class="history-guesser-name">${guesserName}:</span><span class="history-guess">${item.guess}</span></div><div class="history-clues">${cluesHTML}</div>`;
        ui.historyLog.appendChild(historyItem);
    });
    ui.historyLog.scrollTop = ui.historyLog.scrollHeight;
}

export function updateChances(chances) {
    for (let i = 0; i < 3; i++) {
        ui.chanceDots[i].classList.toggle('used', i >= chances);
    }
}

export function updateGuessDisplay() {
    const guessInputs = ui.guessNumberContainer.children;
    for (let i = 0; i < constants.GUESS_LENGTH; i++) {
        guessInputs[i].textContent = state.currentGuess[i] || '';
    }
}

export function updateTurnIndicator(roomData) {
    const currentTurnId = roomData.turn;
    const isMyTurnAsTarget = currentTurnId === state.currentPlayerId;
    const myData = roomData.players[state.currentPlayerId];

    ui.turnIndicator.classList.toggle('my-turn', isMyTurnAsTarget);
    ui.turnIndicator.classList.toggle('their-turn', !isMyTurnAsTarget);

    if (isMyTurnAsTarget) {
        ui.turnText.textContent = "ตาของคุณ (กำลังถูกทาย)";
    } else {
        const turnPlayerName = roomData.players[currentTurnId]?.name || 'เพื่อน';
        ui.turnText.textContent = `กำลังทาย: ${turnPlayerName}`;
    }

    if (myData.number) {
        ui.ourNumberDisplay.innerHTML = '';
        for (let i = 0; i < constants.GUESS_LENGTH; i++) {
            ui.ourNumberDisplay.innerHTML += `<div class="number-input">${myData.number[i]}</div>`;
        }
    }
}

export function updateGuessControls(roomData) {
    const myData = roomData.players[state.currentPlayerId];
    const isMyTurnAsTarget = roomData.turn === state.currentPlayerId;
    const shouldBeDisabled = isMyTurnAsTarget || myData.status === 'eliminated';

    ui.guessControls.style.opacity = shouldBeDisabled ? '0.5' : '1';
    ui.guessControls.style.pointerEvents = shouldBeDisabled ? 'none' : 'auto';
    ui.finalAnswerSection.style.opacity = shouldBeDisabled ? '0.5' : '1';
    ui.finalAnswerSection.style.pointerEvents = shouldBeDisabled ? 'none' : 'auto';
}
