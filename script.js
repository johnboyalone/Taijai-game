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
    let joiningRoomData = null; // Stores {id, name} of the room being joined
    let currentPlayerId = null;
    let opponentPlayerId = null;
    let ourNumber = null;
    let opponentNumber = null;
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
        player1Slot: document.getElementById('player1-slot'),
        player2Slot: document.getElementById('player2-slot'),
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

    function enterFullScreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.log(err));
        else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
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
            enterFullScreen();
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
            db.ref(`rooms/${currentRoomId}`).update({ gameState: 'setup' });
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
        opponentPlayerId = 'player2';
        currentRoomId = newRoomId;

        const roomData = {
            roomName, hostName, password,
            player1: { name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3 },
            player2: { name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3 },
            gameState: 'waiting', turn: 'player1', rematch: { player1: false, player2: false }
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
                const roomItem = document.createElement('div');
                roomItem.className = 'room-item';
                roomItem.innerHTML = `<div class="room-info"><div class="room-name">${roomData.roomName}</div><div class="host-name">สร้างโดย: ${roomData.hostName}</div></div><div class="room-status">ว่าง</div>`;
                roomItem.addEventListener('click', () => {
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
        currentPlayerId = 'player2';
        opponentPlayerId = 'player1';
        currentRoomId = roomId;
        if (roomListListener) db.ref('rooms').off('value', roomListListener);
        
        db.ref(`rooms/${roomId}/player2`).update({ connected: true, name: joinerName }).then(() => {
            showToast(`เข้าร่วมห้องสำเร็จ!`);
            listenToRoomUpdates();
            showScreen('waiting');
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

            if (roomData.rematch.player1 && roomData.rematch.player2) {
                resetGameForRematch();
                return;
            }

            switch(roomData.gameState) {
                case 'waiting':
                    updateWaitingRoomUI(roomData);
                    break;
                case 'setup':
                    if (!screens.game.classList.contains('show')) {
                        initializeGameUI();
                    }
                    if (roomData.player1.numberSet && roomData.player2.numberSet) {
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
        ui.player1Slot.querySelector('.player-name').textContent = `${roomData.player1.name} (เจ้าของห้อง)`;
        const p2Slot = ui.player2Slot;
        if (roomData.player2.connected) {
            p2Slot.querySelector('.player-name').textContent = roomData.player2.name;
            p2Slot.querySelector('.player-status').textContent = 'เชื่อมต่อแล้ว';
            p2Slot.querySelector('.player-status').className = 'player-status connected';
            if (currentPlayerId === 'player1') {
                ui.startGameBtn.disabled = false;
                ui.waitingMessage.textContent = 'เพื่อนของคุณพร้อมแล้ว กดเริ่มเกมได้เลย!';
            } else {
                ui.waitingMessage.textContent = 'รอเจ้าของห้องเริ่มเกม...';
            }
        }
    }

    function updatePlayingUI(roomData) {
        opponentNumber = roomData[opponentPlayerId].number;
        updateTurnIndicator(roomData.turn);
        updateHistoryLog(roomData[currentPlayerId].guesses);
        updateChances(roomData[currentPlayerId].finalChances);
    }

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

    function initializeGameUI() {
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
        
        db.ref(`rooms/${currentRoomId}/${currentPlayerId}`).update({ number: ourNumber.join(''), numberSet: true });
        showToast('เกมเริ่ม! นี่คือเลขของคุณ');
    }

    // *** LOGIC CHANGE: ALLOW DUPLICATE NUMBERS ***
    function generateRandomNumber() {
        let result = [];
        for (let i = 0; i < GUESS_LENGTH; i++) {
            // Just pick a random digit from 0-9 for each slot
            result.push(Math.floor(Math.random() * 10).toString());
        }
        return result;
    }

    function createNumberPad() {
        ui.numberPadContainer.innerHTML = '';
        // Re-ordered for a 3x3 grid + special buttons at the bottom
        const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ลบ', '0', 'ทาย'];
        buttons.forEach(val => {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = val;
            cell.dataset.value = val; // Add data-value for CSS targeting
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
                submitGuess();
            } else {
                showToast(`กรุณาใส่เลขให้ครบ ${GUESS_LENGTH} ตัว`);
            }
        } else {
            if (currentGuess.length < GUESS_LENGTH) {
                // *** LOGIC CHANGE: REMOVED CHECK FOR DUPLICATE GUESSES ***
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
        const guessString = currentGuess.join('');
        const clues = calculateClues(currentGuess, opponentNumber.split(''));
        
        const guessData = {
            guess: guessString,
            strikes: clues.strikes,
            balls: clues.balls
        };

        db.ref(`rooms/${currentRoomId}/${currentPlayerId}/guesses`).push(guessData);
        db.ref(`rooms/${currentRoomId}`).update({ turn: opponentPlayerId });

        currentGuess = [];
        updateGuessDisplay();
    }

    function calculateClues(guess, answer) {
        let strikes = 0;
        let balls = 0;
        let checkedAnswerIndexes = []; // Keep track of answer digits already used for a ball
        let checkedGuessIndexes = []; // Keep track of guess digits that are strikes

        // First pass: find all strikes
        guess.forEach((digit, index) => {
            if (digit === answer[index]) {
                strikes++;
                checkedAnswerIndexes.push(index);
                checkedGuessIndexes.push(index);
            }
        });

        // Second pass: find all balls
        guess.forEach((digit, index) => {
            // Only check if this guess digit was not a strike
            if (!checkedGuessIndexes.includes(index)) {
                // Find the first matching digit in the answer that is not a strike and not already a ball
                const ballIndex = answer.findIndex((ansDigit, ansIndex) => 
                    !checkedAnswerIndexes.includes(ansIndex) && ansDigit === digit
                );

                if (ballIndex !== -1) {
                    balls++;
                    checkedAnswerIndexes.push(ballIndex); // Mark this answer digit as used for a ball
                }
            }
        });
        
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
    }

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
        const updates = {};
        
        if (finalAnswer === opponentNumber) {
            updates[`rooms/${currentRoomId}/gameState`] = 'finished';
            updates[`rooms/${currentRoomId}/winner`] = currentPlayerId;
            updates[`rooms/${currentRoomId}/reason`] = `ทายเลข ${opponentNumber} ได้ถูกต้อง!`;
        } else {
            const chancesRef = db.ref(`rooms/${currentRoomId}/${currentPlayerId}/finalChances`);
            chancesRef.transaction(currentChances => {
                if (currentChances > 1) {
                    return currentChances - 1;
                }
                updates[`rooms/${currentRoomId}/gameState`] = 'finished';
                updates[`rooms/${currentRoomId}/winner`] = opponentPlayerId;
                db.ref(`rooms/${currentRoomId}/${currentPlayerId}/name`).get().then(snapshot => {
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

    function updateTurnIndicator(currentTurn) {
        const isMyTurn = currentTurn === currentPlayerId;
        db.ref(`rooms/${currentRoomId}/${opponentPlayerId}/name`).get().then(snapshot => {
            const opponentName = snapshot.val() || 'เพื่อน';
            ui.turnIndicator.classList.toggle('my-turn', isMyTurn);
            ui.turnIndicator.classList.toggle('their-turn', !isMyTurn);
            ui.turnText.textContent = isMyTurn ? "ตาของคุณ" : `ตาของ ${opponentName}`;
        });
    }

    // =================================================================
    // ======== GAME OVER & REMATCH ========
    // =================================================================

    function displayGameOver(roomData) {
        showScreen('gameOver');
        const isWinner = roomData.winner === currentPlayerId;
        const winnerName = roomData[roomData.winner].name;
        
        screens.gameOver.className = `game-screen show ${isWinner ? 'win' : 'lose'}`;
        ui.gameOverTitle.textContent = isWinner ? "🎉 คุณชนะ! 🎉" : "คุณแพ้แล้ว";
        ui.winnerName.textContent = `ผู้ชนะคือ: ${winnerName}`;
        ui.gameOverMessage.textContent = roomData.reason;
        ui.finalOurNumber.textContent = roomData.player1.number;
        ui.finalTheirNumber.textContent = roomData.player2.number;
    }

    function requestRematch() {
        ui.rematchBtn.disabled = true;
        ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
        db.ref(`rooms/${currentRoomId}/rematch/${currentPlayerId}`).set(true);
    }

    function resetGameForRematch() {
        showToast("เริ่มเกมใหม่อีกครั้ง!");
        const updates = {
            [`rooms/${currentRoomId}/gameState`]: 'setup',
            [`rooms/${currentRoomId}/player1/numberSet`]: false,
            [`rooms/${currentRoomId}/player2/numberSet`]: false,
            [`rooms/${currentRoomId}/player1/finalChances`]: 3,
            [`rooms/${currentRoomId}/player2/finalChances`]: 3,
            [`rooms/${currentRoomId}/rematch/player1`]: false,
            [`rooms/${currentRoomId}/rematch/player2`]: false,
            [`rooms/${currentRoomId}/turn`]: 'player1',
            [`rooms/${currentRoomId}/player1/guesses`]: null,
            [`rooms/${currentRoomId}/player2/guesses`]: null,
            [`rooms/${currentRoomId}/winner`]: null,
            [`rooms/${currentRoomId}/reason`]: null
        };
        db.ref().update(updates);
    }

    // =================================================================
    // ======== INITIALIZATION ========
    // =================================================================
    setupInitialListeners();
    showScreen('splash');
});
