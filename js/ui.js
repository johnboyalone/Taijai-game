// js/ui.js

// นำ UI elements ทั้งหมดกลับมา
export const ui = {
    screens: {
        splash: document.getElementById('splash-screen'),
        lobby: document.getElementById('lobby-screen'),
        createRoom: document.getElementById('create-room-screen'),
        roomList: document.getElementById('room-list-screen'),
        joinerSetup: document.getElementById('joiner-setup-screen'),
        waiting: document.getElementById('waiting-room-screen'),
        game: document.getElementById('main-game-screen'),
        gameOver: document.getElementById('game-over-screen')
    },
    goToCreateBtn: document.getElementById('go-to-create-btn'),
    goToJoinBtn: document.getElementById('go-to-join-btn'),
    confirmCreateBtn: document.getElementById('confirm-create-btn'),
    hostNameInput: document.getElementById('host-name-input'),
    newRoomNameInput: document.getElementById('new-room-name-input'),
    newRoomPasswordInput: document.getElementById('new-room-password-input'),
    roomCodeText: document.getElementById('room-code-text'),
    waitingMessage: document.getElementById('waiting-message'),
    startGameBtn: document.getElementById('start-game-btn'),
    toast: document.getElementById('toast'),
    // เพิ่ม element อื่นๆ ตามต้องการในอนาคต
};

// ฟังก์ชันแสดง/ซ่อนหน้าจอ (เหมือนเดิม)
export function showScreen(screenName) {
    Object.values(ui.screens).forEach(screen => {
        if(screen) screen.classList.remove('show');
    });
    if (ui.screens[screenName]) {
        ui.screens[screenName].classList.add('show');
    }
}

// ฟังก์ชันแสดง Toast สำหรับแจ้งเตือน
export function showToast(message) {
    if (!ui.toast) return;
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    setTimeout(() => ui.toast.classList.remove('show'), 3000);
}

// (ฟังก์ชัน UI อื่นๆ เช่น updateWaitingRoomUI จะเพิ่มเข้ามาทีหลัง)
