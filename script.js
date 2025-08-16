// =================================================================
//                      AUDIO MANAGEMENT
// =================================================================

const sounds = {
    click: new Audio('sounds/click.mp3'),
    win: new Audio('sounds/win-wow.mp3'),
    wrong: new Audio('sounds/wrong-answer.mp3'),
    background: new Audio('sounds/background-music.mp3')
};

// ตั้งค่าเสียง
sounds.background.loop = true;
sounds.background.volume = 0.3;
sounds.click.volume = 0.7;

// ฟังก์ชันกลางสำหรับเล่นเสียงสั้นๆ
function playSound(soundName) {
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(error => console.log(`Error playing ${soundName}:`, error));
    }
}

// ฟังก์ชันควบคุมเพลงประกอบ
function controlBackgroundMusic(action) {
    if (action === 'play') {
        // การเล่นเสียงต้องเริ่มหลังจากการกระทำของผู้ใช้
        let playPromise = sounds.background.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Background music autoplay was prevented.", error);
            });
        }
    } else if (action === 'stop') {
        sounds.background.pause();
        sounds.background.currentTime = 0;
    }
}

// =================================================================
//                      DOM ELEMENTS
// =================================================================
const screens = {
    splash: document.getElementById('splash-screen'),
    lobby: document.getElementById('lobby-screen'),
    createRoom: document.getElementById('create-room-screen'),
    roomList: document.getElementById('room-list-screen'),
    joinerSetup: document.getElementById('joiner-setup-screen'),
    waitingRoom: document.getElementById('waiting-room-screen'),
    mainGame: document.getElementById('main-game-screen'),
    gameOver: document.getElementById('game-over-screen'),
};

const goToCreateBtn = document.getElementById('go-to-create-btn');
const goToJoinBtn = document.getElementById('go-to-join-btn');
const hostNameInput = document.getElementById('host-name-input');
const newRoomNameInput = document.getElementById('new-room-name-input');
const newRoomPasswordInput = document.getElementById('new-room-password-input');
const confirmCreateBtn = document.getElementById('confirm-create-btn');
const roomListContent = document.getElementById('room-list-content');
const joinerNameInput = document.getElementById('joiner-name-input');
const confirmJoinBtn = document.getElementById('confirm-join-btn');
const joinerRoomNameDisplay = document.getElementById('joiner-room-name-display');
const waitingRoomTitle = document.querySelector('.waiting-room-title');
const roomCodeText = document.getElementById('room-code-text');
const playerSlots = [
    document.getElementById('player1-slot'),
    document.getElementById('player2-slot'),
    document.getElementById('player3-slot'),
    document.getElementById('player4-slot'),
];
const waitingMessage = document.getElementById('waiting-message');
const startGameBtn = document.getElementById('start-game-btn');
const ourNumberDisplay = document.getElementById('our-number-display');
const playerSummaryGrid = document.getElementById('player-summary-grid');
const historyLog = document.getElementById('history-log');
const historyTargetName = document.getElementById('history-target-name');
const guessNumberContainer = document.getElementById('guess-number-container');
const numberPadContainer = document.getElementById('number-pad-container');
const chanceDots = [
    document.getElementById('chance-1'),
    document.getElementById('chance-2'),
    document.getElementById('chance-3'),
];
const submitFinalAnswerBtn = document.getElementById('submit-final-answer-btn');
const turnIndicator = document.getElementById('turn-indicator');
const turnText = document.getElementById('turn-text');
const spectatorOverlay = document.getElementById('spectator-overlay');
const spectatorMessage = document.getElementById('spectator-message');
const gameOverTitle = document.getElementById('game-over-title');
const winnerName = document.getElementById('winner-name');
const gameOverMessage = document.getElementById('game-over-message');
const gameOverNumbersContainer = document.getElementById('game-over-numbers-container');
const rematchBtn = document.getElementById('rematch-btn');
const backToLobbyBtn = document.getElementById('back-to-lobby-btn');
const passwordModal = document.getElementById('password-modal');
const passwordModalRoomName = document.getElementById('password-modal-room-name');
const passwordModalInput = document.getElementById('password-modal-input');
const passwordModalSubmitBtn = document.getElementById('password-modal-submit-btn');
const toast = document.getElementById('toast');
const actionToast = document.getElementById('action-toast');
const actionToastText = document.getElementById('action-toast-text');


