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

    // =================================================================
    // ======== AUDIO ASSETS ========
    // =================================================================
    let sounds = {};
    let soundsInitialized = false;
    let bgm;

    function initializeSounds() {
        if (soundsInitialized) return;
        console.log("Initializing sounds for the first time...");

        // 1. กำหนดค่าให้เสียงเอฟเฟกต์
        sounds = {
            click: new Audio('sounds/click.mp3'),
            wrongAnswer: new Audio('sounds/wrong-answer.mp3'),
            win: new Audio('sounds/win-wow.mp3') // แก้ชื่อไฟล์ให้ถูกต้อง
        };

        // 2. กำหนดค่าให้ BGM
        bgm = new Audio('sounds/background-music.mp3'); 
        bgm.loop = true;
        bgm.volume = 0.3;

        // 3. ตั้งค่าคุณสมบัติอื่นๆ ของเสียงเอฟเฟกต์
        sounds.click.volume = 0.8;
        sounds.win.volume = 0.7;

        // 4. สั่งให้โหลดไฟล์เสียงทั้งหมดล่วงหน้า
        Object.values(sounds).forEach(sound => {
            sound.load(); 
        });
        bgm.load();

        soundsInitialized = true;
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
            bgm.play().catch(e => console.error("BGM play error:", e));
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
        
        playBGM(); // เริ่มเล่นเพลงสำหรับ Host

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
