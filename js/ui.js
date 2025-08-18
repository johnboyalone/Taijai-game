// js/ui.js

// ... (โค้ดเดิมทั้งหมด) ...

export function showToast(message) {
    // ... (โค้ดเดิม) ...
}

// (เพิ่มใหม่) ฟังก์ชันสำหรับอัปเดตหน้า Waiting Room
export function updateWaitingRoomUI(roomData, currentPlayerId) {
    if (!roomData) return;

    ui.roomCodeText.textContent = roomData.roomName;
    const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);

    // อัปเดตรายชื่อผู้เล่น
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

    // เปิด/ปิดปุ่ม "เริ่มเกม" สำหรับ Host
    if (currentPlayerId === 'player1') { // player1 คือ Host เสมอ
        const canStart = connectedPlayers.length >= 2;
        ui.startGameBtn.disabled = !canStart;
        ui.waitingMessage.textContent = canStart 
            ? `มีผู้เล่น ${connectedPlayers.length} คนแล้ว เริ่มเกมได้เลย!`
            : 'รอผู้เล่นอย่างน้อย 2 คนเพื่อเริ่มเกม...';
    } else {
        ui.startGameBtn.disabled = true;
        ui.waitingMessage.textContent = 'รอเจ้าของห้องเริ่มเกม...';
    }
}
