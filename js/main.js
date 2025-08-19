import { ref, set, get, update, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import { db, auth, signInAnonymouslyHandler, onAuthStateChangedHandler, createRoom, joinRoom, listenToRoomList, detachRoomListListener, verifyPassword, listenToRoomUpdates, detachRoomListener, setupDisconnectHandler, cancelDisconnectHandler } from './firebase.js';
import { screens, ui, showScreen, showToast, showActionToast, updateWaitingRoomUI, updateGuessDisplay, updateChances, updateTurnIndicator, updateHistoryLog, updatePlayerSummaryGrid, displayGameOver, updateGameOverUI } from './ui.js';
import { GUESS_LENGTH, TURN_DURATION, createNumberPad, generateRandomNumber, submitGuess, submitFinalAnswer, skipTurn, requestRematch, resetGameForRematch } from './game.js';

let currentRoomId = null;
let joiningRoomData = null;
let currentPlayerId = null;
let currentTargetId = null;
let roomListenerData = null;
let roomListListenerData = null;
let currentGuess = [];
let isMuted = false;
let turnTimerInterval = null;
let lastGameState = null;

const sounds = {
    background: null,
    click: null,
    win: null,
    wrong: null,
    turn: null
};

function initializeSounds() {
    try {
        sounds.background = new Audio('sounds/background-music.mp3');
        sounds.click = new Audio('sounds/click.mp3');
        sounds.win = new Audio('sounds/win-wow.mp3');
        sounds.wrong = new Audio('sounds/wrong-answer.mp3');
        sounds.turn = new Audio('sounds/your-turn.mp3');
        
        setupAudio();
    } catch (error) {
        console.log("Sound files not found, running without audio");
    }
}

function setupAudio() {
    if (sounds.background) {
        sounds.background.loop = true;
        sounds.background.volume = 0.3;
    }
    if (sounds.turn) {
        sounds.turn.volume = 0.7;
    }
}

function playSound(sound) {
    if (isMuted || !sound) return;
    try {
        sound.currentTime = 0;
        sound.play().catch(error => console.log(`Error playing sound: ${error.message}`));
    } catch (error) {
        console.log(`Sound error: ${error.message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSounds();
    setupInitialListeners();
    onAuthStateChangedHandler(user => {
        if (user) {
            showScreen('splash');
        } else {
            signInAnonymouslyHandler().catch(error => {
                console.error("Failed to sign in:", error);
                showToast("ไม่สามารถเชื่อมต่อได้ กรุณารีโหลดหน้า");
            });
        }
    });
});

function setupInitialListeners() {
    screens.splash.addEventListener('click', handleSplashClick);
    ui.soundControl.addEventListener('click', toggleMute);
    ui.goToCreateBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('createRoom'); });
    ui.goToJoinBtn.addEventListener('click', handleGoToJoin);
    ui.confirmCreateBtn.addEventListener('click', handleCreateRoom);
    ui.passwordModal.addEventListener('click', (e) => { 
        if (e.target === ui.passwordModal) ui.passwordModal.classList.remove('show'); 
    });
    ui.passwordModalSubmitBtn.addEventListener('click', handlePasswordSubmit);
    ui.confirmJoinBtn.addEventListener('click', handleConfirmJoin);
    ui.startGameBtn.addEventListener('click', handleStartGame);
    ui.submitFinalAnswerBtn.addEventListener('click', handleFinalAnswer);
    ui.rematchBtn.addEventListener('click', handleRematch);
    ui.backToLobbyBtn.addEventListener('click', () => window.location.reload());
    createNumberPad(handleNumberPadClick);
}

function handleSplashClick() {
    playSound(sounds.click);
    showScreen('lobby');
    if (sounds.background && sounds.background.paused && !isMuted) {
        sounds.background.play().catch(e => console.log("Autoplay was prevented."));
    }
}

function toggleMute() {
    isMuted = !isMuted;
    ui.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    if (isMuted && sounds.background) {
        sounds.background.pause();
    } else if (sounds.background) {
        sounds.background.play().catch(e => console.log("Autoplay was prevented."));
    }
    playSound(sounds.click);
}

function handleGoToJoin() {
    playSound(sounds.click);
    showScreen('roomList');
    if (roomListListenerData) detachRoomListListener(roomListListenerData);
    roomListListenerData = listenToRoomList(rooms => {
        ui.roomListContent.innerHTML = '';
        if (rooms.length === 0) {
            ui.roomListContent.innerHTML = '<p class="no-rooms-message">ยังไม่มีห้องว่างในขณะนี้...</p>';
            return;
        }
        rooms.forEach(room => {
            const playerCount = room.playerCount || 0;
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            roomItem.innerHTML = `
                <div class="room-info">
                    <div class="room-name">${room.roomName}</div>
                    <div class="host-name">สร้างโดย: ${room.hostName}</div>
                </div>
                <div class="room-status">${playerCount} / 4</div>
            `;
            roomItem.addEventListener('click', () => handleRoomItemClick(room, playerCount));
            ui.roomListContent.appendChild(roomItem);
        });
    });
}

function handleRoomItemClick(room, playerCount) {
    playSound(sounds.click);
    if (playerCount >= 4) {
        showToast("ห้องนี้เต็มแล้ว");
        return;
    }
    ui.passwordModalRoomName.textContent = `ห้อง: ${room.roomName}`;
    ui.passwordModal.dataset.roomId = room.id;
    ui.passwordModal.dataset.roomName = room.roomName;
    ui.passwordModal.classList.add('show');
}

async function handleCreateRoom() {
    playSound(sounds.click);
    const hostName = ui.hostNameInput.value.trim();
    const roomName = ui.newRoomNameInput.value.trim();
    const password = ui.newRoomPasswordInput.value;

    if (!hostName || !roomName || !/^\d{4}$/.test(password)) {
        showToast('กรุณากรอกข้อมูลให้ครب (รหัสผ่าน 4 ตัวเลข)');
        return;
    }

    try {
        const { newRoomId, newPlayerId } = await createRoom(hostName, roomName, password);
        currentRoomId = newRoomId;
        currentPlayerId = newPlayerId;
        startListeningToRoomUpdates();
        showScreen('waiting');
        showToast(`สร้างห้อง "${roomName}" สำเร็จ!`);
    } catch (error) {
        console.error("Create room error:", error);
        showToast('เกิดข้อผิดพลาด: ' + error.message);
    }
}

async function handlePasswordSubmit() {
    playSound(sounds.click);
    const roomId = ui.passwordModal.dataset.roomId;
    const roomName = ui.passwordModal.dataset.roomName;
    const enteredPassword = ui.passwordModalInput.value;

    try {
        const isCorrect = await verifyPassword(roomId, enteredPassword);
        if (isCorrect) {
            ui.passwordModalInput.value = '';
            ui.passwordModal.classList.remove('show');
            joiningRoomData = { id: roomId, name: roomName };
            ui.joinerRoomNameDisplay.textContent = roomName;
            showScreen('joinerSetup');
        } else {
            showToast('รหัสผ่านไม่ถูกต้อง!');
        }
    } catch (error) {
        console.error("Password verification error:", error);
        showToast('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    }
}

async function handleConfirmJoin() {
    playSound(sounds.click);
    const joinerName = ui.joinerNameInput.value.trim();
    if (!joinerName) {
        showToast('กรุณากรอกชื่อของคุณ');
        return;
    }

    if (roomListListenerData) detachRoomListListener(roomListListenerData);

    try {
        const { newRoomId, newPlayerId } = await joinRoom(joiningRoomData.id, joinerName);
        currentRoomId = newRoomId;
        currentPlayerId = newPlayerId;
        startListeningToRoomUpdates();
        showScreen('waiting');
        showToast(`เข้าร่วมห้องสำเร็จ!`);
    } catch (error) {
        console.error("Join room error:", error);
        showToast(error.message);
        showScreen('lobby');
    }
}

async function handleStartGame() {
    playSound(sounds.click);
    if (ui.startGameBtn.disabled) return;

    try {
        await update(ref(db, `rooms/${currentRoomId}`), {
            gameState: 'setup',
            turnStartTime: serverTimestamp()
        });

        // Get current room data to set turn order
        const snapshot = await get(ref(db, `rooms/${currentRoomId}`));
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            const connectedPlayerIds = Object.keys(roomData.players).filter(pId => roomData.players[pId].connected);
            
            await update(ref(db, `rooms/${currentRoomId}`), {
                turnOrder: connectedPlayerIds,
                turn: connectedPlayerIds[0],
                lastAction: null
            });
        }
    } catch (error) {
        console.error("Start game error:", error);
        showToast('ไม่สามารถเริ่มเกมได้');
    }
}

function handleNumberPadClick(value) {
    playSound(sounds.click);
    if (ui.turnIndicator.classList.contains('their-turn')) {
        showToast("ยังไม่ถึงตาของคุณ!");
        return;
    }
    if (value === 'ลบ') {
        if (currentGuess.length > 0) currentGuess.pop();
    } else if (value === 'ทาย') {
        if (!currentTargetId) { 
            showToast("กรุณาเลือกเป้าหมายที่จะทายก่อน"); 
            return; 
        }
        if (currentGuess.length === GUESS_LENGTH) {
            submitGuess(currentRoomId, currentPlayerId, currentTargetId, currentGuess);
            currentGuess = [];
        } else {
            showToast(`กรุณาใส่เลขให้ครบ ${GUESS_LENGTH} ตัว`);
        }
    } else {
        if (currentGuess.length < GUESS_LENGTH) currentGuess.push(value);
    }
    updateGuessDisplay(currentGuess, GUESS_LENGTH);
}

function handleFinalAnswer() {
    playSound(sounds.click);
    if (ui.turnIndicator.classList.contains('their-turn')) { 
        showToast("ไม่สามารถส่งคำตอบในตาของเพื่อนได้!"); 
        return; 
    }
    if (!currentTargetId) { 
        showToast("กรุณาเลือกเป้าหมายที่จะส่งคำตอบสุดท้าย"); 
        return; 
    }
    if (currentGuess.length !== GUESS_LENGTH) { 
        showToast(`กรุณาใส่เลขคำตอบให้ครบ ${GUESS_LENGTH} ตัว`); 
        return; 
    }

    submitFinalAnswer(currentRoomId, currentPlayerId, currentTargetId, currentGuess, playSound, sounds.wrong);
    currentGuess = [];
    updateGuessDisplay(currentGuess, GUESS_LENGTH);
}

function handleRematch() {
    playSound(sounds.click);
    ui.rematchBtn.disabled = true;
    ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
    requestRematch(currentRoomId, currentPlayerId);
}

function handleTargetSelection(selectedTargetId) {
    playSound(sounds.click);
    currentTargetId = selectedTargetId;
    get(ref(db, `rooms/${currentRoomId}`)).then(snapshot => {
        if(snapshot.exists()) {
            const roomData = snapshot.val();
            updatePlayerSummaryGrid(roomData, currentPlayerId, { 
                currentTargetId: currentTargetId, 
                handler: handleTargetSelection 
            });
            updateHistoryLog(roomData, currentTargetId);
        }
    }).catch(error => {
        console.error("Error getting room data:", error);
    });
}

function startListeningToRoomUpdates() {
    if (roomListenerData) detachRoomListener(roomListenerData);
    setupDisconnectHandler(currentRoomId, currentPlayerId);
    
    roomListenerData = listenToRoomUpdates(currentRoomId, (roomData) => {
        if (!roomData) {
            if (turnTimerInterval) clearInterval(turnTimerInterval);
            cancelDisconnectHandler(currentRoomId, currentPlayerId);
            showToast("ห้องถูกปิดแล้ว กลับสู่หน้าหลัก");
            setTimeout(() => window.location.reload(), 3000);
            return;
        }

        if (lastGameState !== roomData.gameState) {
            if (turnTimerInterval) clearInterval(turnTimerInterval);
            lastGameState = roomData.gameState;
        }

        const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);
        if (roomData.rematch && Object.values(roomData.rematch).filter(v => v === true).length === connectedPlayers.length && connectedPlayers.length > 1) {
            if (currentPlayerId === 'player1') {
                resetGameForRematch(currentRoomId, roomData);
            }
            return;
        }

        if (roomData.lastAction && roomData.lastAction.timestamp > (Date.now() - 4000)) {
            const { actorName, targetName, type } = roomData.lastAction;
            let message = '';
            if (type === 'guess') message = `<strong>${actorName}</strong> กำลังทายเลขของ <strong>${targetName}</strong>`;
            else if (type === 'final_correct') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ถูกต้อง!`;
            else if (type === 'final_wrong') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ผิด!`;
            if(message) showActionToast(message);
        }

        switch (roomData.gameState) {
            case 'waiting':
                showScreen('waiting');
                updateWaitingRoomUI(roomData, currentPlayerId);
                break;
            case 'setup':
                if (!screens.game.classList.contains('show')) initializeGameUI(roomData);
                const allPlayersSetNumber = connectedPlayers.every(p => p.numberSet);
                if (allPlayersSetNumber && currentPlayerId === 'player1') {
                    update(ref(db, `rooms/${currentRoomId}`), {
                        gameState: 'playing',
                        turnStartTime: serverTimestamp()
                    }).catch(error => console.error("Error updating game state:", error));
                }
                break;
            case 'playing':
                if (!screens.game.classList.contains('show')) showScreen('game');
                updatePlayingUI(roomData);
                break;
            case 'finished':
                if (!screens.gameOver.classList.contains('show')) {
                    displayGameOver(roomData, currentPlayerId, playSound, sounds.win);
                }
                updateGameOverUI(roomData, currentPlayerId);
                break;
        }
    });
}

function initializeGameUI(roomData) {
    showScreen('game');
    currentGuess = [];
    updateGuessDisplay(currentGuess, GUESS_LENGTH);
    ui.historyLog.innerHTML = '';

    const ourNumber = generateRandomNumber();
    ui.ourNumberDisplay.innerHTML = '';
    for (let i = 0; i < GUESS_LENGTH; i++) {
        ui.ourNumberDisplay.innerHTML += `<div class="number-input">${ourNumber[i]}</div>`;
    }

    const firstTarget = roomData.turnOrder.find(id => id !== currentPlayerId && roomData.players[id]?.status === 'playing');
    currentTargetId = firstTarget || null;

    set(ref(db, `rooms/${currentRoomId}/players/${currentPlayerId}/number`), ourNumber.join(''))
        .then(() => {
            return set(ref(db, `rooms/${currentRoomId}/players/${currentPlayerId}/numberSet`), true);
        })
        .catch(error => {
            console.error("Error setting player number:", error);
        });
    
    showToast('เกมเริ่มแล้ว! กรุณารอผู้เล่นทุกคนตั้งเลข...', 3000);
}

function updatePlayingUI(roomData) {
    const myData = roomData.players[currentPlayerId];
    if (myData.status === 'eliminated') {
        ui.spectatorOverlay.classList.add('show');
        ui.spectatorMessage.textContent = `คุณแพ้แล้ว! กำลังรับชม...`;
    } else {
        ui.spectatorOverlay.classList.remove('show');
    }

    const activePlayers = Object.values(roomData.players).filter(p => p.status === 'playing' && p.connected);
    if (activePlayers.length <= 1 && roomData.playerCount > 1 && roomData.gameState === 'playing') {
        if (currentPlayerId === 'player1') {
            const winnerId = Object.keys(roomData.players).find(pId => 
                roomData.players[pId].status === 'playing' && roomData.players[pId].connected
            );
            
            update(ref(db, `rooms/${currentRoomId}`), {
                gameState: 'finished',
                winner: winnerId,
                reason: 'เป็นผู้รอดชีวิตคนสุดท้าย!'
            }).catch(error => console.error("Error finishing game:", error));
        }
        return;
    }

    updateTurnIndicator(roomData, currentPlayerId, playSound, sounds.turn);
    updatePlayerSummaryGrid(roomData, currentPlayerId, { 
        currentTargetId: currentTargetId, 
        handler: handleTargetSelection 
    });
    updateHistoryLog(roomData, currentTargetId);
    updateChances(myData.finalChances);
    handleTurnTimer(roomData);
}

function handleTurnTimer(roomData) {
    if (turnTimerInterval) clearInterval(turnTimerInterval);
    ui.turnTimerDisplay.textContent = '';

    if (roomData.turn !== currentPlayerId) return;

    const turnStartTime = roomData.turnStartTime || Date.now();

    const updateTimer = () => {
        const timePassed = (Date.now() - turnStartTime) / 1000;
        let timeLeft = Math.round(TURN_DURATION - timePassed);

        if (timeLeft >= 0) {
            ui.turnTimerDisplay.textContent = timeLeft;
        } else {
            clearInterval(turnTimerInterval);
            get(ref(db, `rooms/${currentRoomId}/turn`)).then(snapshot => {
                if (snapshot.exists() && snapshot.val() === currentPlayerId) {
                    showToast("หมดเวลา! ข้ามตาอัตโนมัติ");
                    skipTurn(currentRoomId, currentPlayerId);
                }
            }).catch(error => {
                console.error("Error checking turn:", error);
            });
        }
    };

    updateTimer();
    turnTimerInterval = setInterval(updateTimer, 1000);
}