// =================================================================
//                      GLOBAL STATE
// =================================================================
let currentScreen = 'splash';
let firebaseConfig;
let db;
let player = { id: null, name: null, isHost: false };
let room = { id: null, name: null, password: null, hostId: null };
let gameState = {};
let currentGuess = [];
let selectedTargetId = null;
let roomListener = null;
let roomsListener = null;
let tempJoinData = { roomId: null, roomName: null };


// =================================================================
//                      SCREEN & UI MANAGEMENT
// =================================================================
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('show'));
    if (screens[screenName]) {
        screens[screenName].classList.add('show');
        currentScreen = screenName;
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showActionToast(message) {
    actionToastText.textContent = message;
    actionToast.classList.add('show');
    setTimeout(() => {
        actionToast.classList.remove('show');
    }, 2500);
}

function showPasswordModal(roomId, roomName) {
    tempJoinData = { roomId, roomName };
    passwordModalRoomName.textContent = `ห้อง: ${roomName}`;
    passwordModalInput.value = '';
    passwordModal.classList.add('show');
}

function hidePasswordModal() {
    passwordModal.classList.remove('show');
}

// =================================================================
//                      FIREBASE SETUP & UTILS
// =================================================================
async function initializeFirebase() {
    firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        databaseURL: "YOUR_DATABASE_URL",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
}


// =================================================================
//                      LOBBY & ROOM SETUP
// =================================================================

async function handleCreateRoom() {
    playSound('click');
    const hostName = hostNameInput.value.trim();
    const roomName = newRoomNameInput.value.trim();
    const password = newRoomPasswordInput.value.trim();

    if (!hostName || !roomName) {
        return showToast('กรุณากรอกชื่อของคุณและชื่อห้อง');
    }
    if (password && (password.length !== 4 || !/^\d{4}$/.test(password))) {
        return showToast('รหัสผ่านต้องเป็นตัวเลข 4 หลักเท่านั้น');
    }

    player.name = hostName;
    player.isHost = true;

    const newRoomRef = db.ref('rooms').push();
    room.id = newRoomRef.key;
    room.name = roomName;
    room.password = password;
    room.hostId = player.id;

    const newPlayerRef = db.ref(`rooms/${room.id}/players`).push();
    player.id = newPlayerRef.key;
    room.hostId = player.id;

    await newRoomRef.set({
        name: room.name,
        password: room.password,
        hostName: player.name,
        hostId: player.id,
        status: 'waiting',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    });

    await newPlayerRef.set({
        name: player.name,
        isHost: true,
        status: 'connected',
        number: '',
        chances: 3,
        isEliminated: false
    });

    listenForRoomUpdates();
    showScreen('waitingRoom');
}

function listenForRooms() {
    if (roomsListener) roomsListener.off();
    const roomsRef = db.ref('rooms').orderByChild('createdAt').limitToLast(20);
    roomsListener = roomsRef.on('value', snapshot => {
        roomListContent.innerHTML = '';
        if (snapshot.exists()) {
            const rooms = snapshot.val();
            let hasWaitingRooms = false;
            Object.entries(rooms).forEach(([roomId, roomData]) => {
                if (roomData.status === 'waiting') {
                    hasWaitingRooms = true;
                    const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
                    const roomItem = document.createElement('div');
                    roomItem.className = 'room-item';
                    roomItem.innerHTML = `
                        <div>
                            <p class="room-name">${roomData.name}</p>
                            <p class="host-name">สร้างโดย: ${roomData.hostName}</p>
                        </div>
                        <span class="room-status">${playerCount}/4</span>
                    `;
                    roomItem.addEventListener('click', () => {
                        playSound('click');
                        if (playerCount >= 4) {
                            return showToast('ห้องนี้เต็มแล้ว');
                        }
                        if (roomData.password) {
                            showPasswordModal(roomId, roomData.name);
                        } else {
                            tempJoinData = { roomId, roomName: roomData.name };
                            showScreen('joinerSetup');
                            joinerRoomNameDisplay.textContent = tempJoinData.roomName;
                        }
                    });
                    roomListContent.appendChild(roomItem);
                }
            });
            if (!hasWaitingRooms) {
                roomListContent.innerHTML = '<p class="no-rooms-message">ยังไม่มีห้องว่างในขณะนี้...</p>';
            }
        } else {
            roomListContent.innerHTML = '<p class="no-rooms-message">ยังไม่มีห้องว่างในขณะนี้...</p>';
        }
    });
}

function handlePasswordSubmit() {
    playSound('click');
    const password = passwordModalInput.value;
    db.ref(`rooms/${tempJoinData.roomId}/password`).once('value', snapshot => {
        if (snapshot.val() === password) {
            hidePasswordModal();
            showScreen('joinerSetup');
            joinerRoomNameDisplay.textContent = tempJoinData.roomName;
        } else {
            showToast('รหัสผ่านไม่ถูกต้อง');
        }
    });
}

async function handleConfirmJoin() {
    playSound('click');
    const joinerName = joinerNameInput.value.trim();
    if (!joinerName) {
        return showToast('กรุณากรอกชื่อของคุณ');
    }

    player.name = joinerName;
    player.isHost = false;
    room.id = tempJoinData.roomId;

    const newPlayerRef = db.ref(`rooms/${room.id}/players`).push();
    player.id = newPlayerRef.key;

    await newPlayerRef.set({
        name: player.name,
        isHost: false,
        status: 'connected',
        number: '',
        chances: 3,
        isEliminated: false
    });

    listenForRoomUpdates();
    showScreen('waitingRoom');
}

// =================================================================
//                      WAITING ROOM
// =================================================================
function listenForRoomUpdates() {
    if (roomListener) roomListener.off();
    const roomRef = db.ref(`rooms/${room.id}`);
    roomListener = roomRef.on('value', snapshot => {
        if (!snapshot.exists()) {
            handleRoomClosed();
            return;
        }
        const roomData = snapshot.val();
        gameState = roomData;
        updateWaitingRoomUI(roomData);

        if (roomData.status === 'playing' && currentScreen !== 'mainGame') {
            showScreen('mainGame');
            initializeGameUI();
        } else if (roomData.status === 'finished' && currentScreen !== 'gameOver') {
            showGameOverScreen(roomData);
        }
    });
}

function updateWaitingRoomUI(roomData) {
    roomCodeText.textContent = roomData.name;
    const players = roomData.players || {};
    const playerIds = Object.keys(players);

    playerSlots.forEach((slot, index) => {
        const nameSpan = slot.querySelector('.player-name');
        const statusSpan = slot.querySelector('.player-status');
        const avatar = slot.querySelector('.player-avatar-initial');

        if (playerIds[index]) {
            const p = players[playerIds[index]];
            nameSpan.textContent = p.name;
            statusSpan.textContent = 'เชื่อมต่อแล้ว';
            statusSpan.className = 'player-status connected';
            avatar.textContent = p.name.charAt(0).toUpperCase();
            avatar.style.backgroundColor = getAvatarColor(playerIds[index]);
        } else {
            nameSpan.textContent = `ผู้เล่น ${index + 1}`;
            statusSpan.textContent = 'กำลังรอ...';
            statusSpan.className = 'player-status waiting';
            avatar.textContent = '?';
            avatar.style.backgroundColor = '#e2e8f0';
        }
    });

    if (player.isHost) {
        const playerCount = playerIds.length;
        if (playerCount >= 2 && playerCount <= 4) {
            startGameBtn.disabled = false;
            waitingMessage.textContent = 'พร้อมแล้วเริ่มเกมได้เลย!';
        } else {
            startGameBtn.disabled = true;
            waitingMessage.textContent = 'ต้องมีผู้เล่น 2-4 คนเพื่อเริ่มเกม';
        }
    } else {
        startGameBtn.style.display = 'none';
        waitingMessage.textContent = 'รอหัวหน้าห้องเริ่มเกม...';
    }
}

function getAvatarColor(playerId) {
    const colors = ['#f87171', '#60a5fa', '#facc15', '#4ade80', '#a78bfa', '#fb923c'];
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
        hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function handleRoomClosed() {
    if (roomListener) roomListener.off();
    showToast("ห้องถูกปิดโดยหัวหน้าห้อง");
    resetToLobby();
}


// =================================================================
//                      GAME LOGIC
// =================================================================
function startGame() {
    const playerIds = Object.keys(gameState.players);
    const updates = {};
    updates[`/status`] = 'playing';
    updates[`/turnOrder`] = shuffleArray(playerIds);
    updates[`/currentTurnIndex`] = 0;
    updates[`/history`] = {};

    playerIds.forEach(pid => {
        updates[`/players/${pid}/number`] = generateSecretNumber();
        updates[`/players/${pid}/chances`] = 3;
        updates[`/players/${pid}/isEliminated`] = false;
    });

    db.ref(`rooms/${room.id}`).update(updates);
}

function generateSecretNumber() {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let number = '';
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * digits.length);
        number += digits.splice(randomIndex, 1)[0];
    }
    return number;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initializeGameUI() {
    createNumberPad();
    updateGameUI();
}

function updateGameUI() {
    if (!gameState || !gameState.players || !gameState.players[player.id]) return;

    const myData = gameState.players[player.id];
    
    if (myData.isEliminated) {
        spectatorOverlay.classList.add('show');
        spectatorMessage.textContent = `คุณแพ้แล้ว! กำลังรับชม...`;
    } else {
        spectatorOverlay.classList.remove('show');
    }

    ourNumberDisplay.innerHTML = myData.number.split('').map(n => `<div class="number-input">${n}</div>`).join('');

    playerSummaryGrid.innerHTML = '';
    Object.entries(gameState.players).forEach(([pid, pdata]) => {
        if (pid === player.id) return;
        const card = document.createElement('div');
        card.className = 'player-summary-card';
        card.dataset.playerId = pid;
        card.innerHTML = `<div class="summary-card-name">${pdata.name}</div><div class="summary-card-status">${pdata.isEliminated ? 'แพ้แล้ว' : 'ยังอยู่'}</div>`;
        
        if (pdata.isEliminated) {
            card.classList.add('is-eliminated');
        } else {
            card.addEventListener('click', () => {
                if (myData.isEliminated) return;
                playSound('click');
                selectedTargetId = pid;
                updateGameUI();
            });
        }

        if (pid === selectedTargetId) {
            card.classList.add('is-target');
        }
        playerSummaryGrid.appendChild(card);
    });
    
    if (!selectedTargetId || gameState.players[selectedTargetId]?.isEliminated) {
        const firstAvailableTarget = Object.keys(gameState.players).find(pid => pid !== player.id && !gameState.players[pid].isEliminated);
        selectedTargetId = firstAvailableTarget || null;
    }

    updateHistoryLog();

    for (let i = 0; i < 3; i++) {
        chanceDots[i].classList.toggle('used', i >= myData.chances);
    }

    const currentTurnPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
    const isMyTurn = currentTurnPlayerId === player.id && !myData.isEliminated;
    
    if (isMyTurn) {
        turnIndicator.className = 'turn-indicator my-turn';
        turnText.textContent = 'ตาของคุณ';
    } else {
        turnIndicator.className = 'turn-indicator their-turn';
        const currentTurnPlayerName = gameState.players[currentTurnPlayerId]?.name || 'ผู้เล่น';
        turnText.textContent = `ตากำลังเล่นของ: ${currentTurnPlayerName}`;
    }
    
    const controlsDisabled = !isMyTurn || !selectedTargetId;
    submitFinalAnswerBtn.disabled = controlsDisabled;
    numberPadContainer.style.pointerEvents = controlsDisabled ? 'none' : 'auto';
    numberPadContainer.style.opacity = controlsDisabled ? 0.6 : 1;
}

function createNumberPad() {
    numberPadContainer.innerHTML = '';
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
    numbers.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = num;
        if (num === 'C' || num === '⌫') {
            cell.classList.add('special');
        }
        cell.addEventListener('click', () => handleNumberPadClick(num));
        numberPadContainer.appendChild(cell);
    });
}

