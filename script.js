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
    const GUESS_LENGTH = 4;
    let isMuted = false;
    let turnTimerInterval = null;
    const TURN_DURATION = 20; // อัปเดตเวลาเป็น 20 วินาที

    // =================================================================
    // ======== AUDIO REFERENCES & FUNCTIONS ========
    // =================================================================
    const sounds = {
        join: new Audio('sounds/join.mp3'),
        leave: new Audio('sounds/leave.mp3'),
        gameStart: new Audio('sounds/game_start.mp3'),
        guess: new Audio('sounds/guess.mp3'),
        numberSet: new Audio('sounds/number_set.mp3'),
        clue: new Audio('sounds/clue.mp3'),
        win: new Audio('sounds/win.mp3'),
        lose: new Audio('sounds/lose.mp3'),
        knock: new Audio('sounds/knock.mp3'),
        error: new Audio('sounds/error.mp3'),
        rematch: new Audio('sounds/rematch.mp3'),
        turn: new Audio('sounds/turn.mp3')
    };

    function playSound(sound) {
        if (!isMuted && sounds[sound]) {
            sounds[sound].currentTime = 0;
            sounds[sound].play().catch(e => console.error("Error playing sound:", e));
        }
    }
    
    // =================================================================
    // ======== UI ELEMENTS & STATE ========
    // =================================================================
    const ui = {
        splashScreen: document.getElementById('splash-screen'),
        lobbyScreen: document.getElementById('lobby-screen'),
        gameScreen: document.getElementById('game-screen'),
        gameOverScreen: document.getElementById('game-over-screen'),
        
        createRoomBtn: document.getElementById('create-room-btn'),
        joinRoomBtn: document.getElementById('join-room-btn'),
        usernameInput: document.getElementById('username-input'),
        roomList: document.getElementById('room-list'),
        roomPasswordInput: document.getElementById('room-password-input'),
        joinRoomCodeInput: document.getElementById('join-room-code-input'),

        roomCodeDisplay: document.getElementById('room-code'),
        lobbyStatus: document.getElementById('lobby-status'),
        readyBtn: document.getElementById('ready-btn'),
        
        myNumberDisplay: document.getElementById('my-number-display'),
        numberSetupInput: document.getElementById('number-setup-input'),
        confirmNumberBtn: document.getElementById('confirm-number-btn'),
        
        turnIndicator: document.getElementById('turn-indicator'),
        turnTimer: document.getElementById('turn-timer'),
        
        guessNumberContainer: document.getElementById('guess-number-container'),
        numberPadContainer: document.getElementById('number-pad-container'),
        submitGuessBtn: document.getElementById('submit-guess-btn'),
        deleteGuessBtn: document.getElementById('delete-guess-btn'),
        
        myGuessesHistory: document.getElementById('my-guesses-history'),
        opponentInfoContainer: document.getElementById('opponent-info-container'),
        
        winnerDisplay: document.getElementById('winner-display'),
        rematchBtn: document.getElementById('rematch-btn'),
        endGameBtn: document.getElementById('end-game-btn'),
        
        passwordModal: document.getElementById('password-modal'),
        passwordModalInput: document.getElementById('password-modal-input'),
        passwordModalSubmitBtn: document.getElementById('password-modal-submit-btn'),
        passwordModalRoomName: document.getElementById('password-modal-room-name'),

        toast: document.getElementById('toast'),
        actionToast: document.getElementById('action-toast'),
        actionToastText: document.getElementById('action-toast-text'),
        soundControl: document.getElementById('sound-control'),
        soundIcon: document.getElementById('sound-icon'),
        
        // New UI for guesses on turn player
        playerSummaryGrid: document.getElementById('player-summary-grid'),
    };
    // =================================================================
    // ======== UTILITY & UI FUNCTIONS ========
    // =================================================================
    function showScreen(screenId) {
        document.querySelectorAll('.game-screen').forEach(screen => {
            screen.classList.remove('show');
        });
        document.getElementById(screenId + '-screen').classList.add('show');
    }

    function showToast(message) {
        ui.toast.textContent = message;
        ui.toast.classList.add('show');
        setTimeout(() => {
            ui.toast.classList.remove('show');
        }, 3000);
    }

    function showActionToast(message) {
        ui.actionToastText.textContent = message;
        ui.actionToast.classList.add('show');
        setTimeout(() => {
            ui.actionToast.classList.remove('show');
        }, 4000);
    }
    
    function generateNumberPad() {
        ui.numberPadContainer.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const button = document.createElement('button');
            button.className = 'number-pad-btn';
            button.textContent = i;
            button.addEventListener('click', () => {
                if (currentGuess.length < GUESS_LENGTH) {
                    currentGuess.push(i);
                    updateGuessDisplay();
                }
            });
            ui.numberPadContainer.appendChild(button);
        }
    }
    
    function updateGuessDisplay() {
        const inputs = ui.guessNumberContainer.children;
        for (let i = 0; i < GUESS_LENGTH; i++) {
            inputs[i].textContent = currentGuess[i] !== undefined ? currentGuess[i] : '';
        }
    }

    function calculateClues(guessArray, secretArray) {
        let strikes = 0;
        let balls = 0;
        const guessCount = {};
        const secretCount = {};

        // Calculate strikes and count numbers
        for (let i = 0; i < GUESS_LENGTH; i++) {
            if (guessArray[i] == secretArray[i]) {
                strikes++;
            } else {
                guessCount[guessArray[i]] = (guessCount[guessArray[i]] || 0) + 1;
                secretCount[secretArray[i]] = (secretCount[secretArray[i]] || 0) + 1;
            }
        }

        // Calculate balls
        for (const number in guessCount) {
            if (secretCount[number]) {
                balls += Math.min(guessCount[number], secretCount[number]);
            }
        }
        return { strikes, balls };
    }
    // =================================================================
    // ======== FIREBASE & GAME LOGIC FUNCTIONS ========
    // =================================================================
    function setupInitialListeners() {
        ui.createRoomBtn.addEventListener('click', createRoom);
        ui.joinRoomBtn.addEventListener('click', showRoomList);
        ui.passwordModalSubmitBtn.addEventListener('click', () => joinRoom(joiningRoomData.roomId, ui.passwordModalInput.value));
        ui.readyBtn.addEventListener('click', setPlayerReady);
        ui.confirmNumberBtn.addEventListener('click', confirmPlayerNumber);
        ui.submitGuessBtn.addEventListener('click', submitGuess);
        ui.deleteGuessBtn.addEventListener('click', () => {
            if (currentGuess.length > 0) {
                currentGuess.pop();
                updateGuessDisplay();
            }
        });
        ui.rematchBtn.addEventListener('click', requestRematch);
        ui.endGameBtn.addEventListener('click', () => window.location.reload());
        ui.soundControl.addEventListener('click', toggleSound);
        
        generateNumberPad();
    }

    function toggleSound() {
        isMuted = !isMuted;
        ui.soundIcon.textContent = isMuted ? '🔇' : '🔊';
        localStorage.setItem('isMuted', isMuted);
    }
    
    function createRoom() {
        const username = ui.usernameInput.value;
        if (!username) { showToast('กรุณากรอกชื่อผู้เล่น'); return; }

        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const roomRef = db.ref('rooms/' + roomId);
        
        const newRoomData = {
            status: 'waiting',
            players: {
                [username]: {
                    id: username,
                    name: username,
                    ready: false,
                    connected: true,
                    isHost: true,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                }
            },
            turnOrder: [],
            gameState: 'lobby',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            playerCount: 1
        };
        
        roomRef.set(newRoomData).then(() => {
            currentRoomId = roomId;
            currentPlayerId = username;
            setupRoomListener();
            showScreen('lobby');
            showToast('สร้างห้องสำเร็จ! รหัสห้องคือ ' + roomId);
        }).catch(error => {
            showToast("สร้างห้องไม่สำเร็จ: " + error.message);
        });
    }

    function showRoomList() {
        const username = ui.usernameInput.value;
        if (!username) { showToast('กรุณากรอกชื่อผู้เล่น'); return; }
        
        currentPlayerId = username;
        showScreen('lobby');
        ui.lobbyStatus.textContent = "กำลังค้นหาห้องที่เปิดอยู่...";
        ui.roomList.innerHTML = '';
        ui.roomCodeDisplay.textContent = 'เลือกห้องเข้าร่วม';
        ui.readyBtn.style.display = 'none';

        if (roomListListener) {
            db.ref('rooms').off('value', roomListListener);
        }

        roomListListener = db.ref('rooms').orderByChild('status').equalTo('waiting').on('value', snapshot => {
            ui.roomList.innerHTML = '';
            if (snapshot.exists()) {
                const rooms = snapshot.val();
                Object.keys(rooms).forEach(roomId => {
                    const room = rooms[roomId];
                    if (room.gameState === 'lobby') {
                        const roomItem = document.createElement('div');
                        roomItem.className = 'room-list-item';
                        roomItem.textContent = `ห้อง ${roomId} (${room.playerCount}/4) โดย ${Object.values(room.players).find(p => p.isHost)?.name || 'ไม่ระบุ'}`;
                        roomItem.addEventListener('click', () => {
                            joiningRoomData = { roomId: roomId, roomName: roomId };
                            if (room.password) {
                                ui.passwordModal.classList.add('show');
                                ui.passwordModalRoomName.textContent = roomItem.textContent;
                            } else {
                                joinRoom(roomId);
                            }
                        });
                        ui.roomList.appendChild(roomItem);
                    }
                });
            }
            if (ui.roomList.children.length === 0) {
                ui.lobbyStatus.textContent = 'ยังไม่มีห้องที่เปิดอยู่';
            } else {
                ui.lobbyStatus.textContent = 'เลือกห้องเพื่อเข้าร่วม';
            }
        });
    }
    
    function joinRoom(roomId, password = null) {
        db.ref(`rooms/${roomId}`).transaction(roomData => {
            if (roomData) {
                if (roomData.password && roomData.password !== password) {
                    showToast('รหัสผ่านไม่ถูกต้อง');
                    return; 
                }
                if (roomData.playerCount < 4 && roomData.gameState === 'lobby' && !roomData.players[currentPlayerId]) {
                    if (roomListListener) {
                        db.ref('rooms').off('value', roomListListener);
                        roomListListener = null;
                    }
                    if (ui.passwordModal.classList.contains('show')) {
                        ui.passwordModal.classList.remove('show');
                        ui.passwordModalInput.value = '';
                    }

                    roomData.players[currentPlayerId] = {
                        id: currentPlayerId,
                        name: currentPlayerId,
                        ready: false,
                        connected: true,
                        isHost: false,
                        lastSeen: firebase.database.ServerValue.TIMESTAMP
                    };
                    roomData.playerCount++;
                } else {
                    showToast('ห้องเต็มแล้ว หรือคุณอยู่ในห้องนี้แล้ว');
                    return;
                }
            }
            return roomData;
        }).then(() => {
            currentRoomId = roomId;
            setupRoomListener();
            showToast('เข้าร่วมห้องสำเร็จ!');
        });
    }
    
    function setupRoomListener() {
        if (roomListener) {
            db.ref(`rooms/${currentRoomId}`).off('value', roomListener);
        }
        
        roomListener = db.ref(`rooms/${currentRoomId}`).on('value', snapshot => {
            const roomData = snapshot.val();
            if (!roomData) {
                showToast("ห้องถูกลบไปแล้ว!");
                window.location.reload();
                return;
            }
            
            updateLobby(roomData);
            updateGame(roomData);
            
            // Check for game over
            if (roomData.gameState === 'gameOver' && !document.getElementById('game-over-screen').classList.contains('show')) {
                showScreen('gameOver');
                ui.winnerDisplay.textContent = roomData.winner ? `${roomData.winner} ชนะ!` : 'ไม่มีผู้ชนะ';
                ui.rematchBtn.style.display = roomData.players[currentPlayerId]?.isHost ? 'inline-block' : 'none';
            }

            // Check for game start
            if (roomData.gameState === 'playing' && !document.getElementById('game-screen').classList.contains('show')) {
                showScreen('game');
                playSound('gameStart');
            }
        });

        // Add a listener to handle player disconnection
        window.addEventListener('beforeunload', () => {
            if (currentRoomId && currentPlayerId) {
                db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/connected`).set(false);
            }
        });
    }

    function updateLobby(roomData) {
        if (!roomData || roomData.gameState !== 'lobby') return;

        showScreen('lobby');
        ui.roomCodeDisplay.textContent = `รหัสห้อง: ${currentRoomId}`;
        ui.readyBtn.style.display = 'block';

        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '';
        
        let allReady = true;
        Object.values(roomData.players).forEach(player => {
            const playerItem = document.createElement('li');
            playerItem.textContent = `${player.name} (${player.connected ? 'ออนไลน์' : 'ออฟไลน์'})`;
            playerItem.className = player.ready ? 'ready' : '';
            if (player.isHost) {
                playerItem.textContent += ' (เจ้าของห้อง)';
            }
            playerList.appendChild(playerItem);
            if (!player.ready) {
                allReady = false;
            }
        });

        if (allReady && roomData.playerCount > 1) {
            if (roomData.players[currentPlayerId]?.isHost) {
                // Host starts the game
                const turnOrder = Object.values(roomData.players)
                    .filter(p => p.connected)
                    .sort(() => Math.random() - 0.5)
                    .map(p => p.id);
                
                db.ref(`rooms/${currentRoomId}`).update({
                    gameState: 'setup',
                    turnOrder: turnOrder,
                    turn: turnOrder[0],
                    turnStartTime: firebase.database.ServerValue.TIMESTAMP
                });
                showToast("ผู้เล่นทุกคนพร้อมแล้ว! เริ่มการตั้งค่าเลขลับ");
            } else {
                showToast("ผู้เล่นทุกคนพร้อมแล้ว! รอเจ้าของห้องเริ่มเกม");
            }
        }
    }
    
    function setPlayerReady() {
        if (currentRoomId && currentPlayerId) {
            db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}/ready`).set(true);
            ui.readyBtn.disabled = true;
            ui.readyBtn.textContent = 'พร้อมแล้ว!';
        }
    }

    function confirmPlayerNumber() {
        const number = ui.numberSetupInput.value;
        if (number.length !== GUESS_LENGTH || !/^\d+$/.test(number) || new Set(number.split('')).size !== GUESS_LENGTH) {
            showToast(`กรุณากรอกเลข 4 หลักที่ไม่ซ้ำกัน`);
            return;
        }

        db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({
            number: number,
            numberSet: true,
            status: 'playing',
            finalChances: 3,
            guesses: null
        }).then(() => {
            showToast("ตั้งเลขลับสำเร็จ!");
        }).catch(error => {
            showToast("ตั้งเลขลับไม่สำเร็จ: " + error.message);
        });
    }
    
    function updateGame(roomData) {
        if (!roomData || roomData.gameState !== 'setup' && roomData.gameState !== 'playing') return;

        // Update player numbers and status
        const myData = roomData.players[currentPlayerId];
        
        // Show/hide number setup
        if (roomData.gameState === 'setup' && myData && !myData.numberSet) {
            document.getElementById('number-setup').style.display = 'block';
            document.getElementById('game-controls').style.display = 'none';
            ui.myNumberDisplay.textContent = 'ยังไม่ได้ตั้งเลขลับ';
        } else {
            document.getElementById('number-setup').style.display = 'none';
            document.getElementById('game-controls').style.display = 'block';
            ui.myNumberDisplay.textContent = `เลขลับของคุณ: ${myData.number || 'ยังไม่ได้ตั้ง'}`;
        }

        // Show/hide game controls
        const turnPlayerId = roomData.turn;
        const isMyTurn = turnPlayerId === currentPlayerId;

        // Logic for "everyone guesses turn player"
        if (isMyTurn) {
            ui.turnIndicator.textContent = 'ถึงตาคุณแล้ว! รอให้คนอื่นทาย';
            ui.turnIndicator.style.backgroundColor = 'var(--primary-color)';
            ui.guessNumberContainer.style.display = 'none';
            ui.numberPadContainer.style.display = 'none';
            ui.submitGuessBtn.style.display = 'none';
            ui.deleteGuessBtn.style.display = 'none';
        } else {
            ui.turnIndicator.textContent = `ถึงตา ${roomData.players[turnPlayerId].name} แล้ว!`;
            ui.turnIndicator.style.backgroundColor = 'var(--accent-color)';
            ui.guessNumberContainer.style.display = 'flex';
            ui.numberPadContainer.style.display = 'grid';
            ui.submitGuessBtn.style.display = 'block';
            ui.deleteGuessBtn.style.display = 'block';
        }

        // Update guesses and player history
        const allPlayers = Object.values(roomData.players);
        
        // Update my guess history (guesses made by others towards me)
        const myGuesses = myData?.guesses || {};
        ui.myGuessesHistory.innerHTML = '';
        Object.values(myGuesses).reverse().forEach(guess => {
            const guessItem = document.createElement('li');
            guessItem.className = 'guess-item';
            guessItem.textContent = `ทายโดย ${roomData.players[guess.by].name}: ${guess.guess} - ${guess.strikes}S ${guess.balls}B`;
            if (guess.strikes === GUESS_LENGTH) {
                guessItem.classList.add('win-guess');
            }
            ui.myGuessesHistory.appendChild(guessItem);
        });
        
        // Check for win/lose conditions
        if (myData && myData.status === 'playing') {
             // Check if I was guessed correctly
            const isGuessedCorrectly = Object.values(myGuesses).some(guess => guess.strikes === GUESS_LENGTH);
            if (isGuessedCorrectly) {
                db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ status: 'eliminated' });
                showToast("คุณถูกทายเลขถูก!");
                playSound('lose');
            } else if (myData.finalChances <= 0) {
                 db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`).update({ status: 'eliminated' });
                 showToast("โอกาสหมดแล้ว!");
                 playSound('lose');
            }
        }

        // Check for end of game
        const playingPlayers = allPlayers.filter(p => p.status === 'playing');
        if (playingPlayers.length <= 1 && roomData.gameState !== 'gameOver') {
            const winner = playingPlayers[0];
            db.ref(`rooms/${currentRoomId}`).update({
                gameState: 'gameOver',
                winner: winner?.name || null,
                reason: playingPlayers.length === 1 ? 'Last player remaining' : 'All eliminated'
            });
            playSound('win');
        }

        // Handle last action toast
        if (roomData.lastAction) {
            const { actorName, targetName, type, timestamp } = roomData.lastAction;
            const timeDiff = Date.now() - timestamp;
            if (timeDiff < 5000) {
                 if (type === 'guess') {
                    showActionToast(`${actorName} ทายเลข ${targetName}`);
                 } else if (type === 'pass') {
                    showActionToast(`${actorName} หมดเวลา!`);
                 } else if (type === 'win') {
                    showActionToast(`${actorName} ถูกทายเลขถูก!`);
                 }
            }
        }
    }

    // New logic for submitGuess
    function submitGuess() {
        const guessString = currentGuess.join('');
        const myData = roomData.players[currentPlayerId];
        const turnPlayerId = roomData.turn; // ผู้เล่นที่เป็นเจ้าของตา
        
        // ถ้าผู้เล่นคนปัจจุบันคือผู้ทายไม่ได้
        if (currentPlayerId === turnPlayerId) {
            showToast("คุณต้องเป็นผู้ตอบคำทาย!");
            return;
        }

        // ถ้าเป้าหมายที่ถูกทายไม่อยู่ในเกม
        if (roomData.players[turnPlayerId].status === 'eliminated') {
             showToast("ผู้เล่นคนนี้ออกจากเกมไปแล้ว!");
            return;
        }

        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData) {
                const turnPlayerNumber = roomData.players[turnPlayerId].number;
                const clues = calculateClues(currentGuess, turnPlayerNumber.split(''));
                const guessData = { guess: guessString, strikes: clues.strikes, balls: clues.balls, by: currentPlayerId };
                
                // บันทึกคำทายลงในประวัติของผู้เล่นที่เป็นเจ้าของตา
                const historyPath = `players/${turnPlayerId}/guesses`;
                if (!roomData.players[turnPlayerId].guesses) roomData.players[turnPlayerId].guesses = {};
                const newGuessKey = db.ref(`rooms/${currentRoomId}/${historyPath}`).push().key;
                roomData.players[turnPlayerId].guesses[newGuessKey] = guessData;

                // อัปเดตการแจ้งเตือน
                roomData.lastAction = { 
                    actorName: myData.name, 
                    targetName: roomData.players[turnPlayerId].name, 
                    type: 'guess', 
                    timestamp: Date.now() 
                };
            }
            return roomData;
        }).then(() => {
            currentGuess = [];
            updateGuessDisplay();
            showToast(`ส่งคำทายไปที่ ${roomData.players[turnPlayerId].name} แล้ว!`);
        });
    }

    function requestRematch() {
        if (currentRoomId && currentPlayerId) {
            ui.rematchBtn.disabled = true;
            ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
            db.ref(`rooms/${currentRoomId}/rematch/${currentPlayerId}`).set(true);
        }
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