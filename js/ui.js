import { GUESS_LENGTH, MAX_CHANCES } from './game.js';

// ฟังก์ชันตรวจสอบ DOM element
function getElement(selector, isRequired = true) {
    const element = document.querySelector(selector);
    if (!element && isRequired) {
        console.warn(`UI element not found: ${selector}`);
    }
    return element;
}

// ฟังก์ชันตรวจสอบหลาย elements
function getElements(selector) {
    return Array.from(document.querySelectorAll(selector));
}

export const screens = {
    splash: getElement('#splash-screen'),
    lobby: getElement('#lobby-screen'),
    createRoom: getElement('#create-room-screen'),
    roomList: getElement('#room-list-screen'),
    joinerSetup: getElement('#joiner-setup-screen'),
    waiting: getElement('#waiting-room-screen'),
    game: getElement('#main-game-screen'),
    gameOver: getElement('#game-over-screen')
};

export const ui = {
    goToCreateBtn: getElement('#go-to-create-btn'),
    goToJoinBtn: getElement('#go-to-join-btn'),
    confirmCreateBtn: getElement('#confirm-create-btn'),
    hostNameInput: getElement('#host-name-input'),
    newRoomNameInput: getElement('#new-room-name-input'),
    newRoomPasswordInput: getElement('#new-room-password-input'),
    roomListContent: getElement('#room-list-content'),
    passwordModal: getElement('#password-modal'),
    passwordModalRoomName: getElement('#password-modal-room-name'),
    passwordModalInput: getElement('#password-modal-input'),
    passwordModalSubmitBtn: getElement('#password-modal-submit-btn'),
    joinerRoomNameDisplay: getElement('#joiner-room-name-display'),
    joinerNameInput: getElement('#joiner-name-input'),
    confirmJoinBtn: getElement('#confirm-join-btn'),
    roomCodeText: getElement('#room-code-text'),
    playerSlots: {
        player1: getElement('#player1-slot'),
        player2: getElement('#player2-slot'),
        player3: getElement('#player3-slot'),
        player4: getElement('#player4-slot')
    },
    waitingMessage: getElement('#waiting-message'),
    startGameBtn: getElement('#start-game-btn'),
    turnIndicator: getElement('#turn-indicator'),
    turnText: getElement('#turn-text'),
    turnTimerDisplay: getElement('#turn-timer-display'),
    ourNumberDisplay: getElement('#our-number-display'),
    playerSummaryGrid: getElement('#player-summary-grid'),
    historyLog: getElement('#history-log'),
    historyTargetName: getElement('#history-target-name'),
    guessNumberContainer: getElement('#guess-number-container'),
    numberPadContainer: getElement('#number-pad-container'),
    chanceDots: getElements('.chance-dot'),
    submitFinalAnswerBtn: getElement('#submit-final-answer-btn'),
    spectatorOverlay: getElement('#spectator-overlay'),
    spectatorMessage: getElement('#spectator-message'),
    gameOverTitle: getElement('#game-over-title'),
    winnerName: getElement('#winner-name'),
    gameOverMessage: getElement('#game-over-message'),
    gameOverNumbersContainer: getElement('#game-over-numbers-container'),
    rematchBtn: getElement('#rematch-btn'),
    backToLobbyBtn: getElement('#back-to-lobby-btn'),
    toast: getElement('#toast', false), // ไม่จำเป็นต้องมี
    actionToast: getElement('#action-toast', false), // ไม่จำเป็นต้องมี
    actionToastText: getElement('#action-toast-text', false), // ไม่จำเป็นต้องมี
    soundControl: getElement('#sound-control'),
    soundIcon: getElement('#sound-icon')
};

// ตรวจสอบว่าทุก screen มีอยู่
const missingScreens = Object.entries(screens)
    .filter(([_, element]) => !element)
    .map(([name]) => name);

if (missingScreens.length > 0) {
    console.warn(`Some screens are missing: ${missingScreens.join(', ')}`);
}

// ตรวจสอบว่าทุก ui element สำคัญมีอยู่
const requiredUiElements = [
    'goToCreateBtn', 'goToJoinBtn', 'roomListContent', 
    'playerSummaryGrid', 'historyLog', 'guessNumberContainer'
];

const missingUiElements = requiredUiElements
    .filter(key => !ui[key])
    .join(', ');

if (missingUiElements) {
    console.error(`Required UI elements are missing: ${missingUiElements}`);
    throw new Error(`Critical UI elements not found. Please check your HTML.`);
}

