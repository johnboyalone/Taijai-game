// js/audio.js
import { state } from './state.js';
import { ui } from './ui/elements.js';

export const sounds = {
    background: new Audio('sounds/background-music.mp3'),
    click: new Audio('sounds/click.mp3'),
    win: new Audio('sounds/win-wow.mp3'),
    wrong: new Audio('sounds/wrong-answer.mp3'),
    turn: new Audio('sounds/your-turn.mp3')
};

export function initializeAudio() {
    sounds.background.loop = true;
    sounds.background.volume = 0.3;
    sounds.turn.volume = 0.7;
    sounds.click.volume = 0.5;

    // เพิ่มการจัดการ Error หากโหลดไฟล์เสียงไม่สำเร็จ
    Object.values(sounds).forEach(sound => {
        sound.onerror = () => {
            console.warn(`Could not load sound: ${sound.src}`);
        };
    });
}

export function playSound(sound) {
    if (state.isMuted || !sound || !sound.src) return;
    sound.currentTime = 0;
    sound.play().catch(error => console.log(`Error playing sound: ${error.message}`));
}

export function toggleMute() {
    state.isMuted = !state.isMuted;
    if (state.isMuted) {
        sounds.background.pause();
        ui.soundIcon.textContent = '🔇';
    } else {
        sounds.background.play().catch(e => console.log("Autoplay was prevented."));
        ui.soundIcon.textContent = '🔊';
    }
    playSound(sounds.click);
}
