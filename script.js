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
    let isMuted = localStorage.getItem('isMuted') === 'true';
    let turnTimerInterval = null;
    const TURN_DURATION = 20;

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
        roomCodeDisplay: document.getElementById('room-code'),
        lobbyStatus: document.getElementById('lobby-status'),
        readyBtn: document.getElementById('ready-btn'),
        playerList: document.getElementById('player-list'),
        
        myNumberDisplay: document.getElementById('my-number-display'),
        numberSetup: document.getElementById('number-setup'),
        numberSetupInput: document.getElementById('number-setup-input'),
        confirmNumberBtn: document.getElementById('confirm-number-btn'),
        
        gameControls: document.getElementById('game-controls'),
        turnIndicator: document.getElementById('turn-indicator'),
        turnTimer: document.getElementById('turn-timer'),
        
        guessNumberContainer: document.getElementById('guess-number-container'),
        numberPadContainer: document.getElementById('number-pad-container'),
        submitGuessBtn: document.getElementById('submit-guess-btn'),
        deleteGuessBtn: document.getElementById('delete-guess-btn'),
        
        myGuessesHistory: document.getElementById('my-guesses-history'),
        
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
    };

    // =================================================================
    // ======== UTILITY & UI FUNCTIONS ========
    // =================================================================
    function showScreen(screenId) {
        document.querySelectorAll('.game-screen').forEach(screen => {
            screen.classList.remove('show');
        });
        const screenToShow = document.getElementById(screenId + '-screen');
        if (screenToShow) {
            screenToShow.classList.add('show');
        } else {
            console.error("Screen not found:", screenId + '-screen');
        }
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
            // ใน CSS ไม่มี .number-pad-btn แต่มี .number-cell, .number-grid
            // เพื่อให้เข้ากับ HTML ควรใช้ class ที่มีอยู่
            button.className = 'number-cell'; 
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

        const secretStringArray = String(secretArray).split('');

        for (let i = 0; i < GUESS_LENGTH; i++) {
            if (String(guessArray[i]) === secretStringArray[i]) {
                strikes++;
            } else {
                guessCount[guessArray[i]] = (guessCount[guessArray[i]] || 0) + 1;
                secretCount[secretStringArray[i]] = (secretCount[secretStringArray[i]] || 0) + 1;
            }
        }

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
        ui.passwordModalSubmitBtn.addEventListener('click', () => {
            if (joiningRoomData) {
                joinRoom(joiningRoomData.roomId, ui.passwordModalInput.value);
            }
        });
        ui.soundControl.addEventListener('click', toggleSound);
        
        generateNumberPad();
        updateSoundIcon();
    }

    function toggleSound() {
        isMuted = !isMuted;
        localStorage.setItem('isMuted', isMuted);
        updateSoundIcon();
    }

    function updateSoundIcon() {
        ui.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    }
    
    function createRoom() {
        const username = ui.usernameInput.value.trim();
        if (!username) { 
            showToast('กรุณากรอกชื่อผู้เล่น'); 
            return; 
        }

        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const roomRef = db.ref('rooms/' + roomId);
        
        currentPlayerId = username;

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
            setupRoomListener();
            showScreen('lobby');
            showToast('สร้างห้องสำเร็จ! รหัสห้องคือ ' + roomId);
        }).catch(error => {
            showToast("สร้างห้องไม่สำเร็จ: " + error.message);
        });
    }

    function showRoomList() {
        const username = ui.usernameInput.value.trim();
        if (!username) { 
            showToast('กรุณากรอกชื่อผู้เล่น'); 
            return; 
        }
        
        currentPlayerId = username;
        showScreen('lobby');
        ui.lobbyStatus.textContent = "กำลังค้นหาห้องที่เปิดอยู่...";
        ui.roomList.innerHTML = '';
        ui.roomCodeDisplay.textContent = 'เลือกห้องเข้าร่วม';
        ui.readyBtn.style.display = 'none';
        ui.playerList.style.display = 'none';

        if (roomListListener) {
            db.ref('rooms').off('value', roomListListener);
        }

        roomListListener = db.ref('rooms').orderByChild('status').equalTo('waiting').on('value', snapshot => {
            ui.roomList.innerHTML = '';
            if (snapshot.exists()) {
                const rooms = snapshot.val();
                let roomFound = false;
                Object.keys(rooms).forEach(roomId => {
                    const room = rooms[roomId];
                    if (room.gameState === 'lobby' && room.playerCount < 4) {
                        roomFound = true;
                        const roomItem = document.createElement('div');
                        roomItem.className = 'room-list-item';
                        const host = Object.values(room.players).find(p => p.isHost);
                        roomItem.innerHTML = `
                            <span>ห้อง ${roomId} (${room.playerCount}/4)</span>
                            <span>โดย ${host ? host.name : 'ไม่ระบุ'}</span>
                        `;
                        roomItem.addEventListener('click', () => {
                            joiningRoomData = { roomId: roomId };
                            joinRoom(roomId);
                        });
                        ui.roomList.appendChild(roomItem);
                    }
                });
                 if (!
    function joinRoom(roomId, password = null) {
        db.ref(`rooms/${roomId}`).transaction(roomData => {
            if (!roomData) {
                showToast('ห้องนี้ไม่มีอยู่แล้ว');
                return; 
            }
            if (roomData.gameState !== 'lobby') {
                showToast('ไม่สามารถเข้าร่วมห้องที่เริ่มเกมไปแล้วได้');
                return;
            }
            if (roomData.playerCount >= 4) {
                showToast('ห้องเต็มแล้ว');
                return;
            }
            if (roomData.players && roomData.players[currentPlayerId]) {
                showToast('คุณมีชื่อซ้ำกับผู้เล่นในห้องนี้');
                return;
            }

            if (!roomData.players) roomData.players = {};
            roomData.players[currentPlayerId] = {
                id: currentPlayerId,
                name: currentPlayerId,
                ready: false,
                connected: true,
                isHost: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            };
            roomData.playerCount = (roomData.playerCount || 0) + 1;
            return roomData;

        }, (error, committed, snapshot) => {
            if (error) {
                showToast('เข้าร่วมห้องไม่สำเร็จ: ' + error.message);
            } else if (committed) {
                if (roomListListener) {
                    db.ref('rooms').off('value', roomListListener);
                    roomListListener = null;
                }
                currentRoomId = roomId;
                setupRoomListener();
                showToast('เข้าร่วมห้องสำเร็จ!');
                showScreen('lobby');
            }
        });
    }
    
    function setupRoomListener() {
        if (roomListener) {
            db.ref(`rooms/${currentRoomId}`).off('value', roomListener);
        }
        
        const roomRef = db.ref(`rooms/${currentRoomId}`);
        roomListener = roomRef.on('value', snapshot => {
            const roomData = snapshot.val();
            if (!roomData) {
                showToast("ห้องถูกลบไปแล้ว!");
                setTimeout(() => window.location.reload(), 2000);
                return;
            }
            
            // อัปเดต UI ตาม gameState
            if (roomData.gameState === 'lobby') {
                updateLobby(roomData);
            } else if (roomData.gameState === 'setup' || roomData.gameState === 'playing') {
                updateGame(roomData);
            } else if (roomData.gameState === 'gameOver') {
                updateGameOver(roomData);
            }

            // ตรวจสอบการเริ่มเกม
            if (roomData.gameState === 'setup' && ui.gameScreen.classList.contains('show') === false) {
                showScreen('game');
                playSound('gameStart');
            }
        });

        // จัดการเมื่อผู้เล่นปิดหน้าต่าง
        const playerRef = db.ref(`rooms/${currentRoomId}/players/${currentPlayerId}`);
        playerRef.onDisconnect().update({ connected: false });
        window.addEventListener('beforeunload', () => {
            playerRef.onDisconnect().cancel(); // ยกเลิก onDisconnect ถ้าปิดปกติ
            playerRef.update({ connected: false });
        });
    }

    function updateLobby(roomData) {
        if (!ui.lobbyScreen.classList.contains('show')) showScreen('lobby');
        
        ui.roomCodeDisplay.textContent = `รหัสห้อง: ${currentRoomId}`;
        ui.readyBtn.style.display = 'block';
        ui.playerList.style.display = 'block';
        ui.roomList.innerHTML = ''; // เคลียร์รายการห้อง
        ui.lobbyStatus.textContent = ''; // เคลียร์สถานะการค้นหา

        ui.playerList.innerHTML = '';
        let allReady = true;
        let connectedPlayerCount = 0;

        Object.values(roomData.players).forEach(player => {
            if (player.connected) connectedPlayerCount++;
            const playerItem = document.createElement('li');
            playerItem.textContent = `${player.name} ${player.isHost ? '(เจ้าของห้อง)' : ''}`;
            playerItem.className = player.ready ? 'ready' : '';
            ui.playerList.appendChild(playerItem);
            if (!player.ready) allReady = false;
        });

        // เริ่มเกมเมื่อทุกคนพร้อม
        if (allReady && connectedPlayerCount > 1 && roomData.players[currentPlayerId]?.isHost) {
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
        }).then(() => {
            showToast("ตั้งเลขลับสำเร็จ!");
            playSound('numberSet');
        });
    }
    
    function updateGame(roomData) {
        if (!ui.gameScreen.classList.contains('show')) showScreen('game');

        const myData = roomData.players[currentPlayerId];
        const allNumbersSet = Object.values(roomData.players).every(p => p.numberSet || !p.connected);

        // เปลี่ยน gameState จาก setup เป็น playing เมื่อทุกคนตั้งค่าเลขเสร็จ
        if (roomData.gameState === 'setup' && allNumbersSet) {
            db.ref(`rooms/${currentRoomId}`).update({ gameState: 'playing' });
            return; // รอการอัปเดตครั้งถัดไป
        }

        // แสดง/ซ่อนหน้าตั้งค่าเลข
        if (myData && !myData.numberSet) {
            ui.numberSetup.style.display = 'block';
            ui.gameControls.style.display = 'none';
            ui.myNumberDisplay.textContent = 'กรุณาตั้งเลขลับของคุณ';
        } else {
            ui.numberSetup.style.display = 'none';
            ui.gameControls.style.display = 'block';
            ui.myNumberDisplay.textContent = `เลขลับของคุณ: ${myData.number || 'XXXX'}`;
        }

        // อัปเดต UI ตามตาของผู้เล่น
        const turnPlayerId = roomData.turn;
        const turnPlayer = roomData.players[turnPlayerId];
        const isMyTurnToBeGuessed = turnPlayerId === currentPlayerId;

        if (isMyTurnToBeGuessed) {
            ui.turnIndicator.textContent = 'ตาของคุณ (รอคนอื่นทาย)';
            ui.guessNumberContainer.parentElement.style.display = 'none'; // ซ่อนส่วนทายเลข
        } else {
            ui.turnIndicator.textContent = `ทายเลขของ: ${turnPlayer.name}`;
            ui.guessNumberContainer.parentElement.style.display = 'block'; // แสดงส่วนทายเลข
        }

        // อัปเดตประวัติการทาย
        ui.myGuessesHistory.innerHTML = '';
        if (myData && myData.guesses) {
            Object.values(myData.guesses).reverse().forEach(guess => {
                const guessItem = document.createElement('li');
                guessItem.className = 'guess-item';
                const guesserName = roomData.players[guess.by]?.name || 'ผู้เล่นไม่ทราบชื่อ';
                guessItem.innerHTML = `<span>${guesserName}: ${guess.guess}</span><span>${guess.strikes}S ${guess.balls}B</span>`;
                if (guess.strikes === GUESS_LENGTH) {
                    guessItem.classList.add('win-guess');
                }
                ui.myGuessesHistory.appendChild(guessItem);
            });
        }
    }

    function submitGuess() {
        if (currentGuess.length !== GUESS_LENGTH) {
            showToast('กรุณากรอกเลขให้ครบ 4 หลัก');
            return;
        }
        const guessString = currentGuess.join('');
        
        db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
            if (roomData && roomData.gameState === 'playing') {
                const turnPlayerId = roomData.turn;
                const targetPlayer = roomData.players[turnPlayerId];

                if (turnPlayerId === currentPlayerId) {
                    showToast('คุณไม่สามารถทายเลขของตัวเองได้');
                    return; // Abort
                }

                const clues = calculateClues(currentGuess, targetPlayer.number);
                const guessData = { 
                    guess: guessString, 
                    strikes: clues.strikes, 
                    balls: clues.balls, 
                    by: currentPlayerId 
                };
                
                const historyPath = `players/${turnPlayerId}/guesses`;
                if (!roomData.players[turnPlayerId].guesses) {
                    roomData.players[turnPlayerId].guesses = {};
                }
                const newGuessKey = db.ref().child(historyPath).push().key;
                roomData.players[turnPlayerId].guesses[newGuessKey] = guessData;

                // ตรวจสอบว่าทายถูกหรือไม่
                if (clues.strikes === GUESS_LENGTH) {
                    roomData.players[turnPlayerId].status = 'eliminated';
                }
            }
            return roomData;
        }).then(() => {
            currentGuess = [];
            updateGuessDisplay();
            playSound('guess');
            showToast('ส่งคำทายแล้ว!');
        });
    }

    function updateGameOver(roomData) {
        if (!ui.gameOverScreen.classList.contains('show')) {
            showScreen('gameOver');
            playSound(roomData.winner === currentPlayerId ? 'win' : 'lose');
        }
        ui.winnerDisplay.textContent = roomData.winner ? `${roomData.winner} เป็นผู้ชนะ!` : 'จบเกม!';
        ui.rematchBtn.style.display = roomData.players[currentPlayerId]?.isHost ? 'block' : 'none';
    }

    function requestRematch() {
        // ฟังก์ชันนี้ยังไม่ได้ทำ รอการพัฒนาต่อ
        showToast("ฟังก์ชันเล่นอีกครั้งยังไม่พร้อมใช้งาน");
    }
    
    // =================================================================
    // ======== INITIALIZATION ========
    // =================================================================
    setupInitialListeners();
    showScreen('splash');
});
