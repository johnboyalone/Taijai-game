import { db, auth, signInAnonymously, onAuthStateChanged, createRoom, joinRoom, listenToRoomList, detachRoomListListener, verifyPassword, listenToRoomUpdates, detachRoomListener, setupDisconnectHandler, cancelDisconnectHandler, isFirebaseConnected } from './firebase.js';
import { screens, ui, showScreen, showToast, showActionToast, updateWaitingRoomUI, updateGuessDisplay, updateChances, updateTurnIndicator, updateHistoryLog, updatePlayerSummaryGrid, displayGameOver, updateGameOverUI, setupAccessibility } from './ui.js';
import { GUESS_LENGTH, TURN_DURATION, MAX_CHANCES, createNumberPad, generateRandomNumber, submitGuess, submitFinalAnswer, skipTurn, requestRematch, resetGameForRematch, isValidGuess, isGameFinished } from './game.js';

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

// ตัวแปรสำหรับจัดการการเชื่อมต่อ
let isOnline = true;
let connectionCheckInterval = null;

function setupAudio() {
    sounds.background.loop = true;
    sounds.background.volume = 0.3;
    sounds.turn.volume = 0.7;
}

function playSound(sound) {
    if (isMuted || !sound) return;
    sound.currentTime = 0;
    sound.play().catch(error => {
        console.log(`Error playing sound: ${error.message}`);
        showToast("ไม่สามารถเล่นเสียงได้ กรุณาคลิกเพื่อเปิดเสียง");
    });
}

function setupConnectionMonitoring() {
    // ตรวจสอบการเชื่อมต่อทุก 5 วินาที
    if (connectionCheckInterval) clearInterval(connectionCheckInterval);
    
    connectionCheckInterval = setInterval(() => {
        const wasOnline = isOnline;
        isOnline = isFirebaseConnected();
        
        if (wasOnline && !isOnline) {
            showToast("การเชื่อมต่ออินเทอร์เน็ตถูกตัดขาด");
            if (currentRoomId && currentPlayerId) {
                showScreen('lobby');
                handleResetApp();
            }
        } else if (!wasOnline && isOnline) {
            showToast("การเชื่อมต่ออินเทอร์เน็ตกลับมาแล้ว");
            if (!hasSignedIn) {
                signInAnonymously();
            }
        }
    }, 5000);
}

function handleResetApp() {
    if (roomListenerData) {
        detachRoomListener(roomListenerData);
        roomListenerData = null;
    }
    
    if (roomListListenerData) {
        detachRoomListListener(roomListListenerData);
        roomListListenerData = null;
    }
    
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }
    
    if (currentRoomId && currentPlayerId) {
        cancelDisconnectHandler(currentRoomId, currentPlayerId);
    }
    
    currentRoomId = null;
    joiningRoomData = null;
    currentPlayerId = null;
    currentTargetId = null;
    currentGuess = [];
    lastGameState = null;
    
    // รีเซ็ต UI
    if (ui.ourNumberDisplay) ui.ourNumberDisplay.innerHTML = '';
    if (ui.playerSummaryGrid) ui.playerSummaryGrid.innerHTML = '';
    if (ui.historyLog) ui.historyLog.innerHTML = '';
    
    showScreen('lobby');
}

document.addEventListener('DOMContentLoaded', () => {
    setupAccessibility();
    setupAudio();
    setupInitialListeners();
    setupConnectionMonitoring();
    
    // เริ่มต้นด้วย splash screen
    showScreen('splash');
    
    // ตรวจสอบการเชื่อมต่อ
    if (!isFirebaseConnected()) {
        showToast("กำลังเชื่อมต่อกับเซิร์ฟเวอร์...");
    }
    
    // ตรวจสอบการล็อกอิน
    onAuthStateChanged(user => {
        if (user) {
            hasSignedIn = true;
            if (screens.splash.classList.contains('show')) {
                // ถ้ากำลังอยู่ที่ splash screen ให้เปลี่ยนไป lobby
                setTimeout(() => {
                    if (screens.splash.classList.contains('show')) {
                        showScreen('lobby');
                    }
                }, 1000);
            }
        } else {
            // พยายามล็อกอินแบบไม่ระบุตัวตน
            signInAnonymously().catch(error => {
                console.error("Failed to sign in anonymously:", error);
                showToast("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ");
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            });
        }
    });
});

