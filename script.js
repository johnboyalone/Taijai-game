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
    let bgm;

    function initializeSounds() {
        if (soundsInitialized) return;
        soundsInitialized = true;

        console.log("Initializing sounds for the first time...");

        sounds = {
            click: new Audio('sounds/click.mp3'),
            wrongAnswer: new Audio('sounds/wrong-answer.mp3'),
            win: new Audio('sounds/win-wow.mp3')
        };
        bgm = new Audio('sounds/background-music.mp3');

        // ตั้งค่าคุณสมบัติต่างๆ
        bgm.loop = true;
        bgm.volume = 0.3;
        sounds.click.volume = 0.8;
        sounds.win.volume = 0.7;

        // บังคับให้เบราว์เซอร์โหลดไฟล์เสียงล่วงหน้า
        Object.values(sounds).forEach(sound => sound.load());
        bgm.load();
        
        console.log("Sounds and BGM are ready to be played.");
    }

    function playSound(sound) {
        if (sound && sound.readyState >= 3) {
            sound.currentTime = 0;
            sound.play().catch(e => console.error("Error playing sound:", e));
        } else {
            console.warn("Sound not ready to play yet:", sound);
        }
    }

    function playBGM() {
        if (bgm && bgm.readyState >= 3) {
            bgm.play().catch(e => console.error("Error playing BGM:", e));
        } else {
            console.warn("BGM not ready to play yet.");
        }
    }

    function stopBGM() {
        if (bgm) {
            bgm.pause();
            bgm.currentTime = 0;
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
    // ======== REAL-TIME DATA SYNCING & GAME STATE MACHINE ========
    // =================================================================
    
    function listenToRoomUpdates() {
        const roomRef = db.ref('rooms/' + currentRoomId);
        if (roomListener) roomRef.off('value', roomListener);
    
        let previousGameState = null;
    
        roomListener = roomRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                showToast("ห้องถูกปิดแล้ว กลับสู่หน้าหลัก");
                setTimeout(() => window.location.reload(), 3000);
                return;
            }
            const roomData = snapshot.val();
    
            if (previousGameState === 'waiting' && (roomData.gameState === 'setup' || roomData.gameState === 'playing')) {
                playBGM();
            }
            previousGameState = roomData.gameState;
    
            if (roomData.lastAction) {
                const { actorName, targetName, action } = roomData.lastAction;
                if (action === 'guess') {
                    showActionToast(`${actorName} กำลังทายเลขของ ${targetName}...`);
                }
                db.ref(`rooms/${currentRoomId}/lastAction`).remove();
            }
    
            switch(roomData.gameState) {
                case 'waiting':
                    showScreen('waiting');
                    updateWaitingRoomUI(roomData);
                    break;
                case 'setup':
                    showScreen('game');
                    if (!roomData.players[currentPlayerId].numberSet) {
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
                    showScreen('game');
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
                    showToast("ขออภัย, ห้องเต็มแล้ว");
                    return;
                }
            }
            return currentRoomData;
        }).then(result => {
            if (result.committed && result.snapshot.exists()) {
                showToast(`เข้าร่วมห้องสำเร็จ!`);
                listenToRoomUpdates();
                showScreen('waiting');
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
        
        playBGM();

        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData) {
                const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);
                if (connectedPlayers.length >= 2) {
                    roomData.gameState = 'setup';
                    roomData.turnOrder = connectedPlayers.map(p => p.id);
                    roomData.turn = roomData.turnOrder[0];
                }
            }
            return roomData;
        });
    }

    function updateWaitingRoomUI(roomData) {
        ui.roomCodeText.textContent = roomData.roomName;
        const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);

        Object.values(ui.playerSlots).forEach(slot => {
            const slotPlayerId = slot.id.replace('-slot', '');
            const player = roomData.players[slotPlayerId];
            if (player && player.connected) {
                slot.style.display = 'flex';
                const nameEl = slot.querySelector('.player-name');
                const statusEl = slot.querySelector('.player-status');
                const avatarEl = slot.querySelector('.player-avatar-initial');

                nameEl.textContent = player.isHost ? `${player.name} (เจ้าของห้อง)` : player.name;
                statusEl.textContent = 'เชื่อมต่อแล้ว';
                statusEl.className = 'player-status connected';
                avatarEl.textContent = player.name.substring(0, 1).toUpperCase();
            } else {
                slot.style.display = 'flex';
                const nameEl = slot.querySelector('.player-name');
                const statusEl = slot.querySelector('.player-status');
                const avatarEl = slot.querySelector('.player-avatar-initial');
                nameEl.textContent = `ผู้เล่น ${slotPlayerId.replace('player', '')}`;
                statusEl.textContent = 'กำลังรอ...';
                statusEl.className = 'player-status waiting';
                avatarEl.textContent = '?';
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
        const number = generateRandomNumber();
        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ number: number.join(''), numberSet: true });

        ui.ourNumberDisplay.innerHTML = '';
        number.forEach(digit => {
            ui.ourNumberDisplay.innerHTML += `<div class="number-input">${digit}</div>`;
        });

        ui.guessNumberContainer.innerHTML = '';
        for (let i = 0; i < GUESS_LENGTH; i++) {
            ui.guessNumberContainer.innerHTML += `<div class="number-input"></div>`;
        }

        createNumberPad();
        currentGuess = [];
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

        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/guesses/${currentTargetId}`).get().then(snapshot => {
            const history = snapshot.val() || [];
            if (Object.values(history).some(item => item.guess === guessString)) {
                showToast("คุณเคยทายเลขนี้ไปแล้ว!");
                return;
            }

            db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
                if (roomData) {
                    const opponent = roomData.players[currentTargetId];
                    const me = roomData.players[currentPlayerId];
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

                    const currentIndex = roomData.turnOrder.indexOf(roomData.turn);
                    let nextIndex = (currentIndex + 1) % roomData.turnOrder.length;
                    roomData.turn = roomData.turnOrder[nextIndex];
                }
                return roomData;
            });

            currentGuess = [];
            updateGuessDisplay();
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
            ui.historyLog.innerHTML = '<p class="history-placeholder">เลือกผู้เล่นเพื่อดูประวัติการทาย</p>';
            ui.historyTargetName.textContent = '';
            return;
        }

        const targetName = roomData.players[currentTargetId].name;
        ui.historyTargetName.textContent = `${targetName}`;

        const guesses = roomData.players[currentPlayerId].guesses?.[currentTargetId];
        ui.historyLog.innerHTML = '';
        if (!guesses) {
            ui.historyLog.innerHTML = `<p class="history-placeholder">ยังไม่เคยทาย ${targetName}</p>`;
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
            if (roomData) {
                const opponent = roomData.players[currentTargetId];
                const me = roomData.players[currentPlayerId];

                if (finalAnswer === opponent.number) {
                    roomData.players[currentTargetId].status = 'eliminated';
                    roomData.turnOrder = roomData.turnOrder.filter(id => id !== currentTargetId);

                    if (roomData.turnOrder.length === 1) {
                        roomData.gameState = 'finished';
                        roomData.winner = roomData.turnOrder[0];
                        roomData.reason = `${roomData.players[roomData.winner].name} คือผู้รอดชีวิตคนสุดท้าย!`;
                    } else {
                        const currentIndex = roomData.turnOrder.indexOf(roomData.turn);
                        let nextIndex = (currentIndex) % roomData.turnOrder.length;
                        roomData.turn = roomData.turnOrder[nextIndex];
                    }

                } else {
                    playSound(sounds.wrongAnswer);
                    me.finalChances -= 1;
                    if (me.finalChances <= 0) {
                        me.status = 'eliminated';
                        roomData.turnOrder = roomData.turnOrder.filter(id => id !== currentPlayerId);

                        if (roomData.turnOrder.length === 1) {
                            roomData.gameState = 'finished';
                            roomData.winner = roomData.turnOrder[0];
                            roomData.reason = `${roomData.players[roomData.winner].name} คือผู้รอดชีวิตคนสุดท้าย!`;
                        } else {
                            const currentIndex = roomData.turnOrder.indexOf(roomData.turn);
                            let nextIndex = currentIndex % roomData.turnOrder.length;
                            roomData.turn = roomData.turnOrder[nextIndex];
                        }
                    } else {
                        const currentIndex = roomData.turnOrder.indexOf(roomData.turn);
                        let nextIndex = (currentIndex + 1) % roomData.turnOrder.length;
                        roomData.turn = roomData.turnOrder[nextIndex];
                    }
                }
            }
            return roomData;
        });

        currentGuess = [];
        updateGuessDisplay();
        currentTargetId = null;
    }
    function updateChances(chances) {
        for (let i = 0; i < 3; i++) {
            ui.chanceDots[i].classList.toggle('used', i >= chances);
        }
    }

    function updateTurnIndicator(roomData) {
        const currentTurnPlayerId = roomData.turn;
        if (!currentTurnPlayerId) return;

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
                    updatePlayerSummary(roomData);
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
        stopBGM(); // หยุดเพลงก่อน
        
        const winner = roomData.players[roomData.winner];
        const isWinner = roomData.winner === currentPlayerId;

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

        db.ref(`rooms/${currentRoomId}`).get().then(snapshot => {
            const roomData = snapshot.val();
            const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);
            const allRematch = connectedPlayers.every(p => p.rematch);

            if (allRematch && connectedPlayers.length > 1) {
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

        updates[`rooms/${currentRoomId}/turnOrder`] = connectedPlayerIds;
        updates[`rooms/${currentRoomId}/turn`] = connectedPlayerIds[0];
        updates[`rooms/${currentRoomId}/winner`] = null;
        updates[`rooms/${currentRoomId}/reason`] = null;
        updates[`rooms/${currentRoomId}/lastAction`] = null;

        Object.keys(roomData.players).forEach(playerId => {
            if (roomData.players[playerId].connected) {
                updates[`rooms/${currentRoomId}/players/${playerId}/numberSet`] = false;
                updates[`rooms/${currentRoomId}/players/${playerId}/finalChances`] = 3;
                updates[`rooms/${currentRoomId}/players/${playerId}/status`] = 'playing';
                updates[`rooms/${currentRoomId}/players/${playerId}/guesses`] = null;
                updates[`rooms/${currentRoomId}/players/${playerId}/rematch`] = false;
            }
        });

        db.ref().update(updates);
    }

    // =================================================================
    // ======== INITIALIZATION ========
    // =================================================================
    setupInitialListeners();
    showScreen('splash');

});
