// js/ui.js

// Export ตัวแปร UI elements และ Screens เพื่อให้ไฟล์อื่นเรียกใช้ได้
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
    // ... (คัดลอก UI elements ทั้งหมดจาก script.js เดิมมาใส่ตรงนี้) ...
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

export function showActionToast(message, duration = 2000) {
    ui.actionToastText.innerHTML = message;
    ui.actionToast.classList.add('show');
    setTimeout(() => ui.actionToast.classList.remove('show'), duration);
}

export function updateWaitingRoomUI(roomData, currentPlayerId) {
    // ... (คัดลอกโค้ดฟังก์ชัน updateWaitingRoomUI จาก script.js เดิมมาใส่ตรงนี้) ...
}

export function updatePlayingUI(roomData, currentPlayerId) {
    // ... (คัดลอกโค้ดฟังก์ชัน updatePlayingUI จาก script.js เดิมมาใส่ตรงนี้) ...
}

export function updateGameOverUI(roomData, currentPlayerId) {
    // ... (คัดลอกโค้ดฟังก์ชัน updateGameOverUI จาก script.js เดิมมาใส่ตรงนี้) ...
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
    // ... (คัดลอกโค้ดฟังก์ชัน updateTurnIndicator จาก script.js เดิมมาใส่ตรงนี้) ...
}

export function updateHistoryLog(roomData, currentTargetId) {
    // ... (คัดลอกโค้ดฟังก์ชัน updateHistoryLog จาก script.js เดิมมาใส่ตรงนี้) ...
}

export function updatePlayerSummaryGrid(roomData, currentPlayerId, onTargetSelect, playSound, clickSound) {
    // ... (คัดลอกโค้ดฟังก์ชัน updatePlayerSummaryGrid จาก script.js เดิมมาใส่ตรงนี้) ...
}

export function displayGameOver(roomData, currentPlayerId, playSound, winSound) {
    // ... (คัดลอกโค้ดฟังก์ชัน displayGameOver จาก script.js เดิมมาใส่ตรงนี้) ...
}
