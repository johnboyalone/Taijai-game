import { firebase } from './config.js';
import { state, constants } from '../state.js';
import { ui, screens } from '../ui/elements.js';
import { showScreen, showToast, showActionToast } from '../ui/core.js';
import { createNumberPad } from '../ui/eventListeners.js'; // ใช้ createNumberPad จาก eventListeners
import { updateScoreboard, updateCardDisplay } from '../ui/gameScreen.js'; // Import ฟังก์ชันใหม่

const db = firebase.database();

/**
 * ฟังการเปลี่ยนแปลงข้อมูลห้องแบบ Real-time
 */
export function listenToRoomUpdates() {
    const roomRef = db.ref('rooms/' + state.currentRoomId);
    if (state.roomListener) roomRef.off('value', state.roomListener);

    state.roomListener = roomRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);
            showToast("ห้องถูกปิดแล้ว กลับสู่หน้าหลัก");
            setTimeout(() => window.location.reload(), 3000);
            return;
        }
        const roomData = snapshot.val();
        const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);

        // ตรวจสอบ Rematch
        if (roomData.rematch && Object.values(roomData.rematch).filter(v => v === true).length === connectedPlayers.length && connectedPlayers.length > 1) {
            resetGameForRematch(roomData);
            return;
        }

        // แสดง Action Toast
        if (roomData.lastAction && roomData.lastAction.timestamp > (Date.now() - 3000)) {
            const { actorName, targetName, type } = roomData.lastAction;
            let message = '';
            if (type === 'guess') message = `<strong>${actorName}</strong> กำลังทายเลขของ <strong>${targetName}</strong>`;
            else if (type === 'final_correct') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ถูกต้อง!`;
            else if (type === 'final_wrong') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ผิด!`;
            showActionToast(message);
        }

        // จัดการสถานะเกม
        switch(roomData.gameState) {
            case 'waiting':
                updateWaitingRoomUI(roomData);
                break;
            case 'setup':
                if (!screens.game.classList.contains('show')) initializeGameUI(roomData);
                const allPlayersSetNumber = connectedPlayers.every(p => p.numberSet);
                if (allPlayersSetNumber) {
                    db.ref(`rooms/${state.currentRoomId}`).update({
                        gameState: 'playing',
                        turnStartTime: firebase.database.ServerValue.TIMESTAMP
                    });
                }
                break;
            case 'playing':
                updatePlayingUI(roomData);
                break;
            case 'finished':
                if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);
                if (!screens.gameOver.classList.contains('show')) displayGameOver(roomData);
                updateGameOverUI(roomData);
                break;
        }
    });
}

