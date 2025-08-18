// js/ui.js (เวอร์ชันเริ่มต้นใหม่)

// 1. ประกาศ UI elements ที่ต้องใช้
export const ui = {
    screens: {
        splash: document.getElementById('splash-screen'),
        lobby: document.getElementById('lobby-screen'),
    }
    // เรายังไม่ต้องการ element อื่นๆ ในตอนนี้
};

// 2. Export ฟังก์ชันที่จำเป็น
export function showScreen(screenName) {
    // ซ่อนทุกหน้าจอ
    Object.values(ui.screens).forEach(screen => {
        if(screen) screen.classList.remove('show');
    });
    // แสดงเฉพาะหน้าจอที่ต้องการ
    if (ui.screens[screenName]) {
        ui.screens[screenName].classList.add('show');
    }
}
