document.addEventListener('DOMContentLoaded', function() {

    // =================================================================
    // ======== FIREBASE CONFIG & INITIALIZATION ========
    // =================================================================
    const firebaseConfig = {
      apiKey: "AIzaSyAAeQyoxlwHv8Qe9yrsoxw0U5SFHTGzk8o",
      authDomain: "taijai.firebaseapp.com",
      databaseURL: "https://taijai-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "taijai",
      storageBucket: "taijai.firebasestorage.app",
      messagingSenderId: "262573756581",
      appId: "1:262573756581:web:c17bfc795b5cf139693d4c"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // ======== AUDIO ASSETS ========
    let sounds = {};
    let soundsInitialized = false;

    function initializeSounds() {
        if (soundsInitialized) return;
        try {
            sounds = {
                click: new Audio('sounds/click.mp3'),
                wrongAnswer: new Audio('sounds/wrong-answer.mp3'),
                win: new Audio('sounds/win-wow.mp3')
            };
            sounds.click.volume = 0.8;
            sounds.win.volume = 0.7;
            soundsInitialized = true;
            console.log("Sounds Initialized!");
        } catch (error) {
            console.error("Could not initialize sounds:", error);
        }
    }

    function playSound(sound) {
        if (soundsInitialized && sound && sound.readyState >= 2) {
            sound.currentTime = 0;
            sound.play().catch(error => console.error("Error playing sound:", error));
        }
    }

    // =================================================================
    // ======== GAME STATE VARIABLES ========
    // =================================================================
    let currentRoomId = null;
    let joiningRoomData = null;
    let currentPlayerId = null;
    let currentTargetId = null;
    let roomListener = null;
    let roomListListener = null;
    let currentGuess = [];
    const GUESS_LENGTH = 4;

    // =================================================================
    // ======== UI ELEMENT REFERENCES ========
    // =================================================================
    const screens = {
        splash: document.getElementById('splash-screen'),
        lobby: document.getElementById('lobby-screen'),
        createRoom: document.getElementById('create-room-screen'),
        roomList: document.getElementById('room-list-screen'),
        joinerSetup: document.getElementById('joiner-setup-screen'),
        waiting: document.getElementById('waiting-room-screen'),
        game: document.getElementById('main-game-screen'),
        gameOver: document.getElementById('game-over-screen')
    };
    const ui = {
        // Lobby & Room Creation
        goToCreateBtn: document.getElementById('go-to-create-btn'),
        goToJoinBtn: document.getElementById('go-to-join-btn'),
        confirmCreateBtn: document.getElementById('confirm-create-btn'),
        hostNameInput: document.getElementById('host-name-input'),
        newRoomNameInput: document.getElementById('new-room-name-input'),
        newRoomPasswordInput: document.getElementById('new-room-password-input'),

        // Room List & Password Modal
        roomListContent: document.getElementById('room-list-content'),
        passwordModal: document.getElementById('password-modal'),
        passwordModalRoomName: document.getElementById('password-modal-room-name'),
        passwordModalInput: document.getElementById('password-modal-input'),
        passwordModalSubmitBtn: document.getElementById('password-modal-submit-btn'),

        // Joiner Setup
        joinerRoomNameDisplay: document.getElementById('joiner-room-name-display'),
        joinerNameInput: document.getElementById('joiner-name-input'),
        confirmJoinBtn: document.getElementById('confirm-join-btn'),

        // Waiting Room
        roomCodeText: document.getElementById('room-code-text'),
        playerSlots: {
            player1: document.getElementById('player1-slot'),
            player2: document.getElementById('player2-slot'),
            player3: document.getElementById('player3-slot'),
            player4: document.getElementById('player4-slot')
        },
        waitingMessage: document.getElementById('waiting-message'),
        startGameBtn: document.getElementById('start-game-btn'),

        // Main Game
        turnIndicator: document.getElementById('turn-indicator'),
        turnText: document.getElementById('turn-text'),
        ourNumberDisplay: document.getElementById('our-number-display'),
        playerSummaryGrid: document.getElementById('player-summary-grid'),
        historyLog: document.getElementById('history-log'),
        historyTargetName: document.getElementById('history-target-name'),
        guessNumberContainer: document.getElementById('guess-number-container'),
        numberPadContainer: document.getElementById('number-pad-container'),
        chanceDots: [document.getElementById('chance-1'), document.getElementById('chance-2'), document.getElementById('chance-3')],
        submitFinalAnswerBtn: document.getElementById('submit-final-answer-btn'),
        spectatorOverlay: document.getElementById('spectator-overlay'),
        spectatorMessage: document.getElementById('spectator-message'),

        // Game Over
        gameOverTitle: document.getElementById('game-over-title'),
        winnerName: document.getElementById('winner-name'),
        gameOverMessage: document.getElementById('game-over-message'),
        gameOverNumbersContainer: document.getElementById('game-over-numbers-container'),
        rematchBtn: document.getElementById('rematch-btn'),
        backToLobbyBtn: document.getElementById('back-to-lobby-btn'),

        // Misc
        toast: document.getElementById('toast'),
        actionToast: document.getElementById('action-toast'),
        actionToastText: document.getElementById('action-toast-text')
    };

    // =================================================================
    // ======== CORE APP FLOW & SCREEN MANAGEMENT ========
    // =================================================================

    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('show'));
        if (screens[screenName]) screens[screenName].classList.add('show');
    }

    function showToast(message) {
        ui.toast.textContent = message;
        ui.toast.classList.add('show');
        setTimeout(() => ui.toast.classList.remove('show'), 3000);
    }

    function showActionToast(message) {
        ui.actionToastText.textContent = message;
        ui.actionToast.classList.add('show');
        setTimeout(() => ui.actionToast.classList.remove('show'), 2500);
    }

    // =================================================================
    // ======== LOBBY & ROOM MANAGEMENT ========
    // =================================================================

    function setupInitialListeners() {
        screens.splash.addEventListener('click', () => {
            initializeSounds();
            playSound(sounds.click);
            showScreen('lobby');
        });
        ui.goToCreateBtn.addEventListener('click', () => {
            playSound(sounds.click);
            showScreen('createRoom');
        });
        ui.goToJoinBtn.addEventListener('click', () => {
            playSound(sounds.click);
            showScreen('roomList');
            loadAndDisplayRooms();
        });
        ui.confirmCreateBtn.addEventListener('click', () => {
            playSound(sounds.click);
            createRoom();
        });
        ui.passwordModalSubmitBtn.addEventListener('click', () => {
            playSound(sounds.click);
            handlePasswordSubmit();
        });
        ui.passwordModal.addEventListener('click', function(e) { if(e.target === this) this.classList.remove('show'); });
        ui.confirmJoinBtn.addEventListener('click', () => {
            playSound(sounds.click);
            joinRoom();
        });
        ui.startGameBtn.addEventListener('click', startGame);
        ui.submitFinalAnswerBtn.addEventListener('click', () => {
            playSound(sounds.click);
            submitFinalAnswer();
        });
        ui.rematchBtn.addEventListener('click', () => {
            playSound(sounds.click);
            requestRematch();
        });
        ui.backToLobbyBtn.addEventListener('click', () => {
            playSound(sounds.click);
            window.location.reload();
        });
    }

    function createRoom() {
        const hostName = ui.hostNameInput.value.trim();
        const roomName = ui.newRoomNameInput.value.trim();
        const password = ui.newRoomPasswordInput.value;

        if (!hostName || !roomName || !/^\d{4}$/.test(password)) {
            showToast('กรุณากรอกข้อมูลให้ครบ (รหัสผ่าน 4 ตัวเลข)');
            return;
        }

        const newRoomId = db.ref('rooms').push().key;
        currentPlayerId = 'player1';
        currentRoomId = newRoomId;

        const roomData = {
            roomName, password,
            players: {
                player1: { id: 'player1', name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3, status: 'playing' },
                player2: { id: 'player2', name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
                player3: { id: 'player3', name: 'ผู้เล่น 3', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
                player4: { id: 'player4', name: 'ผู้เล่น 4', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' }
            },
            gameState: 'waiting',
            turn: null,
            turnOrder: [],
            rematch: {},
            lastAction: null
        };

        db.ref('rooms/' + newRoomId).set(roomData).then(() => {
            showToast(`สร้างห้อง "${roomName}" สำเร็จ!`);
            listenToRoomUpdates();
            showScreen('waiting');
        }).catch(error => showToast('เกิดข้อผิดพลาด: ' + error.message));
    }

    function loadAndDisplayRooms() {
        const roomsRef = db.ref('rooms');
        if (roomListListener) roomsRef.off('value', roomListListener);

        roomListListener = roomsRef.on('value', snapshot => {
            ui.roomListContent.innerHTML = '';
            if (!snapshot.exists()) {
                ui.roomListContent.innerHTML = '<p class="no-rooms-message">ยังไม่มีห้องว่างในขณะนี้...</p>';
                return;
            }
            let hasRooms = false;
            snapshot.forEach(childSnapshot => {
                const roomData = childSnapshot.val();
                const connectedPlayers = Object.values(roomData.players).filter(p => p.connected).length;
                if (roomData.gameState === 'waiting' && connectedPlayers < 4) {
                    hasRooms = true;
                    const roomItem = document.createElement('div');
                    roomItem.className = 'room-item';
                    roomItem.innerHTML = `<div class="room-info"><div class="room-name">${roomData.roomName}</div><div class="host-name">สร้างโดย: ${roomData.players.player1.name}</div></div><div class="room-status">${connectedPlayers}/4</div>`;
                    roomItem.addEventListener('click', () => {
                        playSound(sounds.click);
                        ui.passwordModalRoomName.textContent = `ห้อง: ${roomData.roomName}`;
                        ui.passwordModal.dataset.roomId = childSnapshot.key;
                        ui.passwordModal.dataset.roomName = roomData.roomName;
                        ui.passwordModal.classList.add('show');
                    });
                    ui.roomListContent.appendChild(roomItem);
                }
            });
            if (!hasRooms) {
                 ui.roomListContent.innerHTML = '<p class="no-rooms-message">ยังไม่มีห้องว่างในขณะนี้...</p>';
            }
        });
    }

    function handlePasswordSubmit() {
        const roomId = ui.passwordModal.dataset.roomId;
        const roomName = ui.passwordModal.dataset.roomName;
        const enteredPassword = ui.passwordModalInput.value;
        db.ref(`rooms/${roomId}/password`).get().then(snapshot => {
            if (snapshot.val() === enteredPassword) {
                ui.passwordModalInput.value = '';
                ui.passwordModal.classList.remove('show');

                joiningRoomData = { id: roomId, name: roomName };
                ui.joinerRoomNameDisplay.textContent = roomName;
                showScreen('joinerSetup');
            } else {
                showToast('รหัสผ่านไม่ถูกต้อง!');
            }
        });
    }

    function joinRoom() {
        const joinerName = ui.joinerNameInput.value.trim();
        if (!joinerName) {
            showToast('กรุณากรอกชื่อของคุณ');
            return;
        }

        const roomId = joiningRoomData.id;
        if (roomListListener) db.ref('rooms').off('value', roomListListener);

        const roomRef = db.ref(`rooms/${roomId}`);

        roomRef.transaction(currentRoomData => {
            if (currentRoomData) {
                let availableSlotId = null;
                for (const playerId in currentRoomData.players) {
                    if (!currentRoomData.players[playerId].connected) {
                        availableSlotId = playerId;
                        break;
                    }
                }

                if (availableSlotId) {
                    currentRoomData.players[availableSlotId].connected = true;
                    currentRoomData.players[availableSlotId].name = joinerName;
                    currentPlayerId = availableSlotId;
                    currentRoomId = roomId;
                } else {
                    // This will abort the transaction
                    return; 
                }
            }
            return currentRoomData;
        }).then(result => {
            if (result.committed && result.snapshot.exists()) {
                if(currentPlayerId) { // Check if we successfully got a slot
                    showToast(`เข้าร่วมห้องสำเร็จ!`);
                    listenToRoomUpdates();
                    showScreen('waiting');
                } else {
                    showToast("ไม่สามารถเข้าร่วมห้องได้ อาจจะเต็มแล้ว");
                    showScreen('roomList');
                }
            } else {
                showToast("ไม่สามารถเข้าร่วมห้องได้ อาจจะเต็มแล้ว");
                showScreen('roomList');
            }
        }).catch(error => {
            console.error("Join room transaction failed: ", error);
            showToast("เกิดข้อผิดพลาดในการเข้าร่วมห้อง");
        });
    }

    function startGame() {
        if (ui.startGameBtn.disabled) return;

        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData) {
                const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);
                if (connectedPlayers.length >= 2) {
                    roomData.gameState = 'setup';
                    let turnOrder = connectedPlayers.map(p => p.id);
                    // Shuffle turn order
                    for (let i = turnOrder.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [turnOrder[i], turnOrder[j]] = [turnOrder[j], turnOrder[i]];
                    }
                    roomData.turnOrder = turnOrder;
                    roomData.turn = turnOrder[0];
                }
            }
            return roomData;
        });
    }

    // =================================================================
    // ======== REAL-TIME DATA SYNCING & GAME STATE MACHINE ========
    // =================================================================
    function listenToRoomUpdates() {
        const roomRef = db.ref('rooms/' + currentRoomId);
        if (roomListener) roomRef.off('value', roomListener);

        let previousGameState = null;

        roomListener = roomRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                showToast("ห้องถูกปิดแล้ว กลับสู่หน้าหลัก");
                if(roomListener) roomRef.off('value', roomListener);
                setTimeout(() => window.location.reload(), 3000);
                return;
            }
            const roomData = snapshot.val();

            if (currentTargetId && roomData.players[currentTargetId]?.status === 'eliminated') {
                currentTargetId = null;
            }

            if (roomData.lastAction) {
                const { actorName, targetName, action } = roomData.lastAction;
                if (action === 'guess') {
                    showActionToast(`${actorName} กำลังทายเลขของ ${targetName}...`);
                }
                db.ref(`rooms/${currentRoomId}/lastAction`).remove();
            }

            const isNewState = previousGameState !== roomData.gameState;
            previousGameState = roomData.gameState;

            switch(roomData.gameState) {
                case 'waiting':
                    showScreen('waiting');
                    updateWaitingRoomUI(roomData);
                    break;
                case 'setup':
                    if (isNewState) {
                        showScreen('game');
                        initializeGameUI(roomData);
                    }
                    
                    const allPlayersSet = Object.values(roomData.players)
                        .filter(p => p.connected)
                        .every(p => p.numberSet);

                    if (allPlayersSet) {
                        db.ref(`rooms/${currentRoomId}`).update({ gameState: 'playing' });
                    }
                    break;
                case 'playing':
                    if (isNewState) {
                        showScreen('game');
                    }
                    updatePlayingUI(roomData);
                    break;
                case 'finished':
                    showScreen('gameOver');
                    displayGameOver(roomData);
                    updateGameOverUI(roomData);
                    break;
            }
        });
    }
    function updateWaitingRoomUI(roomData) {
        ui.roomCodeText.textContent = roomData.roomName;
        const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);

        Object.values(ui.playerSlots).forEach((slot, index) => {
            const playerId = `player${index + 1}`;
            const player = roomData.players[playerId];
            const nameEl = slot.querySelector('.player-name');
            const statusEl = slot.querySelector('.player-status');
            const avatarEl = slot.querySelector('.player-avatar-initial');
            const colors = ['#ff6b6b', '#4ade80', '#89cff0', '#ffc107'];

            if (player && player.connected) {
                nameEl.textContent = player.isHost ? `${player.name} (เจ้าของห้อง)` : player.name;
                statusEl.textContent = 'เชื่อมต่อแล้ว';
                statusEl.className = 'player-status connected';
                avatarEl.textContent = player.name.substring(0, 1).toUpperCase();
                avatarEl.style.backgroundColor = colors[index];
            } else {
                nameEl.textContent = `ผู้เล่น ${index + 1}`;
                statusEl.textContent = 'กำลังรอ...';
                statusEl.className = 'player-status waiting';
                avatarEl.textContent = '?';
                avatarEl.style.backgroundColor = '#e2e8f0';
            }
        });

        if (currentPlayerId === 'player1') {
            if (connectedPlayers.length >= 2) {
                ui.startGameBtn.disabled = false;
                ui.waitingMessage.textContent = `พร้อมแล้วกด "เริ่มเกม" ได้เลย!`;
            } else {
                ui.startGameBtn.disabled = true;
                ui.waitingMessage.textContent = 'รอผู้เล่นอย่างน้อย 2 คน...';
            }
        } else {
            ui.startGameBtn.disabled = true;
            ui.waitingMessage.textContent = 'รอเจ้าของห้องเริ่มเกม...';
        }
    }

    function updatePlayingUI(roomData) {
        const me = roomData.players[currentPlayerId];

        if (me.status === 'eliminated') {
            ui.spectatorOverlay.classList.add('show');
            ui.spectatorMessage.textContent = `คุณแพ้แล้ว! กำลังรับชมผู้เล่นที่เหลือ...`;
        } else {
            ui.spectatorOverlay.classList.remove('show');
        }

        updateTurnIndicator(roomData);
        updatePlayerSummary(roomData);
        updateHistoryLog(roomData);
        updateChances(me.finalChances);
    }

    function updateGameOverUI(roomData) {
        const me = roomData.players[currentPlayerId];
        if (me.rematch) {
            ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
            ui.rematchBtn.disabled = true;
        } else {
            ui.rematchBtn.textContent = 'เล่นอีกครั้ง';
            ui.rematchBtn.disabled = false;
        }
    }

    // =================================================================
    // ======== GAME LOGIC & UI ========
    // =================================================================

    function initializeGameUI(roomData) {
        if (!roomData.players[currentPlayerId].numberSet) {
            const number = generateRandomNumber();
            db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ number: number.join(''), numberSet: true });
            
            ui.ourNumberDisplay.innerHTML = '';
            number.forEach(digit => {
                ui.ourNumberDisplay.innerHTML += `<div class="number-input">${digit}</div>`;
            });
        } else {
            const existingNumber = roomData.players[currentPlayerId].number.split('');
            ui.ourNumberDisplay.innerHTML = '';
            existingNumber.forEach(digit => {
                ui.ourNumberDisplay.innerHTML += `<div class="number-input">${digit}</div>`;
            });
        }

        ui.guessNumberContainer.innerHTML = '';
        for (let i = 0; i < GUESS_LENGTH; i++) {
            ui.guessNumberContainer.innerHTML += `<div class="number-input"></div>`;
        }

        createNumberPad();
        currentGuess = [];
        currentTargetId = null;
        showToast('เกมเริ่ม! นี่คือเลขของคุณ');
    }

    function generateRandomNumber() {
        let result = [];
        for (let i = 0; i < GUESS_LENGTH; i++) {
            result.push(Math.floor(Math.random() * 10).toString());
        }
        return result;
    }

    function createNumberPad() {
        ui.numberPadContainer.innerHTML = '';
        const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ลบ', '0', 'ทาย'];
        buttons.forEach(val => {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = val;
            if (val === 'ลบ' || val === 'ทาย') {
                cell.classList.add('special');
            }
            cell.addEventListener('click', () => handleNumberPadClick(val));
            ui.numberPadContainer.appendChild(cell);
        });
    }

    function handleNumberPadClick(value) {
        playSound(sounds.click);
        const isMyTurn = document.getElementById('turn-indicator').classList.contains('my-turn');
        const amIPlaying = !document.getElementById('spectator-overlay').classList.contains('show');

        if (!amIPlaying) {
            showToast("คุณแพ้แล้ว ไม่สามารถเล่นได้");
            return;
        }
        if (!isMyTurn) {
            showToast("ยังไม่ถึงตาของคุณ!");
            return;
        }

        if (value === 'ลบ') {
            if (currentGuess.length > 0) {
                currentGuess.pop();
            }
        } else if (value === 'ทาย') {
            if (currentGuess.length === GUESS_LENGTH) {
                submitGuess();
            } else {
                showToast(`กรุณาใส่เลขให้ครบ ${GUESS_LENGTH} ตัว`);
            }
        } else {
            if (currentGuess.length < GUESS_LENGTH) {
                currentGuess.push(value);
            }
        }
        updateGuessDisplay();
    }

    function updateGuessDisplay() {
        const guessInputs = ui.guessNumberContainer.children;
        for (let i = 0; i < GUESS_LENGTH; i++) {
            guessInputs[i].textContent = currentGuess[i] || '';
        }
    }

    function submitGuess() {
        if (!currentTargetId) {
            showToast("กรุณาเลือกเป้าหมายที่จะทาย!");
            return;
        }

        const guessString = currentGuess.join('');

        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData && roomData.gameState === 'playing') {
                const opponent = roomData.players[currentTargetId];
                const me = roomData.players[currentPlayerId];

                const history = me.guesses?.[currentTargetId] || [];
                if (Object.values(history).some(item => item.guess === guessString)) {
                    // This is a client-side check, the transaction will just abort.
                    // We show the toast outside the transaction.
                    return; 
                }

                const clues = calculateClues(currentGuess, opponent.number.split(''));

                const guessData = {
                    guess: guessString,
                    strikes: clues.strikes,
                    balls: clues.balls
                };

                if (!roomData.players[currentPlayerId].guesses) {
                    roomData.players[currentPlayerId].guesses = {};
                }
                if (!roomData.players[currentPlayerId].guesses[currentTargetId]) {
                    roomData.players[currentPlayerId].guesses[currentTargetId] = [];
                }
                roomData.players[currentPlayerId].guesses[currentTargetId].push(guessData);

                roomData.lastAction = {
                    actorName: me.name,
                    targetName: opponent.name,
                    action: 'guess'
                };

                const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
                const currentIndex = activePlayers.indexOf(roomData.turn);
                let nextIndex = (currentIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextIndex];
            }
            return roomData;
        }).then(result => {
            if(result.committed) {
                currentGuess = [];
                updateGuessDisplay();
            } else {
                showToast("คุณเคยทายเลขนี้ไปแล้ว!");
            }
        }).catch(error => {
            if (error) {
                console.error("Submit guess transaction failed:", error);
                showToast("เกิดข้อผิดพลาดในการทาย");
            }
        });
    }

    function calculateClues(guess, answer) {
        let strikes = 0;
        let balls = 0;
        let guessCopy = [...guess];
        let answerCopy = [...answer];

        for (let i = guessCopy.length - 1; i >= 0; i--) {
            if (guessCopy[i] === answerCopy[i]) {
                strikes++;
                guessCopy.splice(i, 1);
                answerCopy.splice(i, 1);
            }
        }

        for (let i = 0; i < guessCopy.length; i++) {
            const foundIndex = answerCopy.indexOf(guessCopy[i]);
            if (foundIndex !== -1) {
                balls++;
                answerCopy.splice(foundIndex, 1);
            }
        }
        return { strikes, balls };
    }

    function updateHistoryLog(roomData) {
        if (!currentTargetId) {
            ui.historyLog.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 20px 0;">เลือกผู้เล่นเพื่อดูประวัติการทาย</p>';
            ui.historyTargetName.textContent = 'ใครสักคน';
            return;
        }

        const targetName = roomData.players[currentTargetId].name;
        ui.historyTargetName.textContent = `${targetName}`;

        const guesses = roomData.players[currentPlayerId].guesses?.[currentTargetId];
        ui.historyLog.innerHTML = '';
        if (!guesses) {
            ui.historyLog.innerHTML = `<p style="text-align: center; color: #a0aec0; padding: 20px 0;">ยังไม่เคยทาย ${targetName}</p>`;
            return;
        }

        Object.values(guesses).forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            let cluesHTML = '';
            if (item.strikes > 0) {
                cluesHTML += `<div class="clue-box clue-strike">${item.strikes}S</div>`;
            }
            if (item.balls > 0) {
                cluesHTML += `<div class="clue-box clue-ball">${item.balls}B</div>`;
            }
            if (item.strikes === 0 && item.balls === 0) {
                cluesHTML = `<div class="clue-box" style="background-color: #a0aec0;">OUT</div>`;
            }

            historyItem.innerHTML = `
                <div class="history-guess">${item.guess}</div>
                <div class="history-clues">${cluesHTML}</div>
            `;
            ui.historyLog.appendChild(historyItem);
        });
        ui.historyLog.scrollTop = ui.historyLog.scrollHeight;
    }

    function submitFinalAnswer() {
        const isMyTurn = document.getElementById('turn-indicator').classList.contains('my-turn');
        if (!isMyTurn) {
            showToast("ไม่สามารถส่งคำตอบในตาของเพื่อนได้!");
            return;
        }
        if (!currentTargetId) {
            showToast("กรุณาเลือกเป้าหมายที่จะส่งคำตอบสุดท้าย!");
            return;
        }
        if (currentGuess.length !== GUESS_LENGTH) {
            showToast(`กรุณาใส่เลขคำตอบให้ครบ ${GUESS_LENGTH} ตัว`);
            return;
        }

        const finalAnswer = currentGuess.join('');

        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData && roomData.gameState === 'playing') {
                const opponent = roomData.players[currentTargetId];
                let activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');

                if (finalAnswer === opponent.number) {
                    // ตอบถูก
                    roomData.players[currentTargetId].status = 'eliminated';
                    activePlayers = activePlayers.filter(id => id !== currentTargetId);
                } else {
                    // ตอบผิด
                    playSound(sounds.wrongAnswer);
                    roomData.players[currentPlayerId].finalChances -= 1;
                    if (roomData.players[currentPlayerId].finalChances <= 0) {
                        roomData.players[currentPlayerId].status = 'eliminated';
                        activePlayers = activePlayers.filter(id => id !== currentPlayerId);
                    }
                }

                // ตรวจสอบสถานะเกม
                if (activePlayers.length <= 1) {
                    roomData.gameState = 'finished';
                    roomData.winner = activePlayers.length === 1 ? activePlayers[0] : currentPlayerId; // Handle edge case
                    roomData.reason = `${roomData.players[roomData.winner].name} คือผู้รอดชีวิตคนสุดท้าย!`;
                } else {
                    // เปลี่ยนเทิร์น
                    const currentTurnPlayer = roomData.turn;
                    const currentIndex = activePlayers.indexOf(currentTurnPlayer);
                    
                    let nextIndex;
                    if (currentIndex === -1) { 
                        // If the current turn player was just eliminated, find their original position to determine the next player
                        const originalIndex = roomData.turnOrder.indexOf(currentTurnPlayer);
                        // Find the next active player in the original turn order
                        let nextPlayer = null;
                        for(let i = 1; i < roomData.turnOrder.length; i++) {
                            const potentialNextId = roomData.turnOrder[(originalIndex + i) % roomData.turnOrder.length];
                            if(activePlayers.includes(potentialNextId)) {
                                nextPlayer = potentialNextId;
                                break;
                            }
                        }
                        roomData.turn = nextPlayer;
                    } else {
                        nextIndex = (currentIndex + 1) % activePlayers.length;
                        roomData.turn = activePlayers[nextIndex];
                    }
                }
            }
            return roomData;
        }).then(() => {
            currentGuess = [];
            updateGuessDisplay();
            currentTargetId = null;
        });
    }
    function updateChances(chances) {
        for (let i = 0; i < 3; i++) {
            ui.chanceDots[i].classList.toggle('used', i >= chances);
        }
    }

    function updateTurnIndicator(roomData) {
        const currentTurnPlayerId = roomData.turn;
        if (!currentTurnPlayerId || roomData.gameState !== 'playing') {
            ui.turnIndicator.classList.remove('my-turn', 'their-turn');
            ui.turnIndicator.style.backgroundColor = '#a0aec0';
            ui.turnText.textContent = 'กำลังรอ...';
            return;
        };

        const isMyTurn = currentTurnPlayerId === currentPlayerId;
        const turnPlayerName = roomData.players[currentTurnPlayerId].name;

        ui.turnIndicator.classList.toggle('my-turn', isMyTurn);
        ui.turnIndicator.classList.toggle('their-turn', !isMyTurn);
        ui.turnText.textContent = isMyTurn ? "ตาของคุณ" : `ตาของ ${turnPlayerName}`;
    }

    function updatePlayerSummary(roomData) {
        ui.playerSummaryGrid.innerHTML = '';
        const otherPlayers = Object.values(roomData.players)
            .filter(p => p.connected && p.id !== currentPlayerId);

        otherPlayers.forEach(player => {
            const playerBox = document.createElement('div');
            playerBox.className = 'player-summary-card';
            playerBox.dataset.playerId = player.id;

            if (player.status === 'eliminated') {
                playerBox.classList.add('is-eliminated');
            }
            if (player.id === currentTargetId) {
                playerBox.classList.add('is-target');
            }

            playerBox.innerHTML = `
                <div class="summary-card-name">${player.name}</div>
                <div class="summary-card-status">${player.status === 'eliminated' ? 'แพ้แล้ว' : 'กำลังเล่น'}</div>
            `;

            playerBox.addEventListener('click', () => {
                if (player.status !== 'eliminated') {
                    playSound(sounds.click);
                    currentTargetId = player.id;
                    updatePlayerSummary(roomData); // Re-render to show selection
                    updateHistoryLog(roomData);
                }
            });
            ui.playerSummaryGrid.appendChild(playerBox);
        });
    }

    // =================================================================
    // ======== GAME OVER & REMATCH ========
    // =================================================================

    function displayGameOver(roomData) {
        const winnerId = roomData.winner;
        if (!winnerId) return;

        const winner = roomData.players[winnerId];
        const isWinner = winnerId === currentPlayerId;

        if (isWinner) {
            playSound(sounds.win);
        }

        screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
        ui.gameOverTitle.textContent = isWinner ? "🎉 คุณชนะ! 🎉" : "จบเกมแล้ว";
        ui.winnerName.textContent = `ผู้ชนะคือ: ${winner.name}`;
        ui.gameOverMessage.textContent = roomData.reason;

        ui.gameOverNumbersContainer.innerHTML = '';
        Object.values(roomData.players).forEach(player => {
            if (player.connected) {
                const numberBox = document.createElement('div');
                numberBox.className = 'final-number-box';
                numberBox.innerHTML = `
                    <div class="final-number-box-title">${player.name}</div>
                    <div class="final-number-display">${player.number || '????'}</div>
                `;
                ui.gameOverNumbersContainer.appendChild(numberBox);
            }
        });
    }

    function requestRematch() {
        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/rematch`).set(true);

        // Listen for the game to reset
        const rematchListener = db.ref(`rooms/${currentRoomId}`).on('value', snapshot => {
            const roomData = snapshot.val();
            if (!roomData) {
                db.ref(`rooms/${currentRoomId}`).off('value', rematchListener);
                return;
            }
            const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);
            const allRematch = connectedPlayers.every(p => p.rematch);

            if (allRematch && connectedPlayers.length > 1 && currentPlayerId === 'player1') {
                db.ref(`rooms/${currentRoomId}`).off('value', rematchListener);
                resetGameForRematch(roomData);
            }
        });
    }

    function resetGameForRematch(roomData) {
        showToast("เริ่มเกมใหม่อีกครั้ง!");
        const updates = {};
        updates[`rooms/${currentRoomId}/gameState`] = 'setup';

        const connectedPlayerIds = Object.values(roomData.players)
            .filter(p => p.connected)
            .map(p => p.id);
        
        // Shuffle turn order for the new game
        for (let i = connectedPlayerIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [connectedPlayerIds[i], connectedPlayerIds[j]] = [connectedPlayerIds[j], connectedPlayerIds[i]];
        }

        updates[`rooms/${currentRoomId}/turnOrder`] = connectedPlayerIds;
        updates[`rooms/${currentRoomId}/turn`] = connectedPlayerIds[0];
        updates[`rooms/${currentRoomId}/winner`] = null;
        updates[`rooms/${currentRoomId}/reason`] = null