export function showScreen(screenName) {
    // ตรวจสอบว่า screen มีอยู่
    if (!screens[screenName]) {
        console.error(`Screen not found: ${screenName}`);
        return;
    }

    // ซ่อนทุก screen
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('show');
    });
    
    // แสดง screen ที่ต้องการ
    screens[screenName].classList.add('show');
    
    // ปรับปรุง accessibility
    screens[screenName].setAttribute('aria-hidden', 'false');
    screens[screenName].focus();
}

export function showToast(message) {
    if (!ui.toast) return;
    
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    
    // ปรับปรุง accessibility
    ui.toast.setAttribute('role', 'alert');
    ui.toast.setAttribute('aria-live', 'polite');
    
    setTimeout(() => {
        ui.toast.classList.remove('show');
    }, 3000);
}

export function showActionToast(message, duration = 3000) {
    if (!ui.actionToast || !ui.actionToastText) return;
    
    ui.actionToastText.innerHTML = message;
    ui.actionToast.classList.add('show');
    
    // ปรับปรุง accessibility
    ui.actionToast.setAttribute('role', 'status');
    ui.actionToast.setAttribute('aria-live', 'polite');
    
    setTimeout(() => {
        ui.actionToast.classList.remove('show');
    }, duration);
}

export function updateWaitingRoomUI(roomData, currentPlayerId) {
    // ตรวจสอบข้อมูล
    if (!roomData || !roomData.players) {
        console.warn("Invalid room data for waiting room UI");
        return;
    }

    // อัปเดต room code
    if (ui.roomCodeText) {
        ui.roomCodeText.textContent = roomData.roomName || "ไม่ทราบชื่อห้อง";
    }

    // อัปเดตผู้เล่น
    Object.entries(ui.playerSlots).forEach(([playerId, slot]) => {
        if (!slot) return;
        
        const playerData = roomData.players[playerId];
        const avatar = slot.querySelector('.player-avatar-initial');
        const nameEl = slot.querySelector('.player-name');
        const statusEl = slot.querySelector('.player-status');
        
        if (playerData && playerData.connected) {
            // ผู้เล่นเชื่อมต่อ
            const displayName = playerData.isHost 
                ? `${playerData.name} (เจ้าของห้อง)` 
                : playerData.name;
                
            if (avatar) {
                avatar.textContent = playerData.name.charAt(0).toUpperCase() || '?';
                avatar.style.backgroundColor = playerData.isHost ? '#89cff0' : '#f8c8dc';
            }
            
            if (nameEl) nameEl.textContent = displayName;
            if (statusEl) {
                statusEl.textContent = 'เชื่อมต่อแล้ว';
                statusEl.className = 'player-status connected';
            }
        } else {
            // ผู้เล่นยังไม่ได้เข้าร่วม
            const playerNumber = playerId.replace('player', '');
            const displayName = playerData?.name || `ผู้เล่น ${playerNumber}`;
            
            if (avatar) {
                avatar.textContent = '?';
                avatar.style.backgroundColor = '#e2e8f0';
            }
            
            if (nameEl) nameEl.textContent = displayName;
            if (statusEl) {
                statusEl.textContent = 'กำลังรอ...';
                statusEl.className = 'player-status waiting';
            }
        }
    });

    // อัปเดตข้อความและปุ่ม
    if (ui.waitingMessage && ui.startGameBtn) {
        if (currentPlayerId === 'player1') {
            if (roomData.playerCount >= 2) {
                ui.startGameBtn.disabled = false;
                ui.waitingMessage.textContent = `มีผู้เล่น ${roomData.playerCount} คน กดเริ่มเกมได้เลย!`;
            } else {
                ui.startGameBtn.disabled = true;
                ui.waitingMessage.textContent = 'รอผู้เล่นอย่างน้อย 2 คน...';
            }
        } else {
            ui.startGameBtn.disabled = true;
            ui.waitingMessage.textContent = 'รอเจ้าของห้องเริ่มเกม...';
        }
    }
}

export function updateGuessDisplay(currentGuess) {
    if (!ui.guessNumberContainer) return;
    
    const guessInputs = ui.guessNumberContainer.children;
    for (let i = 0; i < GUESS_LENGTH; i++) {
        if (guessInputs[i]) {
            guessInputs[i].textContent = currentGuess[i] || '';
            // เพิ่ม accessibility
            guessInputs[i].setAttribute('aria-label', `หลักที่ ${i+1}: ${currentGuess[i] || 'ว่าง'}`);
        }
    }
}

