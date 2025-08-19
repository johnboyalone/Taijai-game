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
    readyBtn: document.getElementById('ready-btn'),
    startBtn: document.getElementById('start-btn'),
    waitingRoomName: document.getElementById('waiting-room-name'),
    hostNameDisplay: document.getElementById('host-name-display'),
    waitingPlayerCount: document.getElementById('waiting-player-count'),
    waitingPlayerList: document.getElementById('waiting-player-list'),
    numberSetupContainer: document.getElementById('number-setup-container'),
    numberSetupInput: document.getElementById('number-setup-input'),
    numberPadContainer: document.getElementById('number-pad-container'),
    guessDisplay: document.getElementById('guess-display'),
    opponentSelection: document.getElementById('opponent-selection'),
    playerSummaryGrid: document.getElementById('player-summary-grid'),
    historyLog: document.getElementById('history-log'),
    chancesDisplay: document.getElementById('chances-display'),
    turnIndicator: document.getElementById('turn-indicator'),
    turnTimerDisplay: document.getElementById('turn-timer-display'),
    gameOverTitle: document.getElementById('game-over-title'),
    winnerName: document.getElementById('winner-name'),
    gameOverMessage: document.getElementById('game-over-message'),
    gameOverNumbersContainer: document.getElementById('game-over-numbers-container'),
    rematchBtn: document.getElementById('rematch-btn'),
    skipTurnBtn: document.getElementById('skip-turn-btn'),
    muteBtn: document.getElementById('mute-btn')
};

export function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.style.display = 'none';
    });
    const targetScreen = screens[screenName];
    if (targetScreen) {
        targetScreen.style.display = 'flex';
    }
}

export function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

export function showActionToast(message) {
    const actionToast = document.createElement('div');
    actionToast.className = 'action-toast';
    actionToast.textContent = message;
    document.body.appendChild(actionToast);
    setTimeout(() => {
        actionToast.remove();
    }, 3000);
}

export function updateWaitingRoomUI(roomData, currentPlayerId) {
    ui.waitingRoomName.textContent = `ห้อง: ${roomData.roomName}`;
    ui.hostNameDisplay.textContent = `ผู้สร้าง: ${roomData.hostName}`;
    ui.waitingPlayerCount.textContent = `${roomData.playerCount || 0} / 4`;
    ui.startBtn.style.display = roomData.players.player1.uid === currentPlayerId ? 'block' : 'none';
    
    ui.waitingPlayerList.innerHTML = '';
    const players = Object.values(roomData.players);
    players.forEach(player => {
        if (player.uid) {
            const playerItem = document.createElement('div');
            playerItem.className = `waiting-player-item ${player.connected ? 'connected' : 'disconnected'}`;
            playerItem.innerHTML = `<span class="player-name">${player.name || 'ไม่มีชื่อ'}</span>
                                    <span class="player-status">${player.connected ? 'ออนไลน์' : 'ออฟไลน์'}</span>
                                    ${player.numberSet ? '<span class="ready-status">พร้อม</span>' : ''}`;
            ui.waitingPlayerList.appendChild(playerItem);
        }
    });

    const isHost = roomData.players.player1.uid === currentPlayerId;
    const allReady = players.filter(p => p.uid).every(p => p.numberSet);
    ui.startBtn.disabled = !allReady || !isHost;
}

export function updateGuessDisplay(currentGuess) {
    const displayStr = currentGuess.join('');
    ui.guessDisplay.textContent = displayStr;
}

export function updateChances(chances) {
    ui.chancesDisplay.textContent = `โอกาสทาย: ${chances}`;
}

export function updateTurnIndicator(roomData, currentPlayerId, playSound, turnSound) {
    const myTurn = roomData.turn === currentPlayerId;
    ui.turnIndicator.textContent = myTurn ? 'ตาคุณ!' : `ตานี้: ${roomData.players[roomData.turn]?.name}`;
    if (myTurn) {
        playSound(turnSound);
    }
}

export function updateHistoryLog(roomData, currentTargetId) {
    ui.historyLog.innerHTML = '';
    const targetPlayer = roomData.players[currentTargetId];
    if (!targetPlayer || !targetPlayer.guesses) {
        ui.historyLog.innerHTML = '<p class="no-history-message">ยังไม่มีประวัติการทาย</p>';
        return;
    }
    
    const guesses = Object.values(targetPlayer.guesses);
    guesses.forEach(guess => {
        const guessItem = document.createElement('div');
        guessItem.className = 'guess-history-item';
        guessItem.textContent = guess.guess;
        ui.historyLog.appendChild(guessItem);
    });
}

export function updatePlayerSummaryGrid(roomData, currentPlayerId, { currentTargetId, handler }) {
    ui.playerSummaryGrid.innerHTML = '';
    Object.keys(roomData.players).forEach(playerId => {
        const player = roomData.players[playerId];
        if (!player.uid || playerId === currentPlayerId) return;

        const isTarget = playerId === currentTargetId;
        const card = document.createElement('div');
        card.className = `player-card ${player.status} ${isTarget ? 'selected' : ''}`;
        card.innerHTML = `<div class="player-name">${player.name}</div>
                          <div class="player-status-text">${player.status === 'playing' ? 'กำลังเล่น' : 'ถูกกำจัด'}</div>`;
        card.addEventListener('click', () => handler(playerId));
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