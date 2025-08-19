import { db, auth, signInAnonymously, onAuthStateChanged, createRoom, joinRoom, listenToRoomList, detachRoomListListener, verifyPassword, listenToRoomUpdates, detachRoomListener, setupDisconnectHandler, cancelDisconnectHandler } from './firebase.js';
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
let hasSignedIn = false;

const sounds = {
    background: new Audio('../sounds/background-music.mp3'),
    click: new Audio('../sounds/click.mp3'),
    win: new Audio('../sounds/win-wow.mp3'),
    wrong: new Audio('../sounds/wrong-answer.mp3'),
    turn: new Audio('../sounds/your-turn.mp3')
};

function setupAudio() {
    sounds.background.loop = true;
    sounds.background.volume = 0.3;
    sounds.turn.volume = 0.7;
}

function playSound(sound) {
    if (isMuted) return;
    sound.currentTime = 0;
    sound.play().catch(e => console.error("Error playing sound:", e));
}

function stopSound(sound) {
    sound.pause();
    sound.currentTime = 0;
}

function toggleMute() {
    isMuted = !isMuted;
    ui.muteBtn.textContent = isMuted ? '🔇' : '🔊';
    if (isMuted) {
        stopSound(sounds.background);
    } else {
        playSound(sounds.background);
    }
}

function handleGoToCreate() {
    playSound(sounds.click);
    showScreen('createRoom');
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
            roomItem.innerHTML = `<div class="room-info"><div class="room-name">${room.roomName}</div><div class="host-name">สร้างโดย: ${room.hostName}</div></div><div class="room-status">${playerCount} / 4</div>`;
            roomItem.addEventListener('click', () => handleRoomItemClick(room, playerCount));
            ui.roomListContent.appendChild(roomItem);
        });
    });
}

function handleRoomItemClick(room, playerCount) {
    playSound(sounds.click);
    if (playerCount >= 4) {
        showToast('ห้องเต็มแล้ว');
        return;
    }

    if (room.password) {
        joiningRoomData = room;
        ui.passwordModalRoomName.textContent = room.roomName;
        ui.passwordModal.style.display = 'flex';
    } else {
        joiningRoomData = room;
        showScreen('joinerSetup');
        ui.joinerRoomNameDisplay.textContent = room.roomName;
    }
}

async function handlePasswordSubmit() {
    playSound(sounds.click);
    const password = ui.passwordModalInput.value;
    const isCorrect = await verifyPassword(joiningRoomData.id, password);
    if (isCorrect) {
        ui.passwordModal.style.display = 'none';
        ui.passwordModalInput.value = '';
        showScreen('joinerSetup');
        ui.joinerRoomNameDisplay.textContent = joiningRoomData.roomName;
    } else {
        showToast('รหัสผ่านไม่ถูกต้อง');
    }
}

async function handleConfirmCreate() {
    playSound(sounds.click);
    const hostName = ui.hostNameInput.value.trim();
    const roomName = ui.newRoomNameInput.value.trim();
    const password = ui.newRoomPasswordInput.value.trim();
    if (!hostName || !roomName) {
        showToast('กรุณากรอกชื่อและชื่อห้อง');
        return;
    }

    try {
        const { newRoomId, newPlayerId } = await createRoom(hostName, roomName, password);
        currentRoomId = newRoomId;
        currentPlayerId = newPlayerId;
        setupDisconnectHandler(currentRoomId, currentPlayerId);
        startListeningToRoomUpdates();
        showScreen('waiting');
        showToast(`สร้างห้อง ${roomName} สำเร็จ!`);
    } catch (error) {
        console.error("Create room failed:", error);
        showToast("ไม่สามารถสร้างห้องได้");
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
        setupDisconnectHandler(currentRoomId, currentPlayerId);
        startListeningToRoomUpdates();
        showScreen('waiting');
        showToast(`เข้าร่วมห้องสำเร็จ!`);
    } catch (error) {
        console.error("Join room failed:", error);
        showToast(error.message);
        showScreen('lobby');
    }
}

function handleReadyBtn() {
    playSound(sounds.click);
    db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ numberSet: true });
}

function handleStartBtn() {
    playSound(sounds.click);
    db.ref(`rooms/${currentRoomId}`).update({
        gameState: 'playing',
        turn: 'player1',
        turnStartTime: firebase.database.ServerValue.TIMESTAMP
    });
}

function handleNumberPadClick(event) {
    playSound(sounds.click);
    const value = event.target.dataset.value;
    if (!value) return;

    if (value === 'ทาย') {
        const myData = roomListenerData?.data?.players[currentPlayerId];
        if (myData?.status === 'playing') {
            submitGuess(currentRoomId, currentPlayerId, currentGuess);
            currentGuess = [];
            updateGuessDisplay(currentGuess);
        } else {
            submitFinalAnswer(currentRoomId, currentPlayerId, currentGuess, currentTargetId);
            currentGuess = [];
            updateGuessDisplay(currentGuess);
        }
        return;
    }
    
    if (value === 'ลบ') {
        currentGuess.pop();
    } else {
        if (currentGuess.length < GUESS_LENGTH) {
            currentGuess.push(value);
        } else {
            showToast('เกินจำนวนที่กำหนด');
        }
    }
    updateGuessDisplay(currentGuess);
}

