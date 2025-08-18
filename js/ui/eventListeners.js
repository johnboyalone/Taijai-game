// js/ui/eventListeners.js (Final Confirmed Version)

import { ui, screens } from './elements.js';
import { state } from '../state.js';
import { playSound, sounds, toggleMute } from '../audio.js';
import { createRoom, loadAndDisplayRooms, handlePasswordSubmit, joinRoom } from '../firebase/roomManager.js';
import { submitGuess, submitFinalAnswer, requestRematch } from '../firebase/gameActions.js';
import { showScreen } from './core.js';
import { updateGuessDisplay } from './gameScreen.js';

function handleNumberPadClick(value) { /* ... โค้ดเหมือนเดิม ... */ 
    playSound(sounds.click);
    if (ui.turnIndicator.classList.contains('their-turn')) {
        showToast("ยังไม่ถึงตาของคุณ!");
        return;
    }
    if (value === 'ลบ') {
        if (state.currentGuess.length > 0) state.currentGuess.pop();
    } else if (value === 'ทาย') {
        if (!state.currentTargetId) {
            showToast("กรุณาเลือกเป้าหมายที่จะทายก่อน");
            return;
        }
        if (state.currentGuess.length === constants.GUESS_LENGTH) {
            submitGuess();
        } else {
            showToast(`กรุณาใส่เลขให้ครบ ${constants.GUESS_LENGTH} ตัว`);
        }
    } else {
        if (state.currentGuess.length < constants.GUESS_LENGTH) {
            state.currentGuess.push(value);
        }
    }
    updateGuessDisplay();
}

export function createNumberPad() { /* ... โค้ดเหมือนเดิม ... */ 
    ui.numberPadContainer.innerHTML = '';
    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ลบ', '0', 'ทาย'];
    buttons.forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = val;
        if (val === 'ลบ' || val === 'ทาย') cell.classList.add('special');
        cell.addEventListener('click', () => handleNumberPadClick(val));
        ui.numberPadContainer.appendChild(cell);
    });
}

export function setupInitialListeners() {
    ui.soundControl.addEventListener('click', toggleMute);
    screens.splash.addEventListener('click', () => {
        playSound(sounds.click);
        showScreen('lobby');
        if (sounds.background.paused && !state.isMuted) {
            sounds.background.play().catch(e => console.log("Autoplay was prevented."));
        }
    });

    ui.goToCreateBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('createRoom'); });
    ui.goToJoinBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('roomList'); loadAndDisplayRooms(); });
    ui.confirmCreateBtn.addEventListener('click', () => { playSound(sounds.click); createRoom(); });
    ui.confirmJoinBtn.addEventListener('click', () => { playSound(sounds.click); joinRoom(); });

    ui.passwordModalSubmitBtn.addEventListener('click', () => { playSound(sounds.click); handlePasswordSubmit(); });
    ui.passwordModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });

    ui.submitFinalAnswerBtn.addEventListener('click', () => { playSound(sounds.click); submitFinalAnswer(); });
    ui.rematchBtn.addEventListener('click', () => { playSound(sounds.click); requestRematch(); });
    ui.backToLobbyBtn.addEventListener('click', () => window.location.reload());
}
