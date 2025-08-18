import { playSound, sounds, toggleMute } from '../audio.js';
import { showScreen, showToast } from './core.js';
import { ui, screens } from './elements.js';
import { createRoom, loadAndDisplayRooms, handlePasswordSubmit, joinRoom } from '../firebase/roomManager.js';
import { submitGuess, submitFinalAnswer, requestRematch, startGame } from '../firebase/gameActions.js';
import { state, constants } from '../state.js';
import { updateGuessDisplay } from './gameScreen.js';
import { debugLog } from '../main.js';

function handleNumberPadClick(value) {
    playSound(sounds.click);
    const myData = state.roomData?.players[state.currentPlayerId];
    const isMyTurnAsTarget = state.roomData?.turn === state.currentPlayerId;

    if (isMyTurnAsTarget || myData?.status === 'eliminated') {
        showToast("ตอนนี้คุณทายไม่ได้ครับ");
        return;
    }

    if (value === 'ลบ') {
        if (state.currentGuess.length > 0) state.currentGuess.pop();
    } else if (value === 'ทาย') {
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

export function createNumberPad() {
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
    debugLog("7. setupInitialListeners() is called.");

    if (!screens.splash) {
        debugLog("CRITICAL ERROR: Splash screen element not found!");
        return;
    }

    screens.splash.addEventListener('click', () => {
        debugLog("8. Splash screen CLICKED! Changing to lobby...");
        playSound(sounds.click);
        showScreen('lobby');
    });

    debugLog("INFO: Splash screen event listener attached.");

    ui.soundControl.addEventListener('click', toggleMute);
    ui.goToCreateBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('createRoom'); });
    ui.goToJoinBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('roomList'); loadAndDisplayRooms(); });
    ui.confirmCreateBtn.addEventListener('click', () => { playSound(sounds.click); createRoom(); });
    ui.modeOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            playSound(sounds.click);
            ui.modeOptionBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedGameMode = btn.dataset.mode;
            ui.confirmCreateBtn.disabled = false;
        });
    });
    ui.passwordModalSubmitBtn.addEventListener('click', () => { playSound(sounds.click); handlePasswordSubmit(); });
    ui.passwordModal.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });
    ui.confirmJoinBtn.addEventListener('click', () => { playSound(sounds.click); joinRoom(); });
    ui.startGameBtn.addEventListener('click', () => {
        playSound(sounds.click);
        if (ui.startGameBtn.disabled) return;
        startGame();
    });
    ui.submitFinalAnswerBtn.addEventListener('click', () => { playSound(sounds.click); submitFinalAnswer(); });
    ui.rematchBtn.addEventListener('click', () => { playSound(sounds.click); requestRematch(); });
    ui.backToLobbyBtn.addEventListener('click', () => window.location.reload());
}