/**
 * อัปเดต UI ในหน้าจอ Waiting Room
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function updateWaitingRoomUI(roomData) {
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
    if (state.currentPlayerId === 'player1') { // เฉพาะ Host ที่สามารถเริ่มเกมได้
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

/**
 * เตรียม UI ของเกมเมื่อเริ่มเล่น
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function initializeGameUI(roomData) {
    showScreen('game');
    const myData = roomData.players[state.currentPlayerId];

    // กำหนดเลขลับของเรา
    if (!myData.numberSet) {
        const ourNumber = generateRandomNumber();
        ui.ourNumberDisplay.innerHTML = '';
        for (let i = 0; i < constants.GUESS_LENGTH; i++) {
            ui.ourNumberDisplay.innerHTML += `<div class="number-input">${ourNumber[i]}</div>`;
        }
        // บันทึกเลขลับของเราลง Firebase
        db.ref(`rooms/${state.currentRoomId}/players/${state.currentPlayerId}`).update({ number: ourNumber.join(''), numberSet: true });
        showToast('เกมเริ่ม! เลขลับของคุณถูกตั้งแล้ว');
    } else {
        // ถ้าเลขถูกตั้งแล้ว ก็แค่แสดง
        ui.ourNumberDisplay.innerHTML = '';
        for (let i = 0; i < constants.GUESS_LENGTH; i++) {
            ui.ourNumberDisplay.innerHTML += `<div class="number-input">${myData.number[i]}</div>`;
        }
    }

    createNumberPad();
    state.currentGuess = []; // รีเซ็ตการทายปัจจุบัน

    // ในโหมดใหม่ ไม่ต้องเลือกเป้าหมายเอง ระบบจะกำหนดให้
    // ดังนั้นจึงไม่ต้องกำหนด state.currentTargetId ที่นี่
    // และไม่ต้องเรียก updatePlayerSummaryGrid() ในตอนนี้
}

/**
 * อัปเดต UI ในหน้าจอเกมหลักตามข้อมูลห้องปัจจุบัน
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function updatePlayingUI(roomData) {
    const myData = roomData.players[state.currentPlayerId];
    const currentTurnId = roomData.turn; // ผู้เล่นที่เป็นเป้าหมายในตานี้

    // ตรวจสอบสถานะการถูกกำจัด
    if (myData.status === 'eliminated') {
        ui.spectatorOverlay.classList.add('show');
        ui.spectatorMessage.textContent = `คุณแพ้แล้ว! กำลังรับชม...`;
    } else {
        ui.spectatorOverlay.classList.remove('show');
    }

    // ตรวจสอบเงื่อนไขจบเกม (สำหรับโหมดธรรมดา)
    // ในโหมดธรรมดา: ถ้าเหลือผู้เล่นที่ 'playing' น้อยกว่าหรือเท่ากับ 1 คน (และมีผู้เล่นเริ่มต้นมากกว่า 1)
    // และเกมยังอยู่ในสถานะ 'playing' ให้จบเกม
    if (roomData.gameMode === 'normal') {
        const activePlayers = Object.values(roomData.players).filter(p => p.status === 'playing' && p.connected);
        if (activePlayers.length <= 1 && roomData.playerCount > 1 && roomData.gameState === 'playing') {
            db.ref(`rooms/${state.currentRoomId}`).update({
                gameState: 'finished',
                winner: activePlayers[0]?.id || null,
                reason: 'เป็นผู้รอดชีวิตคนสุดท้าย!',
                finalScores: null // ในโหมดธรรมดา ไม่มีคะแนนรวม
            });
            return; // ออกจากฟังก์ชัน ไม่ต้องอัปเดต UI ที่เหลือ
        }
    }
    // สำหรับโหมด Arcade เงื่อนไขจบเกมจะถูกจัดการใน gameActions.js หลังจากที่ผู้เล่นทุกคนถูกกำจัด

    // อัปเดตตัวบ่งชี้ตา
    updateTurnIndicator(roomData);

    // อัปเดตประวัติการทาย
    // ในโหมดใหม่ history log จะแสดงประวัติการทายของ "เป้าหมายปัจจุบัน"
    state.currentTargetId = currentTurnId; // กำหนดเป้าหมายของ history log เป็นผู้เล่นที่ถูกทาย
    updateHistoryLog(roomData);

    // อัปเดตจำนวนโอกาส (Final Chances)
    updateChances(myData.finalChances);

    // จัดการตัวจับเวลาตา
    handleTurnTimer(roomData);

    // =================================================================
    // การแสดงผล UI ที่แตกต่างกันตามโหมด
    // =================================================================

    // ซ่อน/แสดง UI เฉพาะโหมด Arcade
    const arcadeElements = document.querySelectorAll('.arcade-only');
    if (roomData.gameMode === 'arcade') {
        arcadeElements.forEach(el => el.style.display = 'block'); // หรือ 'flex' ตามประเภท element
        // อัปเดตตารางคะแนน
        updateScoreboard(roomData);
        // อัปเดตการ์ดช่วยเหลือ
        updateCardDisplay(roomData);
    } else { // Normal Mode
        arcadeElements.forEach(el => el.style.display = 'none');
    }
}

/**
 * อัปเดต UI ในหน้าจอ Game Over
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function updateGameOverUI(roomData) {
    if (roomData.rematch && roomData.rematch[state.currentPlayerId]) {
        ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
        ui.rematchBtn.disabled = true;
    } else {
        ui.rematchBtn.textContent = 'เล่นอีกครั้ง';
        ui.rematchBtn.disabled = false;
    }
}

/**
 * สร้างเลขสุ่ม 4 หลัก
 * @returns {string[]} เลขสุ่ม 4 หลัก
 */
