// js/ui/gameScreen.js
import { ui } from './elements.js';
import { state, constants } from '../state.js';

/**
 * อัปเดตการแสดงผลตารางคะแนน (Scoreboard)
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
export function updateScoreboard(roomData) {
    const players = Object.values(roomData.players);
    const sortedPlayers = players
        .filter(p => p.connected)
        .sort((a, b) => b.score - a.score);

    let scoreboardHTML = '';
    sortedPlayers.forEach(player => {
        scoreboardHTML += `
            <div class="scoreboard-player">
                <span class="scoreboard-name">${player.name}</span>
                <span class="scoreboard-score">${player.score} แต้ม</span>
            </div>
        `;
    });
    ui.scoreboardContent.innerHTML = scoreboardHTML;
}

/**
 * อัปเดตการแสดงผลการ์ดช่วยเหลือ
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
export function updateCardDisplay(roomData) {
    const currentCard = roomData.currentCard;
    const isMyTurnAsTarget = roomData.turn === state.currentPlayerId;

    if (isMyTurnAsTarget && currentCard) {
        // ถ้าเป็นตาเราและมีการ์ด
        ui.cardContent.innerHTML = `
            <div class="card-item">
                <h4 class="card-name">${currentCard.name}</h4>
                <p class="card-description">${currentCard.description}</p>
            </div>
        `;
    } else {
        // ถ้าไม่ใช่ตาเรา หรือไม่มีการ์ด
        ui.cardContent.innerHTML = `<p class="no-card-text">เฉพาะคนที่เป็นเป้าหมายเท่านั้นที่จะได้รับการ์ด</p>`;
    }
}

/**
 * อัปเดตประวัติการทาย (History Log)
 * @param {object} roomData - ข้อมูลห้องปัจจุบัน
 */
export function updateHistoryLog(roomData) {
    ui.historyLog.innerHTML = '';
    if (!state.currentTargetId) {
        ui.historyTargetName.textContent = 'ไม่มี';
        return;
    }
    const targetData = roomData.players[state.currentTargetId];
    ui.historyTargetName.textContent = targetData.name;
    if (!targetData.guesses) return;

    const sortedGuesses = Object.values(targetData.guesses).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    sortedGuesses.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        // สร้าง HTML สำหรับ Clues
        let cluesHTML = '';
        if (item.strikes > 0) cluesHTML += `<div class="clue-box clue-strike">${item.strikes}S</div>`;
        if (item.balls > 0) cluesHTML += `<div class="clue-box clue-ball">${item.balls}B</div>`;
        if (item.strikes === 0 && item.balls === 0) cluesHTML = `<div class="clue-box clue-out">OUT</div>`;

        // สร้าง HTML สำหรับชื่อผู้ทาย
        const guesserName = item.byName || 'ผู้เล่น';

        historyItem.innerHTML = `
            <div class="history-guess-info">
                <span class="history-guesser-name">${guesserName}:</span>
                <span class="history-guess">${item.guess}</span>
            </div>
            <div class="history-clues">${cluesHTML}</div>
        `;
        ui.historyLog.appendChild(historyItem);
    });
    ui.historyLog.scrollTop = ui.historyLog.scrollHeight;
}

/**
 * อัปเดตการแสดงผลจำนวนโอกาสที่เหลือ
 * @param {number} chances - จำนวนโอกาส
 */
export function updateChances(chances) {
    for (let i = 0; i < 3; i++) {
        ui.chanceDots[i].classList.toggle('used', i >= chances);
    }
}

/**
 * อัปเดตการแสดงผลตัวเลขที่กำลังทาย
 */
export function updateGuessDisplay() {
    const guessInputs = ui.guessNumberContainer.children;
    for (let i = 0; i < constants.GUESS_LENGTH; i++) {
        guessInputs[i].textContent = state.currentGuess[i] || '';
    }
}
