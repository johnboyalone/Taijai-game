// js/ui/eventListeners.js
import { ui, screens } from './elements.js';
import { state, constants } from '../state.js';
import { playSound, sounds, toggleMute } from '../audio.js';
import { createRoom, loadAndDisplayRooms, handlePasswordSubmit, joinRoom } from '../firebase/roomManager.js';
import { submitGuess, submitFinalAnswer, requestRematch } from '../firebase/gameActions.js';
import { showScreen, showToast } from './core.js';
import { updateGuessDisplay } from './gameScreen.js';

/**
 * จัดการการคลิกบน Number Pad ในหน้าเล่นเกม
 * @param {string} value - ค่าของปุ่มที่ถูกกด ('1', '2', ..., 'ลบ', 'ทาย')
 */
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

/**
 * สร้างปุ่ม Number Pad ขึ้นมาใน DOM และผูก Event Listener
 */
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

/**
 * ตั้งค่า Event Listeners ทั้งหมดของแอปพลิเคชัน
 * ควรเรียกใช้ฟังก์ชันนี้เพียงครั้งเดียวเมื่อเริ่มต้นแอป
 */
export function setupInitialListeners() {
    // --- Sound Control ---
    ui.soundControl.addEventListener('click', toggleMute);

    // --- Splash Screen ---
    screens.splash.addEventListener('click', () => {
        playSound(sounds.click);
        showScreen('lobby');
        if (sounds.background.paused && !state.isMuted) {
            sounds.background.play().catch(e => console.log("Autoplay was prevented."));
        }
    });

    // --- Lobby & Room Management ---
    ui.goToCreateBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('createRoom'); });
    ui.goToJoinBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('roomList'); loadAndDisplayRooms(); });
    ui.confirmCreateBtn.addEventListener('click', () => { playSound(sounds.click); createRoom(); });
    ui.confirmJoinBtn.addEventListener('click', () => { playSound(sounds.click); joinRoom(); });

    // --- Password Modal ---
    ui.passwordModalSubmitBtn.addEventListener('click', () => { playSound(sounds.click); handlePasswordSubmit(); });
    ui.passwordModal.addEventListener('click', function(e) {
        // ปิด Modal เมื่อคลิกที่พื้นหลังสีเทา
        if (e.target === this) {
            this.classList.remove('show');
        }
    });

    // --- Waiting Room ---
    ui.startGameBtn.addEventListener('click', () => {
        playSound(sounds.click);
        if (ui.startGameBtn.disabled) return;
        const db = firebase.database();
        db.ref(`rooms/${state.currentRoomId}`).get().then(snapshot => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                if (roomData.gameState === 'waiting') {
                    const connectedPlayerIds = Object.values(roomData.players).filter(p => p.connected).map(p => p.id);
                    const updates = {
                        gameState: 'setup',
                        turnOrder: connectedPlayerIds,
                        turn: connectedPlayerIds[0],
                        turnStartTime: firebase.database.ServerValue.TIMESTAMP,
                        lastAction: null
                    };
                    db.ref(`rooms/${state.currentRoomId}`).update(updates);
                }
            }
        });
    });

    // --- Game Actions ---
    ui.submitFinalAnswerBtn.addEventListener('click', () => { playSound(sounds.click); submitFinalAnswer(); });

    // --- Game Over ---
    ui.rematchBtn.addEventListener('click', () => { playSound(sounds.click); requestRematch(); });
    ui.backToLobbyBtn.addEventListener('click', () => window.location.reload());
}
