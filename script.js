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
    
    function showActionToast(message, duration = 2000) {
        ui.actionToastText.innerHTML = message;
        ui.actionToast.classList.add('show');
        setTimeout(() => ui.actionToast.classList.remove('show'), duration);
    }

    // =================================================================
    // ======== LOBBY & ROOM MANAGEMENT ========
    // =================================================================

    function setupInitialListeners() {
        screens.splash.addEventListener('click', () => showScreen('lobby'));
        ui.goToCreateBtn.addEventListener('click', () => showScreen('createRoom'));
        ui.goToJoinBtn.addEventListener('click', () => {
            showScreen('roomList');
            loadAndDisplayRooms();
        });
        ui.confirmCreateBtn.addEventListener('click', createRoom);
        ui.passwordModalSubmitBtn.addEventListener('click', handlePasswordSubmit);
        ui.passwordModal.addEventListener('click', function(e) { if(e.target === this) this.classList.remove('show'); });
        ui.confirmJoinBtn.addEventListener('click', joinRoom);
        
        ui.startGameBtn.addEventListener('click', () => {
            if (ui.startGameBtn.disabled) return;

            db.ref(`rooms/${currentRoomId}`).get().then(snapshot => {
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    if (roomData.gameState === 'waiting') {
                        const connectedPlayerIds = Object.values(roomData.players)
                                                       .filter(p => p.connected)
                                                       .map(p => p.id);
                        
                        const updates = {
                            gameState: 'setup',
                            turnOrder: connectedPlayerIds,
                            turn: connectedPlayerIds[0],
                            lastAction: null
                        };

                        db.ref(`rooms/${currentRoomId}`).update(updates);
                    }
                }
            });
        });

        ui.submitFinalAnswerBtn.addEventListener('click', submitFinalAnswer);
        ui.rematchBtn.addEventListener('click', requestRematch);
        ui.backToLobbyBtn.addEventListener('click', () => window.location.reload());
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
                if (type === 'guess') {
                    message = `<strong>${actorName}</strong> กำลังทายเลขของ <strong>${targetName}</strong>`;
                } else if (type === 'final_correct') {
                    message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ถูกต้อง!`;
                } else if (type === 'final_wrong') {
                    message = `<strong>${actorName}</strong> ทายเลขของ <strong>${targetName}</strong> ผิด!`;
                }
                showActionToast(message);
            }

            switch(roomData.gameState) {
                case 'waiting':
                    updateWaitingRoomUI(roomData);
                    break;
                case 'setup':
                    if (!screens.game.classList.contains('show') || screens.gameOver.classList.contains('show')) {
                        initializeGameUI(roomData);
                    }
                    const allPlayersSetNumber = connectedPlayers.every(p => p.numberSet);
                    if (allPlayersSetNumber) {
                        db.ref(`rooms/${currentRoomId}`).update({ gameState: 'playing' });
                    }
                    break;
                case 'playing':
                    updatePlayingUI(roomData);
                    break;
                case 'finished':
                    if (!screens.gameOver.classList.contains('show')) {
                        displayGameOver(roomData);
                    }
                    updateGameOverUI(roomData);
                    break;
            }
        });
    }
    function updateWaitingRoomUI(roomData) {
        ui.roomCodeText.textContent = roomData.roomName;
        const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);

        Object.values(ui.playerSlots).forEach(slot => slot.style.display = 'none');

        connectedPlayers.forEach(player => {
            const slot = ui.playerSlots[player.id];
            slot.style.display = 'flex';
            slot.querySelector('.player-name').textContent = `${player.name} ${player.isHost ? '(เจ้าของห้อง)' : ''}`;
            slot.querySelector('.player-status').textContent = 'เชื่อมต่อแล้ว';
            slot.querySelector('.player-status').className = 'player-status connected';
        });

        if (currentPlayerId === 'player1') {
            if (connectedPlayers.length >= 2) {
                ui.startGameBtn.disabled = false;
                ui.waitingMessage.textContent = 'พร้อมแล้วกด "เริ่มเกม" ได้เลย!';
            } else {
                ui.startGameBtn.disabled = true;
                ui.waitingMessage.textContent = 'รอผู้เล่นอย่างน้อย 2 คนเพื่อเริ่มเกม...';
            }
        } else {
            ui.waitingMessage.textContent = 'รอเจ้าของห้องเริ่มเกม...';
        }
    }

    function updatePlayingUI(roomData) {
        const myPlayer = roomData.players[currentPlayerId];
        
        if (myPlayer.status === 'eliminated') {
            ui.spectatorOverlay.classList.add('show');
            ui.spectatorMessage.textContent = "คุณแพ้แล้ว! กำลังรับชมผู้เล่นที่เหลือ...";
        } else {
            ui.spectatorOverlay.classList.remove('show');
        }

        updateTurnIndicator(roomData);
        updatePlayerSummaryGrid(roomData);
        updateHistoryLog(roomData);
        updateChances(myPlayer.finalChances);
    }

    function updateGameOverUI(roomData) {
        const myPlayer = roomData.players[currentPlayerId];
        if (roomData.rematch && roomData.rematch[myPlayer.id]) {
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
        const myNumber = generateRandomNumber();
        ui.ourNumberDisplay.innerHTML = '';
        myNumber.forEach(digit => {
            ui.ourNumberDisplay.innerHTML += `<div class="number-input">${digit}</div>`;
        });
        
        createNumberPad();
        currentGuess = [];
        updateGuessDisplay();
        
        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ number: myNumber.join(''), numberSet: true });
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
        const isMyTurn = ui.turnIndicator.classList.contains('my-turn');
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
            showToast("กรุณาเลือกเป้าหมายที่จะทายก่อน");
            return;
        }
        const guessString = currentGuess.join('');

        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/guesses/${currentTargetId}`).once('value', snapshot => {
            const history = snapshot.val() || [];
            if (Object.values(history).some(item => item.guess === guessString)) {
                showToast("คุณเคยทายเลขนี้ไปแล้ว!");
                return;
            }

            db.ref(`rooms/${currentRoomId}/players/${currentTargetId}/number`).get().then(snapshot => {
                const opponentNumber = snapshot.val();
                const clues = calculateClues(currentGuess, opponentNumber.split(''));
                
                const guessData = {
                    guess: guessString,
                    strikes: clues.strikes,
                    balls: clues.balls
                };

                const updates = {};
                updates[`rooms/${currentRoomId}/players/${currentPlayerId}/guesses/${currentTargetId}/${Date.now()}`] = guessData;
                updates[`rooms/${currentRoomId}/turn`] = getNextTurn();
                updates[`rooms/${currentRoomId}/lastAction`] = {
                    actorName: document.querySelector(`#player-summary-${currentPlayerId} .player-summary-name`).textContent,
                    targetName: document.querySelector(`#player-summary-${currentTargetId} .player-summary-name`).textContent,
                    type: 'guess',
                    timestamp: Date.now()
                };
                db.ref().update(updates);

                currentGuess = [];
                updateGuessDisplay();
            });
        });
    }

    function calculateClues(guess, answer) {
        let strikes = 0;
        let balls = 0;
        const guessCopy = [...guess];
        const answerCopy = [...answer];

        // Calculate strikes
        for (let i = guessCopy.length - 1; i >= 0; i--) {
            if (guessCopy[i] === answerCopy[i]) {
                strikes++;
                guessCopy.splice(i, 1);
                answerCopy.splice(i, 1);
            }
        }

        // Calculate balls
        for (let i = 0; i < guessCopy.length; i++) {
            const ballIndex = answerCopy.indexOf(guessCopy[i]);
            if (ballIndex !== -1) {
                balls++;
                answerCopy.splice(ballIndex, 1);
            }
        }
        return { strikes, balls };
    }

    function updateHistoryLog(roomData) {
        ui.historyLog.innerHTML = '';
        if (!currentTargetId) {
            ui.historyTargetName.textContent = '(เลือกเป้าหมาย)';
            return;
        }
        
        const targetName = roomData.players[currentTargetId].name;
        ui.historyTargetName.textContent = `(${targetName})`;

        const guesses = roomData.players[currentPlayerId].guesses?.[currentTargetId];
        if (!guesses) return;

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
        const isMyTurn = ui.turnIndicator.classList.contains('my-turn');
        if (!isMyTurn) {
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

        const finalAnswer = currentGuess.join('');
        const updates = {};
        
        db.ref(`rooms/${currentRoomId}/players/${currentTargetId}/number`).get().then(snapshot => {
            const opponentNumber = snapshot.val();
            const actorName = document.querySelector(`#player-summary-${currentPlayerId} .player-summary-name`).textContent;
            const targetName = document.querySelector(`#player-summary-${currentTargetId} .player-summary-name`).textContent;

            if (finalAnswer === opponentNumber) {
                updates[`rooms/${currentRoomId}/players/${currentTargetId}/status`] = 'eliminated';
                updates[`rooms/${currentRoomId}/lastAction`] = { actorName, targetName, type: 'final_correct', timestamp: Date.now() };
                
                const remainingPlayers = Object.values(document.querySelectorAll('.player-summary-box:not(.eliminated)'));
                if (remainingPlayers.length <= 2) { // Will be 2 before this update, 1 after
                    updates[`rooms/${currentRoomId}/gameState`] = 'finished';
                    updates[`rooms/${currentRoomId}/winner`] = currentPlayerId;
                    updates[`rooms/${currentRoomId}/reason`] = `${actorName} เป็นผู้ชนะคนสุดท้าย!`;
                } else {
                    updates[`rooms/${currentRoomId}/turn`] = getNextTurn();
                }
            } else {
                updates[`rooms/${currentRoomId}/lastAction`] = { actorName, targetName, type: 'final_wrong', timestamp: Date.now() };
                const chancesRef = db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/finalChances`);
                chancesRef.transaction(currentChances => {
                    if (currentChances > 1) {
                        return currentChances - 1;
                    }
                    updates[`rooms/${currentRoomId}/players/${currentPlayerId}/status`] = 'eliminated';
                    
                    const remainingPlayers = Object.values(document.querySelectorAll('.player-summary-box:not(.eliminated)'));
                    if (remainingPlayers.length <= 2) {
                        updates[`rooms/${currentRoomId}/gameState`] = 'finished';
                        updates[`rooms/${currentRoomId}/winner`] = remainingPlayers.find(p => p.id.split('-')[2] !== currentPlayerId).id.split('-')[2];
                        updates[`rooms/${currentRoomId}/reason`] = `${actorName} ใช้โอกาสสุดท้ายพลาดและแพ้ไป!`;
                    } else {
                       updates[`rooms/${currentRoomId}/turn`] = getNextTurn();
                    }
                    db.ref().update(updates);
                    return 0;
                });
                showToast("คำตอบไม่ถูกต้อง! คุณเสียโอกาสไป 1 ครั้ง");
            }
            
            db.ref().update(updates);
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
        const currentTurnPlayerId = roomData.turn;
        const turnPlayer = roomData.players[currentTurnPlayerId];
        const isMyTurn = currentTurnPlayerId === currentPlayerId;
        
        ui.turnIndicator.classList.toggle('my-turn', isMyTurn);
        ui.turnIndicator.classList.toggle('their-turn', !isMyTurn);
        ui.turnText.textContent = isMyTurn ? "ตาของคุณ" : `ตาทายของ ${turnPlayer.name}`;
    }

    function updatePlayerSummaryGrid(roomData) {
        ui.playerSummaryGrid.innerHTML = '';
        const playingPlayers = Object.values(roomData.players).filter(p => p.connected);

        playingPlayers.forEach(player => {
            const playerBox = document.createElement('div');
            playerBox.className = 'player-summary-box';
            playerBox.id = `player-summary-${player.id}`;
            
            if (player.status === 'eliminated') {
                playerBox.classList.add('eliminated');
            }
            if (player.id === currentPlayerId) {
                playerBox.classList.add('is-me');
            }
            if (player.id === currentTargetId) {
                playerBox.classList.add('selected');
            }

            playerBox.innerHTML = `<div class="player-summary-name">${player.name}</div><div class="player-summary-status">${player.status === 'eliminated' ? 'แพ้แล้ว' : 'กำลังเล่น'}</div>`;
            
            if (player.id !== currentPlayerId && player.status !== 'eliminated') {
                playerBox.addEventListener('click', () => {
                    currentTargetId = player.id;
                    updatePlayingUI(roomData); // Re-render to show selection
                });
            }
            ui.playerSummaryGrid.appendChild(playerBox);
        });
    }

    function getNextTurn() {
        const turnOrder = Array.from(document.querySelectorAll('.player-summary-box:not(.eliminated)'))
                               .map(box => box.id.split('-')[2]);
        const currentTurn = document.querySelector('.my-turn') ? currentPlayerId : document.querySelector('.their-turn') ? document.querySelector('.their-turn').id.split('-')[2] : null;
        
        if (!currentTurn || turnOrder.length === 0) return turnOrder[0] || null;

        const currentIndex = turnOrder.indexOf(currentTurn);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        return turnOrder[nextIndex];
    }

    // =================================================================
    // ======== GAME OVER & REMATCH ========
    // =================================================================

    function displayGameOver(roomData) {
        showScreen('gameOver');
        const winnerPlayer = roomData.players[roomData.winner];
        const isWinner = roomData.winner === currentPlayerId;
        
        screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
        ui.gameOverTitle.textContent = isWinner ? "🎉 คุณชนะ! 🎉" : "จบเกมแล้ว";
        ui.winnerName.textContent = `ผู้ชนะคือ: ${winnerPlayer.name}`;
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
        
        Object.keys(roomData.players).forEach(playerId => {
            if (roomData.players[playerId].connected) {
                updates[`rooms/${currentRoomId}/players/${playerId}/numberSet`] = false;
                updates[`rooms/${currentRoomId}/players/${playerId}/finalChances`] = 3;
                updates[`rooms/${currentRoomId}/players/${playerId}/status`] = 'playing';
                updates[`rooms/${currentRoomId}/players/${playerId}/guesses`] = null;
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
