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
    let roomListener = null;
    let roomListListener = null;
    let currentGuess = [];
    let guessHistory = [];
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
        theirNumberDisplay: document.getElementById('their-number-display'),
        historyLog: document.getElementById('history-log'),
        guessNumberContainer: document.getElementById('guess-number-container'),
        numberPadContainer: document.getElementById('number-pad-container'),
        chanceDots: [document.getElementById('chance-1'), document.getElementById('chance-2'), document.getElementById('chance-3')],
        submitFinalAnswerBtn: document.getElementById('submit-final-answer-btn'),

        // Game Over
        gameOverTitle: document.getElementById('game-over-title'),
        winnerName: document.getElementById('winner-name'),
        gameOverMessage: document.getElementById('game-over-message'),
        finalOurNumber: document.getElementById('final-our-number'),
        finalTheirNumber: document.getElementById('final-their-number'),
        rematchBtn: document.getElementById('rematch-btn'),
        backToLobbyBtn: document.getElementById('back-to-lobby-btn'),

        // Misc
        toast: document.getElementById('toast')
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

    // =================================================================
    // ======== LOBBY & ROOM MANAGEMENT ========
    // =================================================================

    function setupInitialListeners() {
        screens.splash.addEventListener('click', () => {
            showScreen('lobby');
        });
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
            // เมื่อกดเริ่มเกม จะต้องสร้าง turnOrder และเปลี่ยน gameState
            db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
                if (roomData && roomData.gameState === 'waiting') {
                    // สร้างลำดับการเล่นจากผู้เล่นที่เชื่อมต่ออยู่
                    roomData.turnOrder = Object.values(roomData.players)
                                             .filter(p => p.connected)
                                             .map(p => p.id);
                    // กำหนดตาแรกเป็นของเจ้าของห้องเสมอ
                    roomData.turn = 'player1';
                    roomData.gameState = 'setup';
                }
                return roomData;
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
            roomName: roomName,
            hostName: hostName,
            password: password,
            players: {
                'player1': { id: 'player1', name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3 },
                'player2': { id: 'player2', name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3 },
                'player3': { id: 'player3', name: 'ผู้เล่น 3', connected: false, isHost: false, numberSet: false, finalChances: 3 },
                'player4': { id: 'player4', name: 'ผู้เล่น 4', connected: false, isHost: false, numberSet: false, finalChances: 3 }
            },
            playerCount: 1,
            gameState: 'waiting',
            turn: null, 
            turnOrder: [],
            rematch: {}
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

            if (roomData.players && roomData.players[currentPlayerId] && roomData.players[currentPlayerId].guesses) {
                guessHistory = Object.values(roomData.players[currentPlayerId].guesses).map(g => g.guess);
            } else {
                guessHistory = [];
            }

            const connectedPlayers = Object.values(roomData.players).filter(p => p.connected);
            if (roomData.rematch && Object.values(roomData.rematch).every(v => v === true) && Object.keys(roomData.rematch).length === connectedPlayers.length) {
                resetGameForRematch(roomData);
                return;
            }

            switch(roomData.gameState) {
                case 'waiting':
                    updateWaitingRoomUI(roomData);
                    break;
                case 'setup':
                    if (!screens.game.classList.contains('show')) {
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

    // *** แก้ไขแล้ว: ฟังก์ชัน updateWaitingRoomUI ***
    function updateWaitingRoomUI(roomData) {
        ui.roomCodeText.textContent = roomData.roomName;

        // วนลูปเพื่ออัปเดต UI ของผู้เล่นทุกคน
        for (const playerId in ui.playerSlots) {
            const slot = ui.playerSlots[playerId];
            const playerData = roomData.players[playerId];
            
            const avatar = slot.querySelector('.player-avatar-initial');
            const nameEl = slot.querySelector('.player-name');
            const statusEl = slot.querySelector('.player-status');

            if (playerData && playerData.connected) {
                // ถ้าผู้เล่นเชื่อมต่ออยู่
                avatar.textContent = playerData.name.charAt(0).toUpperCase();
                avatar.style.backgroundColor = playerData.isHost ? '#89cff0' : '#f8c8dc'; // สีฟ้าสำหรับ Host, สีชมพูสำหรับคนอื่น
                nameEl.textContent = playerData.isHost ? `${playerData.name} (เจ้าของห้อง)` : playerData.name;
                statusEl.textContent = 'เชื่อมต่อแล้ว';
                statusEl.className = 'player-status connected';
            } else {
                // ถ้าช่องว่าง
                const playerNumber = playerId.replace('player', '');
                avatar.textContent = '?';
                avatar.style.backgroundColor = '#e2e8f0'; // สีเทา
                nameEl.textContent = `ผู้เล่น ${playerNumber}`;
                statusEl.textContent = 'กำลังรอ...';
                statusEl.className = 'player-status waiting';
            }
        }

        // อัปเดตปุ่มเริ่มเกมและข้อความ
        if (currentPlayerId === 'player1') { // เฉพาะเจ้าของห้องที่เห็นปุ่ม
            if (roomData.playerCount >= 2) {
                ui.startGameBtn.disabled = false;
                ui.waitingMessage.textContent = `มีผู้เล่น ${roomData.playerCount} คน กดเริ่มเกมได้เลย!`;
            } else {
                ui.startGameBtn.disabled = true;
                ui.waitingMessage.textContent = 'รอผู้เล่นอย่างน้อย 2 คน...';
            }
        } else { // ผู้เล่นอื่นจะเห็นข้อความนี้
            ui.startGameBtn.disabled = true;
            ui.waitingMessage.textContent = 'รอเจ้าของห้องเริ่มเกม...';
        }
    }

    // *** ยังไม่ได้แก้ไข: ฟังก์ชัน updatePlayingUI ***
    function updatePlayingUI(roomData) {
        // ส่วนนี้ต้องแก้ไขเยอะมาก
        const opponentPlayerId = 'player2'; // สมมติว่าเล่นกับ player2 ไปก่อน
        const opponentNumber = roomData.players[opponentPlayerId].number;
        updateTurnIndicator(roomData);
        updateHistoryLog(roomData.players[currentPlayerId].guesses);
        updateChances(roomData.players[currentPlayerId].finalChances);
    }

    // *** ยังไม่ได้แก้ไข: ฟังก์ชัน updateGameOverUI ***
    function updateGameOverUI(roomData) {
        if (roomData.rematch[currentPlayerId]) {
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

    // *** ยังไม่ได้แก้ไข: ฟังก์ชัน initializeGameUI ***
    function initializeGameUI(roomData) {
        showScreen('game');
        ourNumber = generateRandomNumber();
        ui.ourNumberDisplay.innerHTML = '';
        ui.theirNumberDisplay.innerHTML = '';
        ui.guessNumberContainer.innerHTML = '';
        
        for (let i = 0; i < GUESS_LENGTH; i++) {
            ui.ourNumberDisplay.innerHTML += `<div class="number-input">${ourNumber[i]}</div>`;
            ui.theirNumberDisplay.innerHTML += `<div class="number-input">?</div>`;
            ui.guessNumberContainer.innerHTML += `<div class="number-input"></div>`;
        }
        
        createNumberPad();
        currentGuess = [];
        ui.historyLog.innerHTML = '';
        
        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ number: ourNumber.join(''), numberSet: true });
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
        if (ui.turnIndicator.classList.contains('their-turn')) {
            showToast("ยังไม่ถึงตาของคุณ!");
            return;
        }

        if (value === 'ลบ') {
            if (currentGuess.length > 0) {
                currentGuess.pop();
            }
        } else if (value === 'ทาย') {
            if (currentGuess.length === GUESS_LENGTH) {
                if (guessHistory.includes(currentGuess.join(''))) {
                    showToast("คุณเคยทายเลขนี้ไปแล้ว!");
                    return;
                }
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

    // *** ยังไม่ได้แก้ไข: ฟังก์ชัน submitGuess ***
    function submitGuess() {
        const guessString = currentGuess.join('');
        const opponentPlayerId = 'player2'; // สมมติว่าเล่นกับ player2 ไปก่อน
        const opponentNumber = '1234'; // ต้องหาวิธีดึงเลขของคนที่เราจะทาย
        const clues = calculateClues(currentGuess, opponentNumber.split(''));
        
        const guessData = {
            guess: guessString,
            strikes: clues.strikes,
            balls: clues.balls
        };

        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/guesses`).push(guessData);
        db.ref(`rooms/${currentRoomId}`).update({ turn: opponentPlayerId });

        currentGuess = [];
        updateGuessDisplay();
    }

    function calculateClues(guess, answer) {
        let strikes = 0;
        let balls = 0;
        const answerCopy = [...answer];
        const guessCopy = [...guess];

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

    function updateHistoryLog(guesses) {
        ui.historyLog.innerHTML = '';
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

    // *** ยังไม่ได้แก้ไข: ฟังก์ชัน submitFinalAnswer ***
    function submitFinalAnswer() {
        if (ui.turnIndicator.classList.contains('their-turn')) {
            showToast("ไม่สามารถส่งคำตอบในตาของเพื่อนได้!");
            return;
        }
        if (currentGuess.length !== GUESS_LENGTH) {
            showToast(`กรุณาใส่เลขคำตอบให้ครบ ${GUESS_LENGTH} ตัว`);
            return;
        }

        const finalAnswer = currentGuess.join('');
        const opponentPlayerId = 'player2'; // สมมติว่าเล่นกับ player2 ไปก่อน
        const opponentNumber = '1234'; // ต้องหาวิธีดึงเลขของคนที่เราจะทาย
        const updates = {};
        
        if (finalAnswer === opponentNumber) {
            updates[`rooms/${currentRoomId}/gameState`] = 'finished';
            updates[`rooms/${currentRoomId}/winner`] = currentPlayerId;
            updates[`rooms/${currentRoomId}/reason`] = `ทายเลข ${opponentNumber} ได้ถูกต้อง!`;
        } else {
            const chancesRef = db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/finalChances`);
            chancesRef.transaction(currentChances => {
                if (currentChances > 1) {
                    return currentChances - 1;
                }
                updates[`rooms/${currentRoomId}/gameState`] = 'finished';
                updates[`rooms/${currentRoomId}/winner`] = opponentPlayerId;
                db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/name`).get().then(snapshot => {
                    const playerName = snapshot.val();
                    updates[`rooms/${currentRoomId}/reason`] = `${playerName} ใช้โอกาสสุดท้ายพลาด!`;
                    db.ref().update(updates);
                });
                return 0;
            });
            showToast("คำตอบไม่ถูกต้อง! คุณเสียโอกาสไป 1 ครั้ง");
        }
        
        db.ref().update(updates);
        currentGuess = [];
        updateGuessDisplay();
    }

    function updateChances(chances) {
        for (let i = 0; i < 3; i++) {
            ui.chanceDots[i].classList.toggle('used', i >= chances);
        }
    }

    // *** ยังไม่ได้แก้ไข: ฟังก์ชัน updateTurnIndicator ***
    function updateTurnIndicator(roomData) {
        const currentTurn = roomData.turn;
        const isMyTurn = currentTurn === currentPlayerId;
        ui.turnIndicator.classList.toggle('my-turn', isMyTurn);
        ui.turnIndicator.classList.toggle('their-turn', !isMyTurn);
        
        if (isMyTurn) {
            ui.turnText.textContent = "ตาของคุณ";
        } else {
            const opponentName = roomData.players[currentTurn]?.name || 'เพื่อน';
            ui.turnText.textContent = `ตาของ ${opponentName}`;
        }
    }

    // =================================================================
    // ======== GAME OVER & REMATCH ========
    // =================================================================

    // *** ยังไม่ได้แก้ไข: ฟังก์ชัน displayGameOver ***
    function displayGameOver(roomData) {
        showScreen('gameOver');
        const isWinner = roomData.winner === currentPlayerId;
        const winnerName = roomData.players[roomData.winner].name;
        
        screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
        ui.gameOverTitle.textContent = isWinner ? "🎉 คุณชนะ! 🎉" : "คุณแพ้แล้ว";
        ui.winnerName.textContent = `ผู้ชนะคือ: ${winnerName}`;
        ui.gameOverMessage.textContent = roomData.reason;
        
        // ส่วนนี้ต้องแก้ไขเยอะมาก
        ui.finalOurNumber.textContent = roomData.players[currentPlayerId].number;
        const opponentPlayerId = 'player2'; // สมมติ
        ui.finalTheirNumber.textContent = roomData.players[opponentPlayerId].number;
    }

    function requestRematch() {
        ui.rematchBtn.disabled = true;
        ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
        db.ref(`rooms/${currentRoomId}/rematch/${currentPlayerId}`).set(true);
    }

    // *** ยังไม่ได้แก้ไข: ฟังก์ชัน resetGameForRematch ***
    function resetGameForRematch(roomData) {
        showToast("เริ่มเกมใหม่อีกครั้ง!");
        const updates = {};
        updates[`rooms/${currentRoomId}/gameState`] = 'setup';
        updates[`rooms/${currentRoomId}/turn`] = roomData.turnOrder[0];
        updates[`rooms/${currentRoomId}/winner`] = null;
        updates[`rooms/${currentRoomId}/reason`] = null;
        
        Object.keys(roomData.players).forEach(playerId => {
            if (roomData.players[playerId].connected) { // รีเซ็ตเฉพาะคนที่ยังอยู่
                updates[`rooms/${currentRoomId}/players/${playerId}/numberSet`] = false;
                updates[`rooms/${currentRoomId}/players/${playerId}/finalChances`] = 3;
                updates[`rooms/${currentRoomId}/players/${playerId}/guesses`] = null;
            }
            updates[`rooms/${currentRoomId}/rematch/${playerId}`] = false; // รีเซ็ตสถานะ rematch ทุกคน
        });

        db.ref().update(updates);
    }

    // =================================================================
    // ======== INITIALIZATION ========
    // =================================================================
    setupInitialListeners();
    showScreen('splash');
});