function handleTargetSelection(targetId) {
    playSound(sounds.click);
    currentTargetId = targetId;
    updatePlayerSummaryGrid(roomListenerData.data, currentPlayerId, { currentTargetId: currentTargetId, handler: handleTargetSelection });
    updateHistoryLog(roomListenerData.data, currentTargetId);
    showActionToast(`กำลังจะทายตัวเลขของ ${roomListenerData.data.players[targetId].name}`);
}

function handleSkipTurn() {
    playSound(sounds.click);
    skipTurn(currentRoomId, currentPlayerId);
}

function handleRematchBtn() {
    playSound(sounds.click);
    requestRematch(currentRoomId, currentPlayerId);
}

function startListeningToRoomUpdates() {
    if (roomListenerData) detachRoomListener(roomListenerData);
    roomListenerData = listenToRoomUpdates(currentRoomId, roomData => {
        if (!roomData) {
            console.log("Room deleted or doesn't exist. Redirecting to lobby.");
            showScreen('lobby');
            return;
        }

        roomListenerData.data = roomData;
        const myData = roomData.players[currentPlayerId];
        
        if (roomData.gameState !== lastGameState) {
            stopSound(sounds.background);
            if (roomData.gameState === 'playing') {
                showScreen('game');
                createNumberPad(handleNumberPadClick);
            } else if (roomData.gameState === 'finished') {
                displayGameOver(roomData, currentPlayerId, playSound, sounds.win);
                updateGameOverUI(roomData, currentPlayerId);
            }
        }
        lastGameState = roomData.gameState;
        
        switch (roomData.gameState) {
            case 'waiting':
                updateWaitingRoomUI(roomData, currentPlayerId);
                break;
            case 'playing':
                handleGameUpdate(roomData);
                break;
            case 'finished':
                if (roomData.rematch) {
                    const allRematch = Object.keys(roomData.rematch).length === roomData.playerCount;
                    if (allRematch) {
                        resetGameForRematch(currentRoomId, roomData);
                    }
                }
                break;
        }
    });
}

function handleGameUpdate(roomData) {
    const myData = roomData.players[currentPlayerId];
    const activePlayers = Object.keys(roomData.players).filter(pId => roomData.players[pId].status === 'playing');

    if (myData?.status === 'eliminated') {
        showActionToast("คุณถูกกำจัดออกจากเกมแล้ว");
        showScreen('waiting');
        if (turnTimerInterval) clearInterval(turnTimerInterval);
        return;
    }

    if (activePlayers.length <= 1) {
        if (myData?.status === 'playing') {
            db.ref(`rooms/${currentRoomId}`).update({
                gameState: 'finished',
                winner: activePlayers[0]?.uid || null,
                reason: 'เป็นผู้รอดชีวิตคนสุดท้าย!'
            });
        }
        return;
    }

    updateTurnIndicator(roomData, currentPlayerId, playSound, sounds.turn);
    updatePlayerSummaryGrid(roomData, currentPlayerId, { currentTargetId: currentTargetId, handler: handleTargetSelection });
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
            db.ref(`rooms/${currentRoomId}/turn`).get().then(snapshot => {
                if (snapshot.val() === currentPlayerId) {
                    showToast("หมดเวลา! ข้ามตาอัตโนมัติ");
                    skipTurn(currentRoomId, currentPlayerId);
                }
            });
        }
    };

    updateTimer();
    turnTimerInterval = setInterval(updateTimer, 1000);
}

function handleResetApp() {
    if (roomListenerData) detachRoomListener(roomListenerData);
    if (roomListListenerData) detachRoomListListener(roomListListenerData);
    if (turnTimerInterval) clearInterval(turnTimerInterval);
    currentRoomId = null;
    joiningRoomData = null;
    currentPlayerId = null;
    currentTargetId = null;
    currentGuess = [];
    lastGameState = null;
    showScreen('lobby');
}

// โค้ดที่แก้ไข
document.addEventListener('DOMContentLoaded', () => {
    // โหลดหน้าจอ splash เป็นอันดับแรกเสมอ
    showScreen('splash');
    
    // เริ่มกระบวนการล็อกอินแบบไม่ระบุตัวตน
    signInAnonymously().then(() => {
        // เมื่อล็อกอินสำเร็จ ค่อยกำหนด Event Listeners และเปลี่ยนหน้าจอ
        onAuthStateChanged(user => {
            if (user && !hasSignedIn) {
                hasSignedIn = true;
                setupAudio();
                ui.goToCreateBtn.addEventListener('click', handleGoToCreate);
                ui.goToJoinBtn.addEventListener('click', handleGoToJoin);
                ui.confirmCreateBtn.addEventListener('click', handleConfirmCreate);
                ui.passwordModalSubmitBtn.addEventListener('click', handlePasswordSubmit);
                ui.confirmJoinBtn.addEventListener('click', handleConfirmJoin);
                ui.readyBtn.addEventListener('click', handleReadyBtn);
                ui.startBtn.addEventListener('click', handleStartBtn);
                ui.skipTurnBtn.addEventListener('click', handleSkipTurn);
                ui.rematchBtn.addEventListener('click', handleRematchBtn);
                ui.muteBtn.addEventListener('click', toggleMute);

                showScreen('lobby');
            }
        });
    }).catch(error => {
        console.error("Failed to sign in anonymously:", error);
        showToast("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่");
    });
});