// js/ui/elements.js

// เก็บการอ้างอิงถึง Screens ทั้งหมด
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

// เก็บการอ้างอิงถึง UI elements อื่นๆ
export const ui = {
    // Buttons & Inputs
    goToCreateBtn: document.getElementById('go-to-create-btn'),
    goToJoinBtn: document.getElementById('go-to-join-btn'),
    confirmCreateBtn: document.getElementById('confirm-create-btn'),
    hostNameInput: document.getElementById('host-name-input'),
    newRoomNameInput: document.getElementById('new-room-name-input'),
    newRoomPasswordInput: document.getElementById('new-room-password-input'),
    passwordModalSubmitBtn: document.getElementById('password-modal-submit-btn'),
    confirmJoinBtn: document.getElementById('confirm-join-btn'),
    startGameBtn: document.getElementById('start-game-btn'),
    submitFinalAnswerBtn: document.getElementById('submit-final-answer-btn'),
    rematchBtn: document.getElementById('rematch-btn'),
    backToLobbyBtn: document.getElementById('back-to-lobby-btn'),
    joinerNameInput: document.getElementById('joiner-name-input'),
    passwordModalInput: document.getElementById('password-modal-input'),

    // Displays & Containers
    roomListContent: document.getElementById('room-list-content'),
    passwordModal: document.getElementById('password-modal'),
    passwordModalRoomName: document.getElementById('password-modal-room-name'),
    joinerRoomNameDisplay: document.getElementById('joiner-room-name-display'),
    roomCodeText: document.getElementById('room-code-text'),
    playerSlots: {
        player1: document.getElementById('player1-slot'),
        player2: document.getElementById('player2-slot'),
        player3: document.getElementById('player3-slot'),
        player4: document.getElementById('player4-slot')
    },
    waitingMessage: document.getElementById('waiting-message'),
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
    spectatorOverlay: document.getElementById('spectator-overlay'),
    spectatorMessage: document.getElementById('spectator-message'),
    gameOverTitle: document.getElementById('game-over-title'),
    winnerName: document.getElementById('winner-name'),
    gameOverMessage: document.getElementById('game-over-message'),
    gameOverNumbersContainer: document.getElementById('game-over-numbers-container'),

    // Toasts & Sound
    toast: document.getElementById('toast'),
    actionToast: document.getElementById('action-toast'),
    actionToastText: document.getElementById('action-toast-text'),
    soundControl: document.getElementById('sound-control'),
    soundIcon: document.getElementById('sound-icon')
};
