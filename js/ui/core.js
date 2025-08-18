// js/ui/core.js
import { screens, ui } from './elements.js';
import { state } from '../state.js';
import { playSound, sounds } from '../audio.js';

// --- Screen & Notification Management ---
export function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('show'));
    if (screens[screenName]) screens[screenName].classList.add('show');
}

export function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    setTimeout(() => ui.toast.classList.remove('show'), 3000);
}

export function showActionToast(message, duration = 2000) {
    ui.actionToastText.innerHTML = message;
    ui.actionToast.classList.add('show');
    setTimeout(() => ui.actionToast.classList.remove('show'), duration);
}

// --- UI Update Functions (Non-Game Screen) ---
export function updateWaitingRoomUI(roomData) {
    ui.roomCodeText.textContent = roomData.roomName;
    for (const playerId in ui.playerSlots) {
        const slot = ui.playerSlots[playerId];
        const playerData = roomData.players[playerId];
        const avatar = slot.querySelector('.player-avatar-initial');
        const nameEl = slot.querySelector('.player-name');
        const statusEl = slot.querySelector('.player-status');
        if (playerData && playerData.connected) {
            avatar.textContent = playerData.name.charAt(0).toUpperCase();
            avatar.style.backgroundColor = playerData.isHost ? '#89cff0' : '#f8c8dc';
            nameEl.textContent = playerData.isHost ? `${playerData.name} (เจ้าของห้อง)` : playerData.name;
            statusEl.textContent = 'เชื่อมต่อแล้ว';
            statusEl.className = 'player-status connected';
        } else {
            const playerNumber = playerId.replace('player', '');
            avatar.textContent = '?';
            avatar.style.backgroundColor = '#e2e8f0';
            nameEl.textContent = `ผู้เล่น ${playerNumber}`;
            statusEl.textContent = 'กำลังรอ...';
            statusEl.className = 'player-status waiting';
        }
    }
    if (state.currentPlayerId === 'player1') {
        const connectedPlayerCount = Object.values(roomData.players).filter(p => p.connected).length;
        if (connectedPlayerCount >= 2) {
            ui.startGameBtn.disabled = false;
            ui.waitingMessage.textContent = `มีผู้เล่น ${connectedPlayerCount} คน กดเริ่มเกมได้เลย!`;
        } else {
            ui.startGameBtn.disabled = true;
            ui.waitingMessage.textContent = 'รอผู้เล่นอย่างน้อย 2 คน...';
        }
    } else {
        ui.startGameBtn.disabled = true;
        ui.waitingMessage.textContent = 'รอเจ้าของห้องเริ่มเกม...';
    }
}

export function displayGameOver(roomData) {
    if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);
    showScreen('gameOver');
    const winnerId = roomData.winner;
    const isWinner = winnerId === state.currentPlayerId;
    const winnerName = roomData.players[winnerId]?.name || 'ไม่มีผู้ชนะ';
    if (isWinner) playSound(sounds.win);
    screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
    ui.gameOverTitle.textContent = isWinner ? "🎉 คุณชนะ! 🎉" : "จบเกมแล้ว";
    ui.winnerName.textContent = `ผู้ชนะคือ: ${winnerName}`;
    ui.gameOverMessage.textContent = roomData.reason;
    ui.gameOverNumbersContainer.innerHTML = '';
    Object.values(roomData.players).forEach(player => {
        if (player.connected) {
            const numberBox = document.createElement('div');
            numberBox.className = 'final-number-box';
            numberBox.innerHTML = `<div class="final-number-box-title">${player.name}</div><div class="final-number-display">${player.number || '????'}</div>`;
            ui.gameOverNumbersContainer.appendChild(numberBox);
        }
    });
}

export function updateGameOverUI(roomData) {
    if (roomData.rematch && roomData.rematch[state.currentPlayerId]) {
        ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
        ui.rematchBtn.disabled = true;
    } else {
        ui.rematchBtn.textContent = 'เล่นอีกครั้ง';
        ui.rematchBtn.disabled = false;
    }
}
