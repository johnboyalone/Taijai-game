// js/ui/eventListeners.js (เวอร์ชันแก้ไขที่ถูกต้อง)

import { ui, screens } from './elements.js';
import { state, constants } from '../state.js';
import { playSound, sounds, toggleMute } from '../audio.js';
import { db, serverValue } from '../firebase/config.js'; // <--- Import db และ serverValue
import { createRoom, loadAndDisplayRooms, handlePasswordSubmit, joinRoom } from '../firebase/roomManager.js';
import { submitGuess, submitFinalAnswer, requestRematch } from '../firebase/gameActions.js';
import { showScreen, showToast } from './core.js';
import { updateGuessDisplay } from './gameScreen.js';

// --- ย้ายฟังก์ชัน startGame มาไว้ที่นี่ ---
function startGame() {
    db.ref(`rooms/${state.currentRoomId}`).get().then(snapshot => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            if (roomData.gameState === 'waiting') {
                const connectedPlayerIds = Object.values(roomData.players).filter(p => p.connected).map(p => p.id);
                const updates = {
                    gameState: 'setup',
                    turnOrder: connectedPlayerIds,
                    turn: connectedPlayerIds[0],
                    turnStartTime: serverValue.TIMESTAMP,
                    lastAction: null
                };
                db.ref(`rooms/${state.currentRoomId}`).update(updates);
            }
        }
    });
}

function handleNumberPadClick(value) {
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

    // แก้ไขให้เรียกใช้ฟังก์ชัน startGame ที่เราย้ายมา
    ui.startGameBtn.addEventListener('click', () => {
        playSound(sounds.click);
        if (ui.startGameBtn.disabled) return;
        startGame();
    });

    ui.submitFinalAnswerBtn.addEventListener('click', () => { playSound(sounds.click); submitFinalAnswer(); });
    ui.rematchBtn.addEventListener('click', () => { playSound(sounds.click); requestRematch(); });
    ui.backToLobbyBtn.addEventListener('click', () => window.location.reload());
}
