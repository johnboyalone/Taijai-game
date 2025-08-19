import { ref, transaction, push, serverTimestamp, set, update } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import { db } from './firebase.js';
import { ui, showToast, updateGuessDisplay } from './ui.js';

export const GUESS_LENGTH = 4;
export const TURN_DURATION = 20;

export function generateRandomNumber() {
    let result = [];
    for (let i = 0; i < GUESS_LENGTH; i++) {
        result.push(Math.floor(Math.random() * 10).toString());
    }
}
    return result;
}

export function calculateClues(guess, answer) {
    let strikes = 0, balls = 0;
    const answerCopy = [...answer];
    const guessCopy = [...guess];
    
    // Count strikes first
    for (let i = guessCopy.length - 1; i >= 0; i--) {
        if (guessCopy[i] === answerCopy[i]) {
            strikes++;
            guessCopy.splice(i, 1);
            answerCopy.splice(i, 1);
        }
    }
    
    // Count balls
    for (let i = 0; i < guessCopy.length; i++) {
        const foundIndex = answerCopy.indexOf(guessCopy[i]);
        if (foundIndex !== -1) {
            balls++;
            answerCopy.splice(foundIndex, 1);
        }
    }
    
    return { strikes, balls };
}

export function createNumberPad(onPadClick) {
    ui.numberPadContainer.innerHTML = '';
    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ลบ', '0', 'ทาย'];
    
    buttons.forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = val;
        if (val === 'ลบ' || val === 'ทาย') {
            cell.classList.add('special');
        }
        cell.addEventListener('click', () => onPadClick(val));
        ui.numberPadContainer.appendChild(cell);
    });
}

export async function submitGuess(currentRoomId, currentPlayerId, currentTargetId, currentGuess) {
    if (!currentRoomId || !currentPlayerId || !currentTargetId || !currentGuess) {
        showToast("ข้อมูลไม่ครบถ้วน");
        return;
    }

    const guessString = currentGuess.join('');
    
    try {
        await transaction(ref(db, `rooms/${currentRoomId}`), (roomData) => {
            if (roomData && roomData.gameState === 'playing' && roomData.turn === currentPlayerId) {
                const opponentNumber = roomData.players[currentTargetId].number;
                const clues = calculateClues(currentGuess, opponentNumber.split(''));
                
                const guessData = { 
                    guess: guessString, 
                    strikes: clues.strikes, 
                    balls: clues.balls, 
                    by: currentPlayerId,
                    timestamp: Date.now()
                };

                // Initialize guesses if not exists
                if (!roomData.players[currentTargetId].guesses) {
                    roomData.players[currentTargetId].guesses = {};
                }

                // Add new guess
                const newGuessKey = push(ref(db, `rooms/${currentRoomId}/players/${currentTargetId}/guesses`)).key;
                roomData.players[currentTargetId].guesses[newGuessKey] = guessData;

                // Move to next turn
                const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
                const currentTurnIndex = activePlayers.indexOf(roomData.turn);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = serverTimestamp();
                
                roomData.lastAction = { 
                    actorName: roomData.players[currentPlayerId].name, 
                    targetName: roomData.players[currentTargetId].name, 
                    type: 'guess', 
                    timestamp: Date.now() 
                };
            }
            return roomData;
        });
    } catch (error) {
        console.error("Error submitting guess:", error);
        showToast("ไม่สามารถส่งการทายได้");
    }
}

export async function submitFinalAnswer(currentRoomId, currentPlayerId, currentTargetId, currentGuess, playSound, wrongSound) {
    if (!currentRoomId || !currentPlayerId || !currentTargetId || !currentGuess) {
        showToast("ข้อมูลไม่ครบถ้วน");
        return;
    }

    const finalAnswer = currentGuess.join('');
    
    try {
        await transaction(ref(db, `rooms/${currentRoomId}`), (roomData) => {
            if (roomData && roomData.gameState === 'playing' && roomData.turn === currentPlayerId) {
                const targetPlayer = roomData.players[currentTargetId];
                const actorPlayer = roomData.players[currentPlayerId];
                let actionType = '';
                
                if (finalAnswer === targetPlayer.number) {
                    targetPlayer.status = 'eliminated';
                    actionType = 'final_correct';
                } else {
                    if (playSound && wrongSound) playSound(wrongSound);
                    actorPlayer.finalChances--;
                    if (actorPlayer.finalChances <= 0) {
                        actorPlayer.status = 'eliminated';
                    }
                    actionType = 'final_wrong';
                }
                
                roomData.lastAction = { 
                    actorName: actorPlayer.name, 
                    targetName: targetPlayer.name, 
                    type: actionType, 
                    timestamp: Date.now() 
                };

                // Move to next turn
                const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
                const currentTurnIndex = activePlayers.indexOf(roomData.turn);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = serverTimestamp();
            }
            return roomData;
        });
    } catch (error) {
        console.error("Error submitting final answer:", error);
        showToast("ไม่สามารถส่งคำตอบสุดท้ายได้");
    }
}

export async function skipTurn(currentRoomId, currentPlayerId) {
    if (!currentRoomId || !currentPlayerId) return;
    
    try {
        await transaction(ref(db, `rooms/${currentRoomId}`), (roomData) => {
            if (roomData && roomData.gameState === 'playing' && roomData.turn === currentPlayerId) {
                const activePlayers = roomData.turnOrder.filter(id => roomData.players[id].status === 'playing');
                const currentTurnIndex = activePlayers.indexOf(roomData.turn);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = serverTimestamp();
            }
            return roomData;
        });
    } catch (error) {
        console.error("Error skipping turn:", error);
    }
}

export async function requestRematch(currentRoomId, currentPlayerId) {
    if (!currentRoomId || !currentPlayerId) return;
    
    try {
        await set(ref(db, `rooms/${currentRoomId}/rematch/${currentPlayerId}`), true);
    } catch (error) {
        console.error("Error requesting rematch:", error);
        showToast("ไม่สามารถขอเล่นใหม่ได้");
    }
}

export async function resetGameForRematch(currentRoomId, roomData) {
    if (!currentRoomId || !roomData) return;
    
    try {
        const updates = {};
        updates[`rooms/${currentRoomId}/gameState`] = 'setup';
        updates[`rooms/${currentRoomId}/turn`] = roomData.turnOrder[0];
        updates[`rooms/${currentRoomId}/winner`] = null;
        updates[`rooms/${currentRoomId}/reason`] = null;
        updates[`rooms/${currentRoomId}/rematch`] = {};
        updates[`rooms/${currentRoomId}/lastAction`] = null;
        updates[`rooms/${currentRoomId}/turnStartTime`] = serverTimestamp();

        Object.keys(roomData.players).forEach(playerId => {
            if (roomData.players[playerId].connected) {
                updates[`rooms/${currentRoomId}/players/${playerId}/numberSet`] = false;
                updates[`rooms/${currentRoomId}/players/${playerId}/finalChances`] = 3;
                updates[`rooms/${currentRoomId}/players/${playerId}/status`] = 'playing';
                updates[`rooms/${currentRoomId}/players/${playerId}/guesses`] = null;
                updates[`rooms/${currentRoomId}/players/${playerId}/number`] = null;
            }
        });
        
        await update(ref(db), updates);
    } catch (error) {
        console.error("Error resetting game for rematch:", error);
        showToast("ไม่สามารถรีเซ็ตเกมได้");
    }