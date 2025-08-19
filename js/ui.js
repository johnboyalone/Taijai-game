export const screens = {
    splash: document.getElementById('splash-screen'),
    lobby: document.getElementById('lobby-screen'),
    createRoom: document.getElementById('create-room-screen'),
    roomList: document.getElementById('room-list-screen'),
    joinerSetup: document.getElementById('joiner-setup-screen'),
    waiting: document.getElementById('waiting-room-screen'),
    game: document.getElementById('main-game-screen'),
    gameOver: document.getElementById('game-over-screen')
};

export const ui = {
    goToCreateBtn: document.getElementById('go-to-create-btn'),
    goToJoinBtn: document.getElementById('go-to-join-btn'),
    confirmCreateBtn: document.getElementById('confirm-create-btn'),
    hostNameInput: document.getElementById('host-name-input'),
    newRoomNameInput: document.getElementById('new-room-name-input'),
    newRoomPasswordInput: document.getElementById('new-room-password-input'),
    roomListContent: document.getElementById('room-list-content'),
    passwordModal: document.getElementById('password-modal'),
    passwordModalRoomName: document.getElementById('password-modal-room-name'),
    passwordModalInput: document.getElementById('password-modal-input'),
    passwordModalSubmitBtn: document.getElementById('password-modal-submit-btn'),
    joinerRoomNameDisplay: document.getElementById('joiner-room-name-display'),
    joinerNameInput: document.getElementById('joiner-name-input'),
    confirmJoinBtn: document.getElementById('confirm-join-btn'),
    roomCodeText: document.getElementById('room-code-text'),
    playerSlots: {
        player1: document.getElementById('player1-slot'),
        player2: document.getElementById('player2-slot'),
        player3: document.getElementById('player3-slot'),
        player4: document.getElementById('player4-slot')
    },
    waitingMessage: document.getElementById('waiting-message'),
    startGameBtn: document.getElementById('start-game-btn'),
    turnIndicator: document.getElementById('turn-indicator'),
    turnText: document.getElementById('turn-text'),
    turnTimerDisplay: document.getElementById('turn-timer-display'),
    ourNumberDisplay: document.getElementById('our-number-display'),
    playerSummaryGrid: document.getElementById('player-summary-grid'),
    historyLog: document.getElementById('history-log'),
    historyTargetName: document.getElementById('history-target-name'),
    guessNumberContainer: document.getElementById('guess-number-container'),
    numberPadContainer: document.getElementById('number-pad-container'),
    chanceDots: [document.getElementById('chance-1'), document.getElementById('chance-2'), document.getElementById('chance-3')],
    submitFinalAnswerBtn: document.getElementById('submit-final-answer-btn'),
    spectatorOverlay: document.getElementById('spectator-overlay'),
    spectatorMessage: document.getElementById('spectator-message'),
    gameOverTitle: document.getElementById('game-over-title'),
    winnerName: document.getElementById('winner-name'),
    gameOverMessage: document.getElementById('game-over-message'),
    gameOverNumbersContainer: document.getElementById('game-over-numbers-container'),
    rematchBtn: document.getElementById('rematch-btn'),
    backToLobbyBtn: document.getElementById('back-to-lobby-btn'),
    toast: document.getElementById('toast'),
    actionToast: document.getElementById('action-toast'),
    actionToastText: document.getElementById('action-toast-text'),
    soundControl: document.getElementById('sound-control'),
    soundIcon: document.getElementById('sound-icon')
};

export function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('show'));
    if (screens[screenName]) screens[screenName].classList.add('show');
}

export function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    setTimeout(() => ui.toast.classList.remove('show'), 3000);
}

export function showActionToast(message, duration = 3000) {
    ui.actionToastText.innerHTML = message;
    ui.actionToast.classList.add('show');
    setTimeout(() => ui.actionToast.classList.remove('show'), duration);
}

