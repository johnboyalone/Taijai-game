// js/audio.js
import { state } from './state.js';
import { ui } from './ui.js';

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
}

export function playSound(sound) {
    if (state.isMuted) return;
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
    // Play click sound regardless of mute state to give feedback on the button press itself
    sounds.click.play();
}