function setupInitialListeners() {
    // ตรวจสอบว่า element มีอยู่
    if (screens.splash) {
        screens.splash.addEventListener('click', handleSplashClick);
    }
    
    if (ui.soundControl) {
        ui.soundControl.addEventListener('click', toggleMute);
    }
    
    if (ui.goToCreateBtn) {
        ui.goToCreateBtn.addEventListener('click', () => { 
            playSound(sounds.click); 
            showScreen('createRoom'); 
        });
    }
    
    if (ui.goToJoinBtn) {
        ui.goToJoinBtn.addEventListener('click', handleGoToJoin);
    }
    
    if (ui.confirmCreateBtn) {
        ui.confirmCreateBtn.addEventListener('click', handleCreateRoom);
    }
    
    if (ui.passwordModal) {
        ui.passwordModal.addEventListener('click', (e) => { 
            if (e.target === ui.passwordModal) {
                ui.passwordModal.classList.remove('show');
                ui.passwordModalInput.value = '';
            }
        });
    }
    
    if (ui.passwordModalSubmitBtn) {
        ui.passwordModalSubmitBtn.addEventListener('click', handlePasswordSubmit);
    }
    
    if (ui.confirmJoinBtn) {
        ui.confirmJoinBtn.addEventListener('click', handleConfirmJoin);
    }
    
    if (ui.startGameBtn) {
        ui.startGameBtn.addEventListener('click', handleStartGame);
    }
    
    if (ui.submitFinalAnswerBtn) {
        ui.submitFinalAnswerBtn.addEventListener('click', handleFinalAnswer);
    }
    
    if (ui.rematchBtn) {
        ui.rematchBtn.addEventListener('click', handleRematch);
    }
    
    if (ui.backToLobbyBtn) {
        ui.backToLobbyBtn.addEventListener('click', () => {
            playSound(sounds.click);
            handleResetApp();
        });
    }
    
    // สร้าง number pad
    if (ui.numberPadContainer) {
        createNumberPad(handleNumberPadClick);
    }
}

function handleSplashClick() {
    if (!isOnline) {
        showToast("กำลังเชื่อมต่อกับเซิร์ฟเวอร์...");
        return;
    }
    
    playSound(sounds.click);
    showScreen('lobby');
    
    // ตรวจสอบและเล่น background sound
    if (sounds.background.paused && !isMuted) {
        sounds.background.play().catch(e => {
            showToast("คลิกที่หน้าจอเพื่อเปิดเสียง");
        });
    }
}

function toggleMute() {
    if (!ui.soundIcon) return;
    
    isMuted = !isMuted;
    ui.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    
    if (isMuted) {
        sounds.background.pause();
    } else {
        sounds.background.play().catch(e => {
            showToast("คลิกที่หน้าจอเพื่อเปิดเสียง");
        });
    }
    
    playSound(sounds.click);
}