export function updateWaitingRoomUI(roomData, currentPlayerId) {
    ui.roomCodeText.textContent = roomData.roomName;
    for (const playerId in ui.playerSlots) {
        const slot = ui.playerSlots[playerId];
        const playerData = roomData.players[playerId];
        const avatar = slot.querySelector('.player-avatar-initial');
        const nameEl = slot.querySelector('.player-name');
        const statusEl = slot.querySelector('.player-status');
        if (playerData && playerData.connected) {
            avatar.textContent = playerData.name.charAt(0).toUpperCase();
            avatar.style.backgroundColor = playerData.isHost ? '#89cff0' : '#f8c8dc';
            nameEl.textContent = playerData.isHost ? `${playerData.name} (เจ้าของห้อง)` : playerData.name;
            statusEl.textContent = 'เชื่อมต่อแล้ว';
            statusEl.className = 'player-status connected';
        } else {
            const playerNumber = playerId.replace('player', '');
            avatar.textContent = '?';
            avatar.style.backgroundColor = '#e2e8f0';
            nameEl.textContent = `ผู้เล่น ${playerNumber}`;
            statusEl.textContent = 'กำลังรอ...';
            statusEl.className = 'player-status waiting';
        }
    }
    if (currentPlayerId === 'player1') {
        if (roomData.playerCount >= 2) {
            ui.startGameBtn.disabled = false;
            ui.waitingMessage.textContent = `มีผู้เล่น ${roomData.playerCount} คน กดเริ่มเกมได้เลย!`;
        } else {
            ui.startGameBtn.disabled = true;
            ui.waitingMessage.textContent = 'รอผู้เล่นอย่างน้อย 2 คน...';
        }
    } else {
        ui.startGameBtn.disabled = true;
        ui.waitingMessage.textContent = 'รอเจ้าของห้องเริ่มเกม...';
    }
}

export function updateGuessDisplay(currentGuess, GUESS_LENGTH) {
    const guessInputs = ui.guessNumberContainer.children;
    for (let i = 0; i < GUESS_LENGTH; i++) {
        guessInputs[i].textContent = currentGuess[i] || '';
    }
}

export function updateChances(chances) {
    for (let i = 0; i < 3; i++) {
        ui.chanceDots[i].classList.toggle('used', i >= chances);
    }
}

export function updateTurnIndicator(roomData, currentPlayerId, playSound, turnSound) {
    const currentTurnId = roomData.turn;
    const isMyTurn = currentTurnId === currentPlayerId;
    if (isMyTurn && !ui.turnIndicator.classList.contains('my-turn')) {
        playSound(turnSound);
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

export function updateHistoryLog(roomData, currentTargetId) {
    ui.historyLog.innerHTML = '';
    if (!currentTargetId) {
        ui.historyTargetName.textContent = 'ไม่มี';
        return;
    }
    const targetData = roomData.players[currentTargetId];
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

export function updatePlayerSummaryGrid(roomData, currentPlayerId, onTargetSelect) {
    ui.playerSummaryGrid.innerHTML = '';
    const opponents = roomData.turnOrder.filter(id => id !== currentPlayerId);
    opponents.forEach(opponentId => {
        const opponentData = roomData.players[opponentId];
        const card = document.createElement('div');
        card.className = 'player-summary-card';
        card.dataset.playerId = opponentId;
        if (opponentData.status === 'eliminated') card.classList.add('is-eliminated');
        if (opponentId === onTargetSelect.currentTargetId) card.classList.add('is-target');
        card.innerHTML = `<div class="summary-card-name">${opponentData.name}</div><div class="summary-card-status">${opponentData.status === 'eliminated' ? 'แพ้แล้ว' : 'กำลังเล่น'}</div>`;
        if (opponentData.status !== 'eliminated') {
            card.addEventListener('click', () => onTargetSelect.handler(opponentId));
        }
        ui.playerSummaryGrid.appendChild(card);
    });
}

export function displayGameOver(roomData, currentPlayerId, playSound, winSound) {
    showScreen('gameOver');
    const winnerId = roomData.winner;
    const isWinner = winnerId === currentPlayerId;
    const winnerName = roomData.players[winnerId]?.name || 'ไม่มีผู้ชนะ';
    if (isWinner) playSound(winSound);
    screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
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

export function updateGameOverUI(roomData, currentPlayerId) {
    if (roomData.rematch && roomData.rematch[currentPlayerId]) {
        ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
        ui.rematchBtn.disabled = true;
    } else {
        ui.rematchBtn.textContent = 'เล่นอีกครั้ง';
        ui.rematchBtn.disabled = false;
    }
}