function generateRandomNumber() {
    let result = [];
    for (let i = 0; i < constants.GUESS_LENGTH; i++) {
        result.push(Math.floor(Math.random() * 10).toString());
    }
    return result;
}

/**
 * อัปเดตประวัติการทาย
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function updateHistoryLog(roomData) {
    ui.historyLog.innerHTML = '';
    if (!state.currentTargetId) { ui.historyTargetName.textContent = 'ไม่มี'; return; }
    const targetData = roomData.players[state.currentTargetId];
    ui.historyTargetName.textContent = targetData.name;
    if (!targetData.guesses) return;

    // แปลง guesses object เป็น array และเรียงตาม timestamp (ถ้ามี) หรือ key
    const sortedGuesses = Object.entries(targetData.guesses)
        .map(([key, value]) => ({ ...value, key }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // สมมติว่ามี timestamp ใน guess data

    sortedGuesses.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        let cluesHTML = '';
        if (item.strikes > 0) cluesHTML += `<div class="clue-box clue-strike">${item.strikes}S</div>`;
        if (item.balls > 0) cluesHTML += `<div class="clue-box clue-ball">${item.balls}B</div>`;
        if (item.strikes === 0 && item.balls === 0) cluesHTML = `<div class="clue-box clue-out">OUT</div>`;
        historyItem.innerHTML = `<div class="history-guess">${item.guess}</div><div class="history-clues">${cluesHTML}</div>`;
        ui.historyLog.appendChild(historyItem);
    });
    ui.historyLog.scrollTop = ui.historyLog.scrollHeight;
}

/**
 * อัปเดตจำนวนโอกาสในการทายคำตอบสุดท้าย
 * @param {number} chances - จำนวนโอกาสที่เหลือ
 */
function updateChances(chances) {
    for (let i = 0; i < 3; i++) {
        ui.chanceDots[i].classList.toggle('used', i >= chances);
    }
}

/**
 * อัปเดตตัวบ่งชี้ตาของผู้เล่น
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function updateTurnIndicator(roomData) {
    const currentTurnId = roomData.turn;
    const isMyTurn = currentTurnId === state.currentPlayerId;
    if (isMyTurn && !ui.turnIndicator.classList.contains('my-turn')) {
        // playSound(sounds.turn); // ควร import playSound และ sounds ถ้าจะใช้
    }
    ui.turnIndicator.classList.toggle('my-turn', isMyTurn);
    ui.turnIndicator.classList.toggle('their-turn', !isMyTurn);
    if (isMyTurn) {
        ui.turnText.textContent = "ตาของคุณ (ถูกทาย)";
    } else {
        const turnPlayerName = roomData.players[currentTurnId]?.name || 'เพื่อน';
        ui.turnText.textContent = `ตาของ ${turnPlayerName} (ถูกทาย)`;
    }
}

/**
 * จัดการตัวจับเวลาตาของผู้เล่น
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function handleTurnTimer(roomData) {
    if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);

    const currentTurnId = roomData.turn;
    const isMyTurn = currentTurnId === state.currentPlayerId;
    ui.turnTimerDisplay.textContent = ''; // ล้างตัวเลขเก่าทุกครั้งที่อัปเดต

    // ตัวจับเวลาจะทำงานเฉพาะเมื่อเป็นตาของเป้าหมาย
    if (!isMyTurn) return;

    const turnStartTime = roomData.turnStartTime || Date.now();
    const timePassed = (Date.now() - turnStartTime) / 1000;
    let timeLeft = Math.round(constants.TURN_DURATION - timePassed);

    state.turnTimerInterval = setInterval(() => {
        if (timeLeft >= 0) {
            ui.turnTimerDisplay.textContent = timeLeft; // แสดงตัวเลขเวลา
        }

        if (timeLeft <= 0) {
            clearInterval(state.turnTimerInterval);
            db.ref(`rooms/${state.currentRoomId}/turn`).get().then(snapshot => {
                if (snapshot.val() === state.currentPlayerId) {
                    showToast("หมดเวลา! ข้ามตาอัตโนมัติ");
                    skipTurn();
                }
            });
        }
        timeLeft--;
    }, 1000);
}

/**
 * ข้ามตาปัจจุบัน (เมื่อหมดเวลา)
 */
