// js/game.js

const GUESS_LENGTH = 4;
const TURN_DURATION = 20;

// --- Game Logic Functions ---
function generateSecretNumber() {
    // (โค้ดส่วน generateSecretNumber)
}

function compareNumbers(guess, secret) {
    // (โค้ดส่วน compareNumbers)
}

function handleTurnTimer(startTime, turnDuration, onTick, onEnd) {
    // (โค้ดส่วนจัดการ Timer)
}

// --- Audio Management ---
const sounds = {
    background: new Audio('sounds/background-music.mp3'),
    click: new Audio('sounds/click.mp3'),
    win: new Audio('sounds/win-wow.mp3'),
    wrong: new Audio('sounds/wrong-answer.mp3'),
    turn: new Audio('sounds/your-turn.mp3')
};

function initializeSounds() {
    sounds.background.loop = true;
    sounds.background.volume = 0.3;
    sounds.turn.volume = 0.7;
}

function playSound(soundKey, isMuted) {
    if (isMuted || !sounds[soundKey]) return;
    const sound = sounds[soundKey];
    sound.currentTime = 0;
    sound.play().catch(error => console.log(`Error playing sound: ${error.message}`));
}

// Export ฟังก์ชันและตัวแปรเพื่อให้ main.js เรียกใช้ได้
export {
    GUESS_LENGTH,
    TURN_DURATION,
    generateSecretNumber,
    compareNumbers,
    handleTurnTimer,
    initializeSounds,
    playSound
};
