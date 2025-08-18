// js/game.js

// --- Audio Management ---
// (เราจะยังไม่ export ตัวแปร sounds โดยตรง แต่จะ export ฟังก์ชันที่ควบคุมมัน)
const sounds = {
    background: new Audio('sounds/background-music.mp3'),
    click: new Audio('sounds/click.mp3'),
    win: new Audio('sounds/win-wow.mp3'),
    wrong: new Audio('sounds/wrong-answer.mp3'),
    turn: new Audio('sounds/your-turn.mp3')
};

// ฟังก์ชันสำหรับตั้งค่าเสียงเริ่มต้น
export function initializeSounds() {
    sounds.background.loop = true;
    sounds.background.volume = 0.3;
    sounds.turn.volume = 0.7;
    sounds.click.volume = 0.5; // ตั้งค่าความดังเสียงคลิก
}

// ฟังก์ชันกลางสำหรับเล่นเสียง
export function playSound(soundKey, isMuted) {
    if (isMuted || !sounds[soundKey]) return;
    const sound = sounds[soundKey];
    sound.currentTime = 0;
    sound.play().catch(error => console.log(`Error playing sound: ${error.message}`));
}

// ฟังก์ชันสำหรับควบคุมเพลงพื้นหลังโดยเฉพาะ
export function playBackgroundMusic(isMuted) {
    if (!isMuted && sounds.background.paused) {
        sounds.background.play().catch(e => console.log("Autoplay was prevented."));
    }
}

export function stopBackgroundMusic() {
    sounds.background.pause();
}

// (ฟังก์ชันเกี่ยวกับตรรกะเกมอื่นๆ จะเพิ่มเข้ามาทีหลัง)