export function updateChances(chances) {
    if (!ui.chanceDots || ui.chanceDots.length === 0) return;
    
    // ใช้ MAX_CHANCES จาก game.js
    for (let i = 0; i < MAX_CHANCES; i++) {
        if (ui.chanceDots[i]) {
            ui.chanceDots[i].classList.toggle('used', i >= chances);
            // เพิ่ม accessibility
            ui.chanceDots[i].setAttribute('aria-label', 
                i < chances ? `โอกาสที่ ${i+1} ใช้งานได้` : `โอกาสที่ ${i+1} ถูกใช้แล้ว`);
        }
    }
}

export function updateTurnIndicator(roomData, currentPlayerId, playSound, turnSound) {
    // ตรวจสอบข้อมูล
    if (!roomData || !ui.turnIndicator || !ui.turnText) return;
    
    const currentTurnId = roomData.turn;
    const isMyTurn = currentTurnId === currentPlayerId;
    
    // ตรวจสอบว่าเป็นตาของผู้เล่น
    if (isMyTurn && !ui.turnIndicator.classList.contains('my-turn')) {
        if (playSound && turnSound) {
            playSound(turnSound);
        }
    }
    
    // อัปเดต UI
    ui.turnIndicator.classList.toggle('my-turn', isMyTurn);
    ui.turnIndicator.classList.toggle('their-turn', !isMyTurn);
    
    if (isMyTurn) {
        ui.turnText.textContent = "ตาของคุณ";
        ui.turnIndicator.classList.add('warning'); // เพิ่ม animation เมื่อเหลือเวลาไม่มาก
    } else {
        const turnPlayerName = roomData.players[currentTurnId]?.name || 'ผู้เล่น';
        ui.turnText.textContent = `ตาของ ${turnPlayerName}`;
        ui.turnIndicator.classList.remove('warning');
    }
}

export function updateHistoryLog(roomData, currentTargetId) {
    // ตรวจสอบข้อมูล
    if (!roomData || !ui.historyLog || !ui.historyTargetName) return;
    
    // ล้าง log
    ui.historyLog.innerHTML = '';
    
    // แสดงชื่อเป้าหมาย
    if (currentTargetId && roomData.players[currentTargetId]) {
        ui.historyTargetName.textContent = roomData.players[currentTargetId].name;
        
        // แสดง log ถ้ามี
        const targetData = roomData.players[currentTargetId];
        if (targetData.guesses) {
            Object.values(targetData.guesses)
                .sort((a, b) => a.timestamp - b.timestamp)
                .forEach(item => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    
                    let cluesHTML = '';
                    if (item.strikes > 0) cluesHTML += `<div class="clue-box clue-strike">${item.strikes}S</div>`;
                    if (item.balls > 0) cluesHTML += `<div class="clue-box clue-ball">${item.balls}B</div>`;
                    if (item.strikes === 0 && item.balls === 0) cluesHTML = `<div class="clue-box clue-out">OUT</div>`;
                    
                    historyItem.innerHTML = `
                        <div class="history-guess" aria-label="ตัวเลขที่ทาย: ${item.guess}">
                            ${item.guess}
                        </div>
                        <div class="history-clues" aria-label="ผลลัพธ์: ${item.strikes}S, ${item.balls}B">
                            ${cluesHTML}
                        </div>
                    `;
                    
                    ui.historyLog.appendChild(historyItem);
                });
        }
    } else {
        ui.historyTargetName.textContent = 'ไม่มี';
    }
    
    // เลื่อนลงล่างสุด
    ui.historyLog.scrollTop = ui.historyLog.scrollHeight;
}

export function updatePlayerSummaryGrid(roomData, currentPlayerId, { currentTargetId, handler }) {
    // ตรวจสอบข้อมูล
    if (!roomData || !ui.playerSummaryGrid) return;
    
    // ล้าง grid
    ui.playerSummaryGrid.innerHTML = '';
    
    // สร้าง grid ใหม่
    const opponents = Object.keys(roomData.players).filter(id => 
        id !== currentPlayerId && 
        roomData.players[id] && 
        roomData.players[id].connected
    );
    
    opponents.forEach(opponentId => {
        const opponentData = roomData.players[opponentId];
        if (!opponentData) return;
        
        const card = document.createElement('button');
        card.type = 'button'; // ปรับปรุง accessibility
        card.className = 'player-summary-card';
        card.dataset.playerId = opponentId;
        card.setAttribute('aria-pressed', currentTargetId === opponentId ? 'true' : 'false');
        
        // สถานะผู้เล่น
        if (opponentData.status === 'eliminated') {
            card.classList.add('is-eliminated');
            card.setAttribute('aria-disabled', 'true');
        }
        
        if (opponentId === currentTargetId) {
            card.classList.add('is-target');
        }
        
        // สร้างเนื้อหา
        card.innerHTML = `
            <div class="summary-card-name">${opponentData.name}</div>
            <div class="summary-card-status" aria-live="polite">
                ${opponentData.status === 'eliminated' ? 'แพ้แล้ว' : 'กำลังเล่น'}
            </div>
        `;
        
        // เพิ่ม event listener
        if (opponentData.status !== 'eliminated') {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                handler(opponentId);
            });
        }
        
        ui.playerSummaryGrid.appendChild(card);
    });
    
    // ปรับปรุง accessibility
    ui.playerSummaryGrid.setAttribute('role', 'radiogroup');
    ui.playerSummaryGrid.setAttribute('aria-label', 'เลือกผู้เล่นเป้าหมาย');
}

