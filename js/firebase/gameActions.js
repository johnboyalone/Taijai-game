import { db, firebase } from './config.js';
import { state } from '../state.js';
import { updateGuessDisplay } from '../ui/gameScreen.js';
import { drawNewCard } from '../cards.js';
import { ui } from '../ui/elements.js';
import { showToast } from '../ui/core.js';

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

export function startGame() {
    db.ref(`rooms/${state.currentRoomId}`).get().then(snapshot => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            if (roomData.gameState === 'waiting') {
                const connectedPlayerIds = Object.values(roomData.players).filter(p => p.connected).map(p => p.id);
                const firstTurnPlayerId = connectedPlayerIds[0];
                const updates = {
                    gameState: 'setup',
                    turnOrder: connectedPlayerIds,
                    turn: firstTurnPlayerId,
                    turnStartTime: firebase.database.ServerValue.TIMESTAMP,
                    lastAction: null,
                    currentCard: roomData.gameMode === 'arcade' ? drawNewCard() : null,
                };
                db.ref(`rooms/${state.currentRoomId}`).update(updates);
            }
        }
    });
}

export function submitGuess() {
    const guessString = state.currentGuess.join('');
    const guesserId = state.currentPlayerId;

    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (!roomData || roomData.gameState !== 'playing') return;

        const targetId = roomData.turn;
        const targetPlayer = roomData.players[targetId];
        const guesserPlayer = roomData.players[guesserId];

        if (guesserId === targetId) {
            // ไม่ควรเกิดขึ้นได้เพราะ UI บล็อกไว้ แต่ป้องกันไว้ก่อน
            return;
        }

        const opponentNumber = targetPlayer.number;
        const clues = calculateClues(state.currentGuess, opponentNumber.split(''));

        const historyPath = `players/${targetId}/guesses`;
        if (!roomData.players[targetId].guesses) {
            roomData.players[targetId].guesses = {};
        }
        const newGuessKey = db.ref().child(historyPath).push().key;
        roomData.players[targetId].guesses[newGuessKey] = {
            guess: guessString,
            strikes: clues.strikes,
            balls: clues.balls,
            by: guesserId,
            byName: guesserPlayer.name,
            timestamp: Date.now()
        };

        if (roomData.gameMode === 'arcade') {
            const points = (clues.strikes * 10) + (clues.balls * 5);
            guesserPlayer.score = (guesserPlayer.score || 0) + points;
        }

        roomData.lastAction = {
            actorName: guesserPlayer.name,
            targetName: targetPlayer.name,
            type: 'guess',
            timestamp: Date.now()
        };

        return roomData;
    }).then(() => {
        state.currentGuess = [];
        updateGuessDisplay();
    });
}

export function submitFinalAnswer() {
    const finalAnswer = state.currentGuess.join('');
    const guesserId = state.currentPlayerId;

    db.ref(`rooms/${state.currentRoomId}`).transaction(roomData => {
        if (!roomData || roomData.gameState !== 'playing') return;

        const targetId = roomData.turn;
        const targetPlayer = roomData.players[targetId];
        const guesserPlayer = roomData.players[guesserId];

        if (guesserId === targetId) return;

        let actionType = '';
        if (finalAnswer === targetPlayer.number) {
            actionType = 'final_correct';
            targetPlayer.status = 'eliminated';
            if (roomData.gameMode === 'arcade') {
                guesserPlayer.score = (guesserPlayer.score || 0) + 100;
            }
        } else {
            actionType = 'final_wrong';
            let chancesToLose = 1;
            if (roomData.gameMode === 'arcade' && roomData.currentCard?.id === 'reflective_shield') {
                chancesToLose = 2;
            }
            guesserPlayer.finalChances -= chancesToLose;
            if (guesserPlayer.finalChances <= 0) {
                guesserPlayer.status = 'eliminated';
            }
        }

        roomData.lastAction = {
            actorName: guesserPlayer.name,
            targetName: targetPlayer.name,
            type: actionType,
            timestamp: Date.now()
        };

        return roomData;
    }).then(() => {
        state.currentGuess = [];
        updateGuessDisplay();
    });
}

export function requestRematch() {
    ui.rematchBtn.disabled = true;
    ui.rematchBtn.textContent = 'กำลังรอเพื่อน...';
    db.ref(`rooms/${state.currentRoomId}/rematch/${state.currentPlayerId}`).set(true);
}
