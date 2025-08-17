document.addEventListener('DOMContentLoaded', function() {
    
    // =================================================================
    // ======== FIREBASE CONFIG & INITIALIZATION ========
    // =================================================================
    const firebaseConfig = {
      apiKey: "AIzaSyAAeQyoxlwHv8Qe9yrsoxw0U5SFHTGzk8o",
      authDomain: "taijai.firebaseapp.com",
      databaseURL: "https://taijai-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "taijai",
      storageBucket: "taijai.appspot.com",
      messagingSenderId: "262573756581",
      appId: "1:262573756581:web:c17bfc795b5cf139693d4c"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

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
    let isMuted = false;
    let turnTimerInterval = null; // ตัวแปรสำหรับเก็บ interval ของ timer
    const TURN_DURATION = 15; // เวลาต่อตา (วินาที)

    // =================================================================
    // ======== AUDIO REFERENCES & FUNCTIONS ========
    // =================================================================
    const sounds = {
        background: new Audio('sounds/background-music.mp3'),
        click: new Audio('sounds/click.mp3'),
        win: new Audio('sounds/win-wow.mp3'),
        wrong: new Audio('sounds/wrong-answer.mp3'),
        turn: new Audio('sounds/your-turn.mp3') // สมมติว่ามีไฟล์เสียงนี้ในโฟลเดอร์ sounds
    };

    sounds.background.loop = true;
    sounds.background.volume = 0.3;
    sounds.turn.volume = 0.7;

    function playSound(sound) {
        if (isMuted) return;
        sound.currentTime = 0;
        sound.play().catch(error => console.log(`Error playing sound: ${error.message}`));
    }

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
        goToCreateBtn: document.getElementById('go-to-create-btn'),
        goToJoinBtn: document.getElementById('go-to-join-btn'),
        confirmCreateBtn: document.getElementById('confirm-create-btn'),
        hostNameInput: document.getElementById('host-name-input'),
        newRoomNameInput: document.getElementById('new-room-name-input'),
        newRoomPasswordInput: document.getElementById('new-room-password-input'),
        roomListContent: document.getElementById('room-list-content'),
        passwordModal: document.getElementById('password-modal'),
        passwordModalRoomName: document.getElementById('password-modal-room-name'),
        passwordModalInput: document.getElementById('password-modal-input'),
        passwordModalSubmitBtn: document.getElementById('password-modal-submit-btn'),
        joinerRoomNameDisplay: document.getElementById('joiner-room-name-display'),
        joinerNameInput: document.getElementById('joiner-name-input'),
        confirmJoinBtn: document.getElementById('confirm-join-btn'),
        roomCodeText: document.getElementById('room-code-text'),
        playerSlots: {
            player1: document.getElementById('player1-slot'),
            player2: document.getElementById('player2-slot'),
            player3: document.getElementById('player3-slot'),
            player4: document.getElementById('player4-slot')
        },
        waitingMessage: document.getElementById('waiting-message'),
        startGameBtn: document.getElementById('start-game-btn'),
        turnIndicator: document.getElementById('turn-indicator'),
        turnText: document.getElementById('turn-text'),
        turnTimerBar: document.getElementById('turn-timer-bar'),
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
        gameOverTitle: document.getElementById('game-over-title'),
        winnerName: document.getElementById('winner-name'),
        gameOverMessage: document.getElementById('game-over-message'),
        gameOverNumbersContainer: document.getElementById('game-over-numbers-container'),
        rematchBtn: document.getElementById('rematch-btn'),
        backToLobbyBtn: document.getElementById('back-to-lobby-btn'),
        toast: document.getElementById('toast'),
        actionToast: document.getElementById('action-toast'),
        actionToastText: document.getElementById('action-toast-text'),
        soundControl: document.getElementById('sound-control'),
        soundIcon: document.getElementById('sound-icon')
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
    
    function showActionToast(message, duration = 2000) {
        ui.actionToastText.innerHTML = message;
        ui.actionToast.classList.add('show');
        setTimeout(() => ui.actionToast.classList.remove('show'), duration);
    }

    // =================================================================
    // ======== LOBBY & ROOM MANAGEMENT ========
    // =================================================================

    function setupInitialListeners() {
        ui.soundControl.addEventListener('click', toggleMute);

        screens.splash.addEventListener('click', () => {
            playSound(sounds.click);
            if (!sounds.background.paused) return;
            if (!isMuted) {
                sounds.background.play().catch(e => console.log("Autoplay was prevented."));
            }
            showScreen('lobby');
        });

        ui.goToCreateBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('createRoom'); });
        ui.goToJoinBtn.addEventListener('click', () => { playSound(sounds.click); showScreen('roomList'); loadAndDisplayRooms(); });
        ui.confirmCreateBtn.addEventListener('click', () => { playSound(sounds.click); createRoom(); });
        ui.passwordModalSubmitBtn.addEventListener('click', () => { playSound(sounds.click); handlePasswordSubmit(); });
        ui.passwordModal.addEventListener('click', function(e) { if(e.target === this) this.classList.remove('show'); });
        ui.confirmJoinBtn.addEventListener('click', () => { playSound(sounds.click); joinRoom(); });
        
        ui.startGameBtn.addEventListener('click', () => {
            playSound(sounds.click);
            if (ui.startGameBtn.disabled) return;

            db.ref(`rooms/${currentRoomId}`).get().then(snapshot => {
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    if (roomData.gameState === 'waiting') {
                        const connectedPlayerIds = Object.values(roomData.players).filter(p => p.connected).map(p => p.id);
                        const updates = {
                            gameState: 'setup',
                            turnOrder: connectedPlayerIds,
                            turn: connectedPlayerIds[0],
                            turnStartTime: firebase.database.ServerValue.TIMESTAMP,
                            lastAction: null
                        };
                        db.ref(`rooms/${currentRoomId}`).update(updates);
                    }
                }
            });
        });

        ui.submitFinalAnswerBtn.addEventListener('click', submitFinalAnswer);
        ui.rematchBtn.addEventListener('click', () => { playSound(sounds.click); requestRematch(); });
        ui.backToLobbyBtn.addEventListener('click', () => window.location.reload());
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (isMuted) {
            sounds.background.pause();
            ui.soundIcon.textContent = '🔇';
        } else {
            sounds.background.play().catch(e => console.log("Autoplay was prevented."));
            ui.soundIcon.textContent = '🔊';
        }
        sounds.click.volume = 0.5;
        sounds.click.play();
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
            roomName, hostName, password,
            players: {
                'player1': { id: 'player1', name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3, status: 'playing' },
                'player2': { id: 'player2', name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
                'player3': { id: 'player3', name: 'ผู้เล่น 3', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
                'player4': { id: 'player4', name: 'ผู้เล่น 4', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' }
            },
            playerCount: 1,
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
        const roomsRef = db.ref('rooms').orderByChild('gameState').equalTo('waiting');
        if (roomListListener) roomsRef.off('value', roomListListener);

        roomListListener = roomsRef.on('value', snapshot => {
            ui.roomListContent.innerHTML = '';
            if (!snapshot.exists()) {
                ui.roomListContent.innerHTML = '<p class="no-rooms-message">ยังไม่มีห้องว่างในขณะนี้...</p>';
                return;
            }
            snapshot.forEach(childSnapshot => {
                const roomData = childSnapshot.val();
                if (!roomData.players) return; 

                const playerCount = roomData.playerCount || Object.values(roomData.players).filter(p => p.connected).length;
                
                const roomItem = document.createElement('div');
                roomItem.className = 'room-item';
                roomItem.innerHTML = `<div class="room-info"><div class="room-name">${roomData.roomName}</div><div class="host-name">สร้างโดย: ${roomData.hostName}</div></div><div class="room-status">${playerCount} / 4</div>`;
                
                roomItem.addEventListener('click', () => {
                    playSound(sounds.click);
                    if (playerCount >= 4) {
                        showToast("ห้องนี้เต็มแล้ว");
                        return;
                    }
                    ui.passwordModalRoomName.textContent = `ห้อง: ${roomData.roomName}`;
                    ui.passwordModal.dataset.roomId = childSnapshot.key;
                    ui.passwordModal.dataset.roomName = roomData.roomName;
                    ui.passwordModal.classList.add('show');
                });
                ui.roomListContent.appendChild(roomItem);
            });
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
        currentRoomId = roomId;
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
                    currentPlayerId = availableSlotId;
                    currentRoomData.players[availableSlotId].connected = true;
                    currentRoomData.players[availableSlotId].name = joinerName;
                    currentRoomData.playerCount++;
                } else {
                    return; 
                }
            }
            return currentRoomData;
        }, (error, committed, snapshot) => {
            if (error) {
                showToast("เกิดข้อผิดพลาด: " + error.message);
                showScreen('lobby');
            } else if (!committed) {
                showToast("ไม่สามารถเข้าร่วมห้องได้ อาจจะเต็มแล้ว");
                showScreen('lobby');
            } else {
                showToast(`เข้าร่วมห้องสำเร็จ!`);
                listenToRoomUpdates();
                showScreen('waiting');
            }
        });
    }
    // =================================================================
    // ======== REAL-TIME DATA SYNCING & GAME STATE MACHINE ========
    // =================================================================
    function listenToRoomUpdates() {
        const roomRef = db.ref('rooms/' + currentRoomId);
        if (roomListener) roomRef.off('value', roomListener);

        roomListener = roomRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                if (turnTimerInterval) clearInterval(turnTimerInterval);
                showToast("ห้องถูกปิดแล้ว กลับสู่หน้าหลัก");
                setTimeout(() => window.location.reload(), 3000);
                return;
            }
            const roomData = snapshot.val();
            const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);
            
            if (roomData.rematch && Object.values(roomData.rematch).filter(v => v === true).length === connectedPlayers.length && connectedPlayers.length > 1) {
                resetGameForRematch(roomData);
                return;
            }

            if (roomData.lastAction && roomData.lastAction.timestamp > (Date.now() - 3000)) {
                const { actorName, targetName, type } = roomData.lastAction;
                let message = '';
                if (type === 'guess') message = `<strong>${actorName}</strong> กำลังทายเลขของ <strong>${targetName}</strong>`;
                else if (type === 'final_correct') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ถูกต้อง!`;
                else if (type === 'final_wrong') message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ผิด!`;
                showActionToast(message);
            }

            switch(roomData.gameState) {
                case 'waiting':
                    updateWaitingRoomUI(roomData);
                    break;
                case 'setup':
                    if (!screens.game.classList.contains('show')) initializeGameUI(roomData);
                    const allPlayersSetNumber = connectedPlayers.every(p => p.numberSet);
                    if (allPlayersSetNumber) {
                        db.ref(`rooms/${currentRoomId}`).update({ 
                            gameState: 'playing',
                            turnStartTime: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    break;
                case 'playing':
                    updatePlayingUI(roomData);
                    break;
                case 'finished':
                    if (turnTimerInterval) clearInterval(turnTimerInterval);
                    if (!screens.gameOver.classList.contains('show')) displayGameOver(roomData);
                    updateGameOverUI(roomData);
                    break;
            }
        });
    }

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
        if (currentPlayerId === 'player1') {
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
            db.ref(`rooms/${currentRoomId}`).update({
                gameState: 'finished',
                winner: activePlayers[0]?.id || null,
                reason: 'เป็นผู้รอดชีวิตคนสุดท้าย!'
            });
            return;
        }
        updateTurnIndicator(roomData);
        updatePlayerSummaryGrid(roomData);
        updateHistoryLog(roomData);
        updateChances(myData.finalChances);
        handleTurnTimer(roomData);
    }

    function updateGameOverUI(roomData) {
        if (roomData.rematch && roomData.rematch[currentPlayerId]) {
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
        showScreen('game');
        const ourNumber = generateRandomNumber();
        ui.ourNumberDisplay.innerHTML = '';
        for (let i = 0; i < GUESS_LENGTH; i++) {
            ui.ourNumberDisplay.innerHTML += `<div class="number-input">${ourNumber[i]}</div>`;
        }
        createNumberPad();
        currentGuess = [];
        const firstTarget = roomData.turnOrder.find(id => id !== currentPlayerId);
        currentTargetId = firstTarget;
        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ number: ourNumber.join(''), numberSet: true });
        showToast('เกมเริ่ม! กรุณาตั้งเลขของคุณ');
    }

    function updatePlayerSummaryGrid(roomData) {
        ui.playerSummaryGrid.innerHTML = '';
        const opponents = roomData.turnOrder.filter(id => id !== currentPlayerId);
        opponents.forEach(opponentId => {
            const opponentData = roomData.players[opponentId];
            const card = document.createElement('div');
            card.className = 'player-summary-card';
            card.dataset.playerId = opponentId;
            if (opponentData.status === 'eliminated') card.classList.add('is-eliminated');
            if (opponentId === currentTargetId) card.classList.add('is-target');
            card.innerHTML = `<div class="summary-card-name">${opponentData.name}</div><div class="summary-card-status">${opponentData.status === 'eliminated' ? 'แพ้แล้ว' : 'กำลังเล่น'}</div>`;
            if (opponentData.status !== 'eliminated') {
                card.addEventListener('click', () => {
                    playSound(sounds.click);
                    currentTargetId = opponentId;
                    updatePlayerSummaryGrid(roomData);
                    updateHistoryLog(roomData);
                });
            }
            ui.playerSummaryGrid.appendChild(card);
        });
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
            if (val === 'ลบ' || val === 'ทาย') cell.classList.add('special');
            cell.addEventListener('click', () => handleNumberPadClick(val));
            ui.numberPadContainer.appendChild(cell);
        });
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
            if (!currentTargetId) { showToast("กรุณาเลือกเป้าหมายที่จะทายก่อน"); return; }
            if (currentGuess.length === GUESS_LENGTH) submitGuess();
            else showToast(`กรุณาใส่เลขให้ครบ ${GUESS_LENGTH} ตัว`);
        } else {
            if (currentGuess.length < GUESS_LENGTH) currentGuess.push(value);
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
        const guessString = currentGuess.join('');
        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData && roomData.turn === currentPlayerId) {
                const opponentNumber = roomData.players[currentTargetId].number;
                const clues = calculateClues(currentGuess, opponentNumber.split(''));
                const guessData = { guess: guessString, strikes: clues.strikes, balls: clues.balls, by: currentPlayerId };
                const historyPath = `players/${currentTargetId}/guesses`;
                if (!roomData.players[currentTargetId].guesses) roomData.players[currentTargetId].guesses = {};
                const newGuessKey = db.ref(`rooms/${currentRoomId}/${historyPath}`).push().key;
                roomData.players[currentTargetId].guesses[newGuessKey] = guessData;
                const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
                const currentTurnIndex = activePlayers.indexOf(roomData.turn);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
                roomData.lastAction = { actorName: roomData.players[currentPlayerId].name, targetName: roomData.players[currentTargetId].name, type: 'guess', timestamp: Date.now() };
            }
            return roomData;
        }).then(() => {
            currentGuess = [];
            updateGuessDisplay();
        });
    }

    function calculateClues(guess, answer) {
        let strikes = 0, balls = 0;
        const answerCopy = [...answer], guessCopy = [...guess];
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
        ui.historyLog.innerHTML = '';
        if (!currentTargetId) { ui.historyTargetName.textContent = 'ไม่มี'; return; }
        const targetData = roomData.players[currentTargetId];
        ui.historyTargetName.textContent = targetData.name;
        if (!targetData.guesses) return;
        Object.values(targetData.guesses).forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            let cluesHTML = '';
            if (item.strikes > 0) cluesHTML += `<div class="clue-box clue-strike">${item.strikes}S</div>`;
            if (item.balls > 0) cluesHTML += `<div class="clue-box clue-ball">${item.balls}B</div>`;
            if (item.strikes === 0 && item.balls === 0) cluesHTML = `<div class="clue-box" style="background-color: #a0aec0;">OUT</div>`;
            historyItem.innerHTML = `<div class="history-guess">${item.guess}</div><div class="history-clues">${cluesHTML}</div>`;
            ui.historyLog.appendChild(historyItem);
        });
        ui.historyLog.scrollTop = ui.historyLog.scrollHeight;
    }

    function submitFinalAnswer() {
        playSound(sounds.click);
        if (ui.turnIndicator.classList.contains('their-turn')) { showToast("ไม่สามารถส่งคำตอบในตาของเพื่อนได้!"); return; }
        if (!currentTargetId) { showToast("กรุณาเลือกเป้าหมายที่จะส่งคำตอบสุดท้าย"); return; }
        if (currentGuess.length !== GUESS_LENGTH) { showToast(`กรุณาใส่เลขคำตอบให้ครบ ${GUESS_LENGTH} ตัว`); return; }
        const finalAnswer = currentGuess.join('');
        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData && roomData.turn === currentPlayerId) {
                const targetPlayer = roomData.players[currentTargetId];
                const actorPlayer = roomData.players[currentPlayerId];
                let actionType = '';
                if (finalAnswer === targetPlayer.number) {
                    targetPlayer.status = 'eliminated';
                    actionType = 'final_correct';
                } else {
                    playSound(sounds.wrong);
                    actorPlayer.finalChances--;
                    if (actorPlayer.finalChances <= 0) actorPlayer.status = 'eliminated';
                    actionType = 'final_wrong';
                }
                roomData.lastAction = { actorName: actorPlayer.name, targetName: targetPlayer.name, type: actionType, timestamp: Date.now() };
                const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
                const currentTurnIndex = activePlayers.indexOf(roomData.turn);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            }
            return roomData;
        }).then(() => {
            currentGuess = [];
            updateGuessDisplay();
        });
    }

    function updateChances(chances) {
        for (let i = 0; i < 3; i++) {
            ui.chanceDots[i].classList.toggle('used', i >= chances);
        }
    }

    function updateTurnIndicator(roomData) {
        const currentTurnId = roomData.turn;
        const isMyTurn = currentTurnId === currentPlayerId;
        if (isMyTurn && !ui.turnIndicator.classList.contains('my-turn')) {
            playSound(sounds.turn);
        }
        ui.turnIndicator.classList.toggle('my-turn', isMyTurn);
        ui.turnIndicator.classList.toggle('their-turn', !isMyTurn);
        if (isMyTurn) {
            ui.turnText.textContent = "ตาของคุณ";
        } else {
            const turnPlayerName = roomData.players[currentTurnId]?.name || 'เพื่อน';
            ui.turnText.textContent = `ตาของ ${turnPlayerName}`;
        }
    }

    function handleTurnTimer(roomData) {
        if (turnTimerInterval) clearInterval(turnTimerInterval);
        const turnStartTime = roomData.turnStartTime || Date.now();
        const timePassed = (Date.now() - turnStartTime) / 1000;
        let timeLeft = TURN_DURATION - timePassed;
        turnTimerInterval = setInterval(() => {
            const percentageLeft = (timeLeft / TURN_DURATION) * 100;
            ui.turnTimerBar.style.width = `${Math.max(0, percentageLeft)}%`;
            if (timeLeft <= 0) {
                clearInterval(turnTimerInterval);
                if (roomData.turn === currentPlayerId) {
                    showToast("หมดเวลา! ข้ามตาอัตโนมัติ");
                    skipTurn();
                }
            }
            timeLeft--;
        }, 1000);
    }

    function skipTurn() {
        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData && roomData.turn === currentPlayerId) {
                const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
                const currentTurnIndex = activePlayers.indexOf(roomData.turn);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = firebase.database.ServerValue.TIMESTAMP;
            }
            return roomData;
        });
    }

    // =================================================================
    // ======== GAME OVER & REMATCH ========
    // =================================================================

    function displayGameOver(roomData) {
        showScreen('gameOver');
        const winnerId = roomData.winner;
        const isWinner = winnerId === currentPlayerId;
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

    function requestRematch() {
        ui.rematchBtn.disabled = true;
        ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
        db.ref(`rooms/${currentRoomId}/rematch/${currentPlayerId}`).set(true);
    }

    function resetGameForRematch(roomData) {
        showToast("เริ่มเกมใหม่อีกครั้ง!");
        const updates = {};
        updates[`rooms/${currentRoomId}/gameState`] = 'setup';
        updates[`rooms/${currentRoomId}/turn`] = roomData.turnOrder[0];
        updates[`rooms/${currentRoomId}/winner`] = null;
        updates[`rooms/${currentRoomId}/reason`] = null;
        updates[`rooms/${currentRoomId}/rematch`] = {};
        updates[`rooms/${currentRoomId}/lastAction`] = null;
        updates[`rooms/${currentRoomId}/turnStartTime`] = firebase.database.ServerValue.TIMESTAMP;
        
        Object.keys(roomData.players).forEach(playerId => {
            if (roomData.players[playerId].connected) {
                updates[`rooms/${currentRoomId}/players/${playerId}/numberSet`] = false;
                updates[`rooms/${currentRoomId}/players/${playerId}/finalChances`] = 3;
           