// js/ui.js

// --- UI Element References ---
// (ย้ายตัวแปร const ui ทั้งหมดมาไว้ที่นี่)
const ui = {
    screens: {
        splash: document.getElementById('splash-screen'),
        lobby: document.getElementById('lobby-screen'),
        // ... (element อื่นๆ ทั้งหมด) ...
    },
    // ... (ปุ่ม, input, และ element อื่นๆ) ...
    soundIcon: document.getElementById('sound-icon')
};

// --- UI Helper Functions ---
function showScreen(screenName) {
    Object.values(ui.screens).forEach(screen => screen.classList.remove('show'));
    if (ui.screens[screenName]) ui.screens[screenName].classList.add('show');
}

function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    setTimeout(() => ui.toast.classList.remove('show'), 3000);
}

function showActionToast(message, duration = 2000) {
    ui.actionToastText.innerHTML = message;
    ui.actionToast.classList.add('show');
    setTimeout(() => ui.actionToast.classList.remove('show'), duration);
}

// --- UI Update Functions ---
function updateWaitingRoomUI(roomData, currentPlayerId) {
    // (โค้ดส่วน updateWaitingRoomUI ทั้งหมด)
}

function updatePlayerSummaryGrid(players, currentTargetId, currentPlayerId) {
    // (โค้ดส่วน updatePlayerSummaryGrid ทั้งหมด)
}

function updateHistoryLog(history) {
    // (โค้dส่วน updateHistoryLog ทั้งหมด)
}

function updateTurnIndicator(roomData, currentPlayerId) {
    // (โค้ดส่วน updateTurnIndicator ทั้งหมด)
}

function updateChancesUI(player) {
    // (โค้ดส่วน updateChancesUI ทั้งหมด)
}

function displayGameOver(roomData, currentPlayerId) {
    // (โค้ดส่วน displayGameOver ทั้งหมด)
}

function updateGameOverUI(roomData) {
    // (โค้ดส่วน updateGameOverUI ทั้งหมด)
}

function createNumberPad(onNumberClick, onBackspaceClick, onClearClick) {
    // (โค้ดส่วน createNumberPad ทั้งหมด)
}

// Export ฟังก์ชันเพื่อให้ main.js เรียกใช้ได้
export { 
    ui, 
    showScreen, 
    showToast, 
    showActionToast,
    updateWaitingRoomUI,
    updatePlayerSummaryGrid,
    updateHistoryLog,
    updateTurnIndicator,
    updateChancesUI,
    displayGameOver,
    updateGameOverUI,
    createNumberPad
};