function handleGoToJoin() {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    playSound(sounds.click);
    showScreen('roomList');
    
    // ลบ listener เก่า
    if (roomListListenerData) {
        detachRoomListListener(roomListListenerData);
        roomListListenerData = null;
    }
    
    // ตั้งค่า listener ใหม่
    roomListListenerData = listenToRoomList(rooms => {
        if (!ui.roomListContent) return;
        
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
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    playSound(sounds.click);
    
    if (playerCount >= 4) {
        showToast("ห้องนี้เต็มแล้ว");
        return;
    }
    
    joiningRoomData = room;
    
    if (room.password) {
        ui.passwordModalRoomName.textContent = `ห้อง: ${room.roomName}`;
        ui.passwordModal.classList.add('show');
        ui.passwordModalInput.focus();
    } else {
        ui.joinerRoomNameDisplay.textContent = room.roomName;
        showScreen('joinerSetup');
        if (ui.joinerNameInput) ui.joinerNameInput.focus();
    }
}

async function handleCreateRoom() {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    playSound(sounds.click);
    
    const hostName = ui.hostNameInput?.value.trim() || '';
    const roomName = ui.newRoomNameInput?.value.trim() || '';
    const password = ui.newRoomPasswordInput?.value.trim() || '';
    
    // ตรวจสอบ input
    if (!hostName || hostName.length < 2 || hostName.length > 20) {
        showToast('ชื่อผู้เล่นต้องมีความยาว 2-20 ตัวอักษร');
        return;
    }
    
    if (!roomName || roomName.length < 2 || roomName.length > 30) {
        showToast('ชื่อห้องต้องมีความยาว 2-30 ตัวอักษร');
        return;
    }
    
    if (password && password.length !== 4) {
        showToast('รหัสผ่านต้องมีความยาว 4 ตัวอักษร');
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
        console.error("Create room failed:", error);
        showToast(error.message || 'เกิดข้อผิดพลาดในการสร้างห้อง');
    }
}

async function handlePasswordSubmit() {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    playSound(sounds.click);
    
    const password = ui.passwordModalInput?.value.trim() || '';
    
    if (!password) {
        showToast('กรุณากรอกรหัสผ่าน');
        return;
    }
    
    try {
        const isCorrect = await verifyPassword(joiningRoomData.id, password);
        
        if (isCorrect) {
            ui.passwordModalInput.value = '';
            ui.passwordModal.classList.remove('show');
            ui.joinerRoomNameDisplay.textContent = joiningRoomData.roomName;
            showScreen('joinerSetup');
            if (ui.joinerNameInput) ui.joinerNameInput.focus();
        } else {
            showToast('รหัสผ่านไม่ถูกต้อง!');
        }
    } catch (error) {
        console.error("Password verification failed:", error);
        showToast(error.message || 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    }
}

async function handleConfirmJoin() {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    playSound(sounds.click);
    
    const joinerName = ui.joinerNameInput?.value.trim() || '';
    
    // ตรวจสอบ input
    if (!joinerName || joinerName.length < 2 || joinerName.length > 20) {
        showToast('ชื่อผู้เล่นต้องมีความยาว 2-20 ตัวอักษร');
        return;
    }
    
    // ลบ room list listener
    if (roomListListenerData) {
        detachRoomListListener(roomListListenerData);
        roomListListenerData = null;
    }
    
    try {
        const { newRoomId, newPlayerId } = await joinRoom(joiningRoomData.id, joinerName);
        currentRoomId = newRoomId;
        currentPlayerId = newPlayerId;
        startListeningToRoomUpdates();
        showScreen('waiting');
        showToast(`เข้าร่วมห้องสำเร็จ!`);
    } catch (error) {
        console.error("Join room failed:", error);
        showToast(error.message || 'เกิดข้อผิดพลาดในการเข้าร่วมห้อง');
        showScreen('lobby');
    }
}

function handleStartGame() {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    if (!currentRoomId || !currentPlayerId) {
        showToast("ข้อมูลห้องไม่ถูกต้อง");
        return;
    }
    
    playSound(sounds.click);
    
    if (ui.startGameBtn?.disabled) return;
    
    // ใช้ transaction เพื่อป้องกัน race condition
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        if (roomData && roomData.gameState === 'waiting' && roomData.playerCount >= 2) {
            const connectedPlayerIds = Object.keys(roomData.players || {}).filter(pId => 
                roomData.players[pId]?.connected
            );
            
            // สร้าง turn order
            roomData.turnOrder = connectedPlayerIds;
            roomData.gameState = 'setup';
            roomData.turn = connectedPlayerIds[0];
            roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            roomData.lastAction = null;
            
            return roomData;
        }
        return; // คืนค่า undefined หากเงื่อนไขไม่ตรง
    }, (error, committed) => {
        if (error || !committed) {
            console.error("Start game transaction failed:", error);
            showToast("ไม่สามารถเริ่มเกมได้ กรุณาลองใหม่");
        }
    }, false);
}

function handleNumberPadClick(event) {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    const value = event.target.dataset.value;
    if (!value) return;
    
    playSound(sounds.click);
    
    // ตรวจสอบว่าอยู่ในสถานะที่สามารถทายได้
    if (ui.turnIndicator?.classList.contains('their-turn')) {
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
            if (isValidGuess(currentGuess)) {
                submitGuess(currentRoomId, currentPlayerId, currentTargetId, currentGuess);
                currentGuess = [];
            } else {
                showToast(`ตัวเลขที่ทายไม่ถูกต้อง`);
            }
        } else {
            showToast(`กรุณาใส่เลขให้ครบ ${GUESS_LENGTH} ตัว`);
        }
    } else {
        if (currentGuess.length < GUESS_LENGTH) {
            currentGuess.push(value);
        } else {
            showToast(`เกินจำนวนที่กำหนด`);
        }
    }
    
    updateGuessDisplay(currentGuess);
}

