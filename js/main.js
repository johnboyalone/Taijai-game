// js/main.js
import * as UI from './ui.js';
import * as Firebase from './firebase.js';
import * as Game from './game.js';

document.addEventListener('DOMContentLoaded', () => {

    const sounds = {
        background: new Audio('sounds/background-music.mp3'),
        click: new Audio('sounds/click.mp3'),
        win: new Audio('sounds/win-wow.mp3'),
        wrong: new Audio('sounds/wrong-answer.mp3'),
        turn: new Audio('sounds/your-turn.mp3')
    };
    sounds.background.loop = true;
    sounds.background.volume = 0.3;
    sounds.turn.volume = 0.7;

    let isMuted = false;

    function playSound(sound) {
        if (isMuted) return;
        sound.currentTime = 0;
        sound.play().catch(error => console.log(`Error playing sound: ${error.message}`));
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (isMuted) {
            sounds.background.pause();
            UI.ui.soundIcon.textContent = '🔇';
        } else {
            sounds.background.play().catch(e => console.log("Autoplay was prevented."));
            UI.ui.soundIcon.textContent = '🔊';
        }
        sounds.click.volume = 0.5;
        sounds.click.play();
    }

    function setupInitialListeners() {
        UI.ui.soundControl.addEventListener('click', toggleMute);

        UI.screens.splash.addEventListener('click', () => {
            playSound(sounds.click);
            UI.showScreen('lobby');
            if (sounds.background.paused && !isMuted) {
                sounds.background.play().catch(e => console.log("Autoplay was prevented."));
            }
        });

        UI.ui.goToCreateBtn.addEventListener('click', () => { playSound(sounds.click); UI.showScreen('createRoom'); });
        UI.ui.goToJoinBtn.addEventListener('click', () => { playSound(sounds.click); UI.showScreen('roomList'); Firebase.loadAndDisplayRooms(); });
        UI.ui.confirmCreateBtn.addEventListener('click', () => { playSound(sounds.click); Firebase.createRoom(); });
        UI.ui.passwordModalSubmitBtn.addEventListener('click', () => { playSound(sounds.click); Firebase.handlePasswordSubmit(); });
        UI.ui.passwordModal.addEventListener('click', function(e) { if(e.target === this) this.classList.remove('show'); });
        UI.ui.confirmJoinBtn.addEventListener('click', () => { playSound(sounds.click); Firebase.joinRoom(); });
        UI.ui.startGameBtn.addEventListener('click', () => { playSound(sounds.click); Firebase.startGame(); });
        UI.ui.submitFinalAnswerBtn.addEventListener('click', () => { playSound(sounds.click); Game.submitFinalAnswer(); });
        UI.ui.rematchBtn.addEventListener('click', () => { playSound(sounds.click); Firebase.requestRematch(); });
        UI.ui.backToLobbyBtn.addEventListener('click', () => window.location.reload());

        window.addEventListener('beforeunload', Firebase.onDisconnect);
    }

    setupInitialListeners();
    UI.showScreen('splash');

    // Make functions available globally if needed, or pass them as parameters.
    // For simplicity in this structure, we'll pass them to the other modules.
    Firebase.setCallbacks({
        showToast: UI.showToast,
        showActionToast: UI.showActionToast,
        showScreen: UI.showScreen,
        updateWaitingRoomUI: UI.updateWaitingRoomUI,
        initializeGameUI: Game.initializeGameUI,
        updatePlayingUI: Game.updatePlayingUI,
        displayGameOver: Game.displayGameOver,
        updateGameOverUI: UI.updateGameOverUI,
        playSound: playSound,
        onDisconnect: Firebase.onDisconnect
    });

    Game.setCallbacks({
        showToast: UI.showToast,
        showActionToast: UI.showActionToast,
        updateGuessDisplay: UI.updateGuessDisplay,
        updatePlayerSummaryGrid: UI.updatePlayerSummaryGrid,
        updateHistoryLog: UI.updateHistoryLog,
        updateChances: UI.updateChances,
        updateTurnIndicator: UI.updateTurnIndicator,
        handleTurnTimer: Game.handleTurnTimer,
        playSound: playSound
    });
});