function skipTurn() {
    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.turn === state.currentPlayerId) {
            const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            roomData.turn = activePlayers[nextTurnIndex];
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            roomData.currentCard = null; // ล้างการ์ดเมื่อข้ามตา
        }
        return roomData;
    });
}

/**
 * แสดงหน้าจอ Game Over
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function displayGameOver(roomData) {
    if (state.turnTimerInterval) clearInterval(state.turnTimerInterval);
    showScreen('gameOver');

    const winnerId = roomData.winner;
    const isWinner = winnerId === state.currentPlayerId;
    const winnerName = roomData.players[winnerId]?.name || 'ไม่มีผู้ชนะ';

    // playSound(isWinner ? sounds.win : sounds.wrong); // ควร import sounds ถ้าจะใช้

    screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
    ui.gameOverTitle.textContent = isWinner ? "🎉 คุณชนะ! 🎉" : "จบเกมแล้ว";
    ui.winnerName.textContent = `ผู้ชนะคือ: ${winnerName}`;
    ui.gameOverMessage.textContent = roomData.reason;

    // แสดงคะแนนสุดท้ายสำหรับโหมด Arcade
    const finalScoresContainer = document.getElementById('final-scores-container');
    if (roomData.gameMode === 'arcade' && roomData.finalScores) {
        finalScoresContainer.style.display = 'block';
        finalScoresContainer.innerHTML = '<h3>คะแนนสุดท้าย:</h3>';
        const sortedScores = Object.values(roomData.finalScores).sort((a, b) => b.score - a.score);
        sortedScores.forEach((player, index) => {
            finalScoresContainer.innerHTML += `<p>${index + 1}. ${player.name}: ${player.score} แต้ม</p>`;
        });
    } else {
        finalScoresContainer.style.display = 'none';
    }

    // แสดงเลขลับของทุกคน
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

/**
 * รีเซ็ตเกมเพื่อเล่นซ้ำ (Rematch)
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
function resetGameForRematch(roomData) {
    showToast("เริ่มเกมใหม่อีกครั้ง!");
    const updates = {};
    updates[`rooms/${state.currentRoomId}/gameState`] = 'setup';
    updates[`rooms/${state.currentRoomId}/turn`] = roomData.turnOrder[0];
    updates[`rooms/${state.currentRoomId}/winner`] = null;
    updates[`rooms/${state.currentRoomId}/reason`] = null;
    updates[`rooms/${state.currentRoomId}/rematch`] = {};
    updates[`rooms/${state.currentRoomId}/lastAction`] = null;
    updates[`rooms/${state.currentRoomId}/turnStartTime`] = firebase.database.ServerValue.TIMESTAMP;
    updates[`rooms/${state.currentRoomId}/currentCard`] = null; // ล้างการ์ด
    updates[`rooms/${state.currentRoomId}/finalScores`] = null; // ล้างคะแนนรวม

    Object.keys(roomData.players).forEach(playerId => {
        if (roomData.players[playerId].connected) {
            updates[`rooms/${state.currentRoomId}/players/${playerId}/numberSet`] = false;
            updates[`rooms/${state.currentRoomId}/players/${playerId}/finalChances`] = 3;
            updates[`rooms/${state.currentRoomId}/players/${playerId}/status`] = 'playing';
            updates[`rooms/${state.currentRoomId}/players/${playerId}/guesses`] = null;
            updates[`rooms/${state.currentRoomId}/players/${playerId}/score`] = 0; // รีเซ็ตคะแนน
        }
    });
    db.ref().update(updates);
}
