// js/ui.js (REVISED with Lazy Initialization)

// 1. เปลี่ยนจากการเก็บ Element มาเป็นการเก็บ "Selector" (ชื่อ ID)
const SELECTORS = {
    screens: {
        splash: '#splash-screen',
        lobby: '#lobby-screen',
        createRoom: '#create-room-screen',
        waiting: '#waiting-room-screen',
    },
    buttons: {
        goToCreate: '#go-to-create-btn',
        goToJoin: '#go-to-join-btn',
        confirmCreate: '#confirm-create-btn',
    },
    inputs: {
        hostName: '#host-name-input',
        roomName: '#new-room-name-input',
        roomPassword: '#new-room-password-input',
    },
    toasts: {
        notification: '#toast',
    }
};

// 2. สร้าง Object `ui` ที่จะทำการ querySelector เมื่อถูกเรียกใช้เท่านั้น
// นี่คือหัวใจของการแก้ไข: โค้ดจะหา Element ก็ต่อเมื่อเราเรียกใช้มัน เช่น ui.buttons.goToCreate
export const ui = {
    screens: {
        get splash() { return document.querySelector(SELECTORS.screens.splash); },
        get lobby() { return document.querySelector(SELECTORS.screens.lobby); },
        get createRoom() { return document.querySelector(SELECTORS.screens.createRoom); },
        get waiting() { return document.querySelector(SELECTORS.screens.waiting); },
    },
    buttons: {
        get goToCreate() { return document.querySelector(SELECTORS.buttons.goToCreate); },
        get goToJoin() { return document.querySelector(SELECTORS.buttons.goToJoin); },
        get confirmCreate() { return document.querySelector(SELECTORS.buttons.confirmCreate); },
    },
    inputs: {
        get hostName() { return document.querySelector(SELECTORS.inputs.hostName); },
        get roomName() { return document.querySelector(SELECTORS.inputs.roomName); },
        get roomPassword() { return document.querySelector(SELECTORS.inputs.roomPassword); },
    },
    toasts: {
        get notification() { return document.querySelector(SELECTORS.toasts.notification); },
    }
};

// 3. ฟังก์ชัน UI Helpers (ยังคงเหมือนเดิม แต่ปรับให้ใช้ ui object ใหม่)
export function showScreen(screenName) {
    // ซ่อนทุกหน้าจอ
    document.querySelectorAll('.game-screen').forEach(screen => screen.classList.remove('show'));
    // แสดงหน้าจอที่ต้องการ
    if (ui.screens[screenName]) {
        ui.screens[screenName].classList.add('show');
    }
}

export function showToast(message) {
    const toastEl = ui.toasts.notification;
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}