function handleNumberPadClick(num) {
    playSound('click');
    if (num === 'C') {
        currentGuess = [];
    } else if (num === '⌫') {
        currentGuess.pop();
    } else if (currentGuess.length < 4) {
        currentGuess.push(num);
    }
    updateGuessDisplay();
}

function updateGuessDisplay() {
    const inputs = guessNumberContainer.querySelectorAll('.number-input');
    inputs.forEach((input, index) => {
        input.textContent = currentGuess[index] || '';
    });
}

function updateHistoryLog() {
    historyLog.innerHTML = '';
    if (!selectedTargetId) {
        historyTargetName.textContent = 'เลือกเป้าหมาย';
        historyLog.innerHTML = '<p>เลือกผู้เล่นเพื่อดูประวัติการทาย</p>';
        return;
    }

    historyTargetName.textContent = gameState.players[selectedTargetId].name;
    const targetHistory = gameState.history?.[selectedTargetId] || [];

    if (targetHistory.length === 0) {
        historyLog.innerHTML = '<p>ยังไม่มีการทายผู้เล่นคนนี้</p>';
        return;
    }

    targetHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span class="history-guess">${item.guess}</span>
            <div class="history-clues">
                <div class="clue-box clue-strike">${item.strikes}S</div>
                <div class="clue-box clue-ball">${item.balls}B</div>
            </div>
        `;
        historyLog.appendChild(historyItem);
    });
    historyLog.scrollTop = historyLog.scrollHeight;
}

function handleSubmitFinalAnswer() {
    playSound('click');
    if (currentGuess.length !== 4) {
        return showToast('กรุณากรอกเลขให้ครบ 4 หลัก');
    }
    const guess = currentGuess.join('');
    const targetNumber = gameState.players[selectedTargetId].number;

    if (guess === targetNumber) {
        showActionToast(`คุณกำจัด ${gameState.players[selectedTargetId].name} สำเร็จ!`);
        db.ref(`rooms/${room.id}/players/${selectedTargetId}/isEliminated`).set(true);
        checkWinCondition();
    } else {
        playSound('wrong');
        const myChances = gameState.players[player.id].chances - 1;
        db.ref(`rooms/${room.id}/players/${player.id}/chances`).set(myChances);
        showActionToast(`คำตอบผิด! คุณเสีย 1 โอกาส`);
        if (myChances <= 0) {
            db.ref(`rooms/${room.id}/players/${player.id}/isEliminated`).set(true);
            checkWinCondition();
        }
    }
    addGuessToHistory(guess);
    moveToNextTurn();
}

function addGuessToHistory(guess) {
    const targetNumber = gameState.players[selectedTargetId].number;
    let strikes = 0;
    let balls = 0;
    for (let i = 0; i < 4; i++) {
        if (guess[i] === targetNumber[i]) {
            strikes++;
        } else if (targetNumber.includes(guess[i])) {
            balls++;
        }
    }

    const historyRef = db.ref(`rooms/${room.id}/history/${selectedTargetId}`);
    historyRef.push({
        guess,
        strikes,
        balls,
        guesserId: player.id,
        guesserName: player.name
    });
}

function moveToNextTurn() {
    let nextIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
    let loopCount = 0;
    while (gameState.players[gameState.turnOrder[nextIndex]].isEliminated) {
        nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
        loopCount++;
        if (loopCount > gameState.turnOrder.length) {
            return;
        }
    }
    db.ref(`rooms/${room.id}/currentTurnIndex`).set(nextIndex);
    currentGuess = [];
    updateGuessDisplay();
}

function checkWinCondition() {
    db.ref(`rooms/${room.id}/players`).once('value', (snapshot) => {
        const currentPlayers = snapshot.val();
        const activePlayers = Object.values(currentPlayers).filter(p => !p.isEliminated);
        
        if (activePlayers.length <= 1) {
            const winner = activePlayers.length === 1 ? activePlayers[0] : null;
            const winnerId = winner ? Object.keys(currentPlayers).find(pid => currentPlayers[pid].name === winner.name) : null;
            
            const updates = {
                status: 'finished',
                winnerId: winnerId,
                winnerName: winner ? winner.name : 'ไม่มีผู้ชนะ'
            };
            db.ref(`rooms/${room.id}`).update(updates);
        }
    });
}


// =================================================================
//                      GAME OVER & RESET
// =================================================================
function showGameOverScreen(roomData) {
    controlBackgroundMusic('stop');
    const isWinner = roomData.winnerId === player.id;

    if (isWinner) {
        playSound('win');
        gameOverTitle.textContent = "คุณชนะ!";
        winnerName.textContent = player.name;
        gameOverMessage.textContent = "คุณคือผู้รอดชีวิตคนสุดท้าย!";
        screens.gameOver.className = 'game-screen show win';
    } else {
        gameOverTitle.textContent = "จบเกม";
        winnerName.textContent = `ผู้ชนะคือ ${roomData.winnerName}`;
        gameOverMessage.textContent = "พยายามได้ดีมาก! ไว้ลองใหม่นะ";
        screens.gameOver.className = 'game-screen show lose';
    }

    gameOverNumbersContainer.innerHTML = '';
    Object.values(roomData.players).forEach(p => {
        const numberBox = document.createElement('div');
        numberBox.className = 'final-number-box';
        numberBox.innerHTML = `
            <div class="final-number-box-title">${p.name}</div>
            <div class="final-number-display">${p.number}</div>
        `;
        gameOverNumbersContainer.appendChild(numberBox);
    });

    showScreen('gameOver');
}

function handleRematch() {
    playSound('click');
    if (player.isHost) {
        const updates = {};
        updates['/status'] = 'waiting';
        updates['/history'] = null;
        updates['/turnOrder'] = null;
        updates['/currentTurnIndex'] = null;
        updates['/winnerId'] = null;
        updates['/winnerName'] = null;
        Object.keys(gameState.players).forEach(pid => {
            updates[`/players/${pid}/number`] = '';
            updates[`/players/${pid}/chances`] = 3;
            updates[`/players/${pid}/isEliminated`] = false;
        });
        db.ref(`rooms/${room.id}`).update(updates);
        
        showScreen('waitingRoom');
        controlBackgroundMusic('play');

    } else {
        showToast('รอหัวหน้าห้องเพื่อเริ่มเกมใหม่...');
    }
}

function resetToLobby() {
    playSound('click');
    if (roomListener) roomListener.off();
    if (roomsListener) roomsListener.off();
    
    if (player.isHost && room.id) {
        db.ref(`rooms/${room.id}`).remove();
    } else if (room.id && player.id) {
        db.ref(`rooms/${room.id}/players/${player.id}`).remove();
    }

    player = { id: null, name: null, isHost: false };
    room = { id: null, name: null, password: null, hostId: null };
    gameState = {};
    currentGuess = [];
    selectedTargetId = null;
    
    hostNameInput.value = '';
    newRoomNameInput.value = '';
    newRoomPasswordInput.value = '';
    joinerNameInput.value = '';
    startGameBtn.style.display = 'block';
    startGameBtn.disabled = true;

    showScreen('lobby');
    controlBackgroundMusic('play');
}


// =================================================================
//                      INITIALIZATION (ฉบับแก้ไข)
// =================================================================
function setupAllListeners() {
    // Splash Screen
    screens.splash.addEventListener('click', () => {
        playSound('click');
        showScreen('lobby');
        controlBackgroundMusic('play');
    }, { once: true });

    // Lobby Screen
    goToCreateBtn.addEventListener('click', () => {
        playSound('click');
        showScreen('createRoom');
    });
    goToJoinBtn.addEventListener('click', () => {
        playSound('click');
        showScreen('roomList');
        listenForRooms();
    });

    // Create/Join Logic
    confirmCreateBtn.addEventListener('click', handleCreateRoom);
    confirmJoinBtn.addEventListener('click', handleConfirmJoin);
    passwordModalSubmitBtn.addEventListener('click', handlePasswordSubmit);

    // Waiting Room
    startGameBtn.addEventListener('click', () => {
        playSound('click');
        if (player.isHost) startGame();
    });

    // Main Game
    submitFinalAnswerBtn.addEventListener('click', handleSubmitFinalAnswer);

    // Game Over
    rematchBtn.addEventListener('click', handleRematch);
    backToLobbyBtn.addEventListener('click', resetToLobby);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('splash-screen')) {
        // 1. ตั้งค่า Event Listeners ทั้งหมดทันที
        setupAllListeners();

        // 2. โหลด Firebase ในพื้นหลัง
        initializeFirebase().catch(error => {
            console.error("Firebase initialization failed:", error);
            document.body.innerHTML = '<h1>เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์</h1>';
        });

        // 3. แสดงหน้าจอแรก
        showScreen('splash');
    }
});