export function displayGameOver(roomData, currentPlayerId, playSound, winSound) {
    // ตรวจสอบข้อมูล
    if (!roomData) {
        console.error("Invalid room data for game over screen");
        return;
    }
    
    // แสดงหน้าจอ
    showScreen('gameOver');
    
    // ตรวจสอบผู้ชนะ
    const winnerId = roomData.winner;
    const isWinner = winnerId === currentPlayerId;
    const winnerName = roomData.players[winnerId]?.name || 'ไม่มีผู้ชนะ';
    
    // เล่นเสียง
    if (isWinner && playSound && winSound) {
        playSound(winSound);
    }
    
    // อัปเดต UI
    if (screens.gameOver) {
        screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
    }
    
    if (ui.gameOverTitle) {
        ui.gameOverTitle.textContent = isWinner ? "🎉 คุณชนะ! 🎉" : "จบเกมแล้ว";
        ui.gameOverTitle.setAttribute('aria-live', 'assertive');
    }
    
    if (ui.winnerName) {
        ui.winnerName.textContent = `ผู้ชนะคือ: ${winnerName}`;
    }
    
    if (ui.gameOverMessage) {
        ui.gameOverMessage.textContent = roomData.reason || 'ไม่มีข้อมูลเพิ่มเติม';
    }
    
    // แสดงตัวเลขผู้เล่น
    if (ui.gameOverNumbersContainer) {
        ui.gameOverNumbersContainer.innerHTML = '';
        
        Object.values(roomData.players).forEach(player => {
            if (player.connected) {
                const numberBox = document.createElement('div');
                numberBox.className = 'final-number-box';
                numberBox.innerHTML = `
                    <div class="final-number-box-title">${player.name}</div>
                    <div class="final-number-display" aria-label="ตัวเลขของ ${player.name}">
                        ${player.number || '????'}
                    </div>
                `;
                ui.gameOverNumbersContainer.appendChild(numberBox);
            }
        });
    }
}

export function updateGameOverUI(roomData, currentPlayerId) {
    if (!roomData || !ui.rematchBtn) return;
    
    // ตรวจสอบการขอเล่นใหม่
    const hasRequestedRematch = roomData.rematch && roomData.rematch[currentPlayerId];
    
    // อัปเดตปุ่ม
    if (hasRequestedRematch) {
        ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
        ui.rematchBtn.disabled = true;
        ui.rematchBtn.setAttribute('aria-busy', 'true');
    } else {
        ui.rematchBtn.textContent = 'เล่นอีกครั้ง';
        ui.rematchBtn.disabled = false;
        ui.rematchBtn.removeAttribute('aria-busy');
    }
}

// ฟังก์ชันเพิ่มเติมสำหรับ accessibility
export function setupAccessibility() {
    // ตั้งค่า role สำหรับ element สำคัญ
    if (ui.playerSummaryGrid) {
        ui.playerSummaryGrid.setAttribute('role', 'radiogroup');
        ui.playerSummaryGrid.setAttribute('aria-label', 'เลือกผู้เล่นเป้าหมาย');
    }
    
    if (ui.numberPadContainer) {
        ui.numberPadContainer.setAttribute('role', 'grid');
        ui.numberPadContainer.setAttribute('aria-label', 'แป้นตัวเลข');
    }
    
    // ตั้งค่าสำหรับ toast
    if (ui.toast) {
        ui.toast.setAttribute('role', 'alert');
        ui.toast.setAttribute('aria-live', 'polite');
    }
    
    if (ui.actionToast) {
        ui.actionToast.setAttribute('role', 'status');
        ui.actionToast.setAttribute('aria-live', 'polite');
    }
}

// เรียกใช้เมื่อโหลด
document.addEventListener('DOMContentLoaded', () => {
    setupAccessibility();
    
    // ตั้งค่า aria-hidden สำหรับ screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.setAttribute('aria-hidden', 'true');
            screen.tabIndex = -1; // ทำให้ไม่สามารถ focus ได้
        }
    });
});