function handleFinalAnswer() {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    playSound(sounds.click);
    
    if (ui.turnIndicator?.classList.contains('their-turn')) {
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
    
    if (!isValidGuess(currentGuess)) {
        showToast(`ตัวเลขที่ทายไม่ถูกต้อง`);
        return;
    }
    
    submitFinalAnswer(
        currentRoomId, 
        currentPlayerId, 
        currentTargetId, 
        currentGuess, 
        playSound, 
        sounds.wrong
    );
    
    currentGuess = [];
    updateGuessDisplay(currentGuess);
}

function handleRematch() {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    playSound(sounds.click);
    
    if (ui.rematchBtn) {
        ui.rematchBtn.disabled = true;
        ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
    }
    
    requestRematch(currentRoomId, currentPlayerId);
}

function handleTargetSelection(selectedTargetId) {
    if (!isOnline) {
        showToast("ไม่มีการเชื่อมต่ออินเทอร์เน็ต");
        return;
    }
    
    playSound(sounds.click);
    currentTargetId = selectedTargetId;
    
    // อัปเดต UI ทันที
    db.ref(`rooms/${currentRoomId}`).get().then(snapshot => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            updatePlayerSummaryGrid(roomData, currentPlayerId, { 
                currentTargetId: currentTargetId, 
                handler: handleTargetSelection 
            });
            updateHistoryLog(roomData, currentTargetId);
            showActionToast(`กำลังจะทายตัวเลขของ ${roomData.players[selectedTargetId].name}`);
        }
    }).catch(error => {
        console.error("Error fetching room data for target selection:", error);
        showToast("ไม่สามารถโหลดข้อมูลได้");
    });
}

function startListeningToRoomUpdates() {
    // ลบ listener เก่า
    if (roomListenerData) {
        detachRoomListener(roomListenerData);
        roomListenerData = null;
    }
    
    // ตั้งค่า disconnect handler
    if (currentRoomId && currentPlayerId) {
        setupDisconnectHandler(currentRoomId, currentPlayerId);
    }
    
    // สร้าง listener ใหม่
    roomListenerData = listenToRoomUpdates(currentRoomId, (roomData) => {
        if (!roomData) {
            // ห้องถูกลบหรือไม่มีอยู่
            console.log("Room deleted or doesn't exist. Redirecting to lobby.");
            
            if (turnTimerInterval) {
                clearInterval(turnTimerInterval);
                turnTimerInterval = null;
            }
            
            showToast("ห้องถูกลบหรือไม่มีอยู่ กรุณากลับสู่หน้าหลัก");
            
            setTimeout(() => {
                handleResetApp();
            }, 2000);
            
            return;
        }
        
        // ตรวจสอบการเปลี่ยนแปลงสถานะเกม
        if (lastGameState !== roomData.gameState) {
            lastGameState = roomData.gameState;
        }
        
        // ตรวจสอบการกระทำล่าสุด
        if (roomData.lastAction && roomData.lastAction.timestamp > (Date.now() - 4000)) {
            const { actorName, targetName, type } = roomData.lastAction;
            let message = '';
            
            switch (type) {
                case 'guess':
                    message = `<strong>${actorName}</strong> กำลังทายเลขของ <strong>${targetName}</strong>`;
                    break;
                case 'final_correct':
                    message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ถูกต้อง!`;
                    break;
                case 'final_wrong':
                    message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ผิด!`;
                    break;
                case 'skip':
                    message = `<strong>${actorName}</strong> ข้ามตา`;
                    break;
            }
            
            if (message) {
                showActionToast(message);
            }
        }
        
        // ตรวจสอบการขอเล่นใหม่
        if (roomData.rematch) {
            const connectedPlayers = Object.values(roomData.players || {}).filter(p => p.connected);
            const allRematch = Object.values(roomData.rematch).filter(v => v === true).length === connectedPlayers.length;
            
            if (allRematch && connectedPlayers.length > 1) {
                resetGameForRematch(currentRoomId, roomData);
                return;
            }
        }
        
        // ตรวจสอบว่าเกมจบแล้วหรือไม่
        if (isGameFinished(roomData)) {
            if (roomData.gameState !== 'finished') {
                const winnerId = Object.keys(roomData.players || {}).find(id => 
                    roomData.players[id]?.status === 'playing'
                );
                
                db.ref(`rooms/${currentRoomId}`).update({
                    gameState: 'finished',
                    winner: winnerId || null,
                    reason: winnerId ? 'เป็นผู้รอดชีวิตคนสุดท้าย!' : 'ไม่มีผู้ชนะ'
                });
            }
            return;
        }
        
        // อัปเดต UI ตามสถานะเกม
        switch (roomData.gameState) {
            case 'waiting':
                showScreen('waiting');
                updateWaitingRoomUI(roomData, currentPlayerId);
                break;
                
            case 'setup':
                // ตรวจสอบว่าผู้เล่นทุกคนตั้งเลขแล้ว
                const allPlayersSetNumber = Object.values(roomData.players || {}).every(p => 
                    p.connected && p.numberSet
                );
                
                if (allPlayersSetNumber) {
                    // เริ่มเกม
                    db.ref(`rooms/${currentRoomId}`).update({
                        gameState: 'playing',
                        turnStartTime: firebase.database.ServerValue.TIMESTAMP
                    });
                } else if (!screens.game.classList.contains('show')) {
                    // แสดง UI สำหรับตั้งเลข
                    initializeGameUI(roomData);
                }
                break;
                
            case 'playing':
                if (!screens.game.classList.contains('show')) {
                    showScreen('game');
                }
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
    updateGuessDisplay(currentGuess);
    
    // ล้าง history log
    if (ui.historyLog) {
        ui.historyLog.innerHTML = '';
    }
    
    // สร้างตัวเลขสุ่ม
    const ourNumber = generateRandomNumber();
    if (ui.ourNumberDisplay) {
        ui.ourNumberDisplay.innerHTML = '';
        for (let i = 0; i < GUESS_LENGTH; i++) {
            const input = document.createElement('div');
            input.className = 'number-input';
            input.textContent = ourNumber[i];
            ui.ourNumberDisplay.appendChild(input);
        }
    }
    
    // เลือกเป้าหมายแรก
    const firstTarget = Object.keys(roomData.players || {}).find(id => 
        id !== currentPlayerId && 
        roomData.players[id]?.status === 'playing'
    );
    currentTargetId = firstTarget || null;
    
    // ส่งตัวเลขไปยัง Firebase
    db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ 
        number: ourNumber.join(''), 
        numberSet: true 
    }).catch(error => {
        console.error("Failed to set number:", error);
        showToast("ไม่สามารถตั้งค่าตัวเลขได้");
    });
    
    showToast('กำลังรอผู้เล่นทุกคนตั้งเลข...', 3000);
}

function updatePlayingUI(roomData) {
    // ตรวจสอบสถานะผู้เล่น
    const myData = roomData.players[currentPlayerId];
    if (myData?.status === 'eliminated') {
        if (ui.spectatorOverlay) {
            ui.spectatorOverlay.classList.add('show');
            ui.spectatorMessage.textContent = `คุณแพ้แล้ว! กำลังรับชม...`;
        }
    } else {
        if (ui.spectatorOverlay) {
            ui.spectatorOverlay.classList.remove('show');
        }
    }
    
    // อัปเดต UI
    updateTurnIndicator(roomData, currentPlayerId, playSound, sounds.turn);
    updatePlayerSummaryGrid(roomData, currentPlayerId, { 
        currentTargetId: currentTargetId, 
        handler: handleTargetSelection 
    });
    updateHistoryLog(roomData, currentTargetId);
    updateChances(myData?.finalChances || MAX_CHANCES);
    handleTurnTimer(roomData, myData);
}

function handleTurnTimer(roomData, myData) {
    // ล้าง timer เก่า
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }
    
    if (ui.turnTimerDisplay) {
        ui.turnTimerDisplay.textContent = '';
    }
    
    // ตรวจสอบว่าเป็นตาผู้เล่นปัจจุบันหรือไม่
    if (roomData.turn !== currentPlayerId) {
        return;
    }
    
    // ตั้งค่า timer
    const turnStartTime = roomData.turnStartTime || Date.now();
    const updateTimer = () => {
        const timePassed = (Date.now() - turnStartTime) / 1000;
        let timeLeft = Math.round(TURN_DURATION - timePassed);
        
        if (ui.turnTimerDisplay && timeLeft >= 0) {
            ui.turnTimerDisplay.textContent = timeLeft;
            
            // เปลี่ยนสีเมื่อเหลือเวลาไม่มาก
            if (timeLeft <= 5) {
                ui.turnIndicator?.classList.add('warning');
            } else {
                ui.turnIndicator?.classList.remove('warning');
            }
        } else {
            clearInterval(turnTimerInterval);
            turnTimerInterval = null;
            
            // ตรวจสอบว่ายังเป็นตาผู้เล่นอยู่หรือไม่
            db.ref(`rooms/${currentRoomId}/turn`).get().then(snapshot => {
                if (snapshot.val() === currentPlayerId) {
                    showToast("หมดเวลา! ข้ามตาอัตโนมัติ");
                    skipTurn(currentRoomId, currentPlayerId);
                }
            }).catch(error => {
                console.error("Error checking turn after timeout:", error);
            });
        }
    };
    
    updateTimer();
    turnTimerInterval = setInterval(updateTimer, 1000);
}

// เพิ่มการจัดการเมื่อผู้ใช้ออกจากหน้าเว็บ
window.addEventListener('beforeunload', () => {
    if (currentRoomId && currentPlayerId) {
        cancelDisconnectHandler(currentRoomId, currentPlayerId);
    }
    
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
    }
});