import { db, ServerValue } from './firebase.js';
import { ui, showToast, updateGuessDisplay } from './ui.js';

export const GUESS_LENGTH = 4;
export const TURN_DURATION = 20;
export const MAX_CHANCES = 3;

/**
 * สร้างตัวเลขสุ่มที่ไม่มีตัวเลขซ้ำกัน
 * @returns {string[]} อาเรย์ของตัวเลขสตริงที่ไม่ซ้ำกัน
 */
export function generateRandomNumber() {
    const result = [];
    const usedDigits = new Set();
    
    while (result.length < GUESS_LENGTH) {
        const digit = Math.floor(Math.random() * 10).toString();
        if (!usedDigits.has(digit)) {
            usedDigits.add(digit);
            result.push(digit);
        }
    }
    
    return result;
}

/**
 * คำนวณผลลัพธ์จากการทาย
 * @param {string[]} guess - ตัวเลขที่ทาย
 * @param {string[]} answer - ตัวเลขคำตอบ
 * @returns {Object} จำนวน strikes และ balls
 */
export function calculateClues(guess, answer) {
    if (!guess || !answer || guess.length !== GUESS_LENGTH || answer.length !== GUESS_LENGTH) {
        return { strikes: 0, balls: 0 };
    }
    
    let strikes = 0, balls = 0;
    const answerCopy = [...answer];
    const guessCopy = [...guess];
    
    // ตรวจสอบ strikes (ตัวเลขถูกตำแหน่งถูก)
    for (let i = guessCopy.length - 1; i >= 0; i--) {
        if (guessCopy[i] === answerCopy[i]) {
            strikes++;
            guessCopy.splice(i, 1);
            answerCopy.splice(i, 1);
        }
    }
    
    // ตรวจสอบ balls (ตัวเลขถูกแต่ตำแหน่งผิด)
    for (let i = 0; i < guessCopy.length; i++) {
        const foundIndex = answerCopy.indexOf(guessCopy[i]);
        if (foundIndex !== -1) {
            balls++;
            answerCopy.splice(foundIndex, 1);
        }
    }
    
    return { strikes, balls };
}

/**
 * สร้างแป้นตัวเลขสำหรับการทาย
 * @param {Function} onPadClick - ฟังก์ชันเมื่อคลิกแป้น
 */
export function createNumberPad(onPadClick) {
    ui.numberPadContainer.innerHTML = '';
    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ลบ', 'ทาย'];
    
    buttons.forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = val;
        cell.dataset.value = val;
        
        if (val === 'ลบ' || val === 'ทาย') {
            cell.classList.add('special');
        }
        
        cell.addEventListener('click', (event) => {
            onPadClick(event);
        });
        
        ui.numberPadContainer.appendChild(cell);
    });
}

/**
 * ส่งการทายตัวเลข
 * @param {string} currentRoomId - ID ของห้อง
 * @param {string} currentPlayerId - ID ของผู้เล่นปัจจุบัน
 * @param {string} currentTargetId - ID ของผู้เล่นเป้าหมาย
 * @param {string[]} currentGuess - ตัวเลขที่ทาย
 */
export function submitGuess(currentRoomId, currentPlayerId, currentTargetId, currentGuess) {
    // ตรวจสอบ input
    if (!currentRoomId || !currentPlayerId || !currentTargetId) {
        showToast("ข้อมูลไม่ครบถ้วน กรุณาลองใหม่");
        return;
    }
    
    if (currentGuess.length !== GUESS_LENGTH) {
        showToast(`กรุณาทายตัวเลขให้ครบ ${GUESS_LENGTH} หลัก`);
        return;
    }
    
    const guessString = currentGuess.join('');
    
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        try {
            // ตรวจสอบว่าห้องมีอยู่และอยู่ในสถานะที่ถูกต้อง
            if (!roomData || roomData.gameState !== 'playing' || roomData.turn !== currentPlayerId) {
                return; // ไม่ทำอะไรหากเงื่อนไขไม่ตรง
            }
            
            // ตรวจสอบว่าผู้เล่นเป้าหมายมีตัวเลขแล้ว
            const targetPlayer = roomData.players[currentTargetId];
            if (!targetPlayer || !targetPlayer.number) {
                console.warn("Target player doesn't have a number set");
                return; // ไม่ทำอะไรหากผู้เล่นเป้าหมายยังไม่มีตัวเลข
            }
            
            // คำนวณผลลัพธ์
            const clues = calculateClues(currentGuess, targetPlayer.number.split(''));
            const guessData = { 
                guess: guessString, 
                strikes: clues.strikes, 
                balls: clues.balls, 
                by: currentPlayerId,
                timestamp: ServerValue.TIMESTAMP
            };
            
            // สร้าง guesses หากยังไม่มี
            if (!roomData.players[currentTargetId].guesses) {
                roomData.players[currentTargetId].guesses = {};
            }
            
            // เพิ่มข้อมูลการทาย
            roomData.players[currentTargetId].guesses[ServerValue.TIMESTAMP] = guessData;
            
            // เปลี่ยนตาผู้เล่น
            const activePlayers = roomData.turnOrder.filter(id => 
                roomData.players[id] && roomData.players[id].status === 'playing'
            );
            
            if (activePlayers.length > 1) {
                const currentTurnIndex = activePlayers.indexOf(roomData.turn);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = ServerValue.TIMESTAMP;
                
                // บันทึกการกระทำล่าสุด
                roomData.lastAction = { 
                    actorName: roomData.players[currentPlayerId].name, 
                    targetName: targetPlayer.name, 
                    type: 'guess', 
                    timestamp: ServerValue.TIMESTAMP 
                };
            } else {
                // หากเหลือผู้เล่นเพียงคนเดียว จบเกม
                roomData.gameState = 'finished';
                roomData.winner = currentPlayerId;
                roomData.reason = 'เป็นผู้รอดชีวิตคนสุดท้าย!';
            }
            
            return roomData;
        } catch (error) {
            console.error("Error in submitGuess transaction:", error);
            return roomData; // คืนค่าเดิมหากเกิดข้อผิดพลาด
        }
    }, (error, committed) => {
        if (error || !committed) {
            console.error("submitGuess transaction failed:", error);
            showToast("ไม่สามารถส่งการทายได้ กรุณาลองใหม่");
        }
    });
}

/**
 * ส่งคำตอบสุดท้าย
 * @param {string} currentRoomId - ID ของห้อง
 * @param {string} currentPlayerId - ID ของผู้เล่นปัจจุบัน
 * @param {string} currentTargetId - ID ของผู้เล่นเป้าหมาย
 * @param {string[]} currentGuess - ตัวเลขที่ทาย
 * @param {Function} playSound - ฟังก์ชันเล่นเสียง
 * @param {Object} wrongSound - object เสียงผิด
 */
export function submitFinalAnswer(currentRoomId, currentPlayerId, currentTargetId, currentGuess, playSound, wrongSound) {
    // ตรวจสอบ input
    if (!currentRoomId || !currentPlayerId || !currentTargetId) {
        showToast("ข้อมูลไม่ครบถ้วน กรุณาลองใหม่");
        return;
    }
    
    if (currentGuess.length !== GUESS_LENGTH) {
        showToast(`กรุณาทายตัวเลขให้ครบ ${GUESS_LENGTH} หลัก`);
        return;
    }
    
    const finalAnswer = currentGuess.join('');
    
    db.ref(`rooms/${currentRoomId}`).transaction(roomData => {
        try {
            // ตรวจสอบว่าห้องมีอยู่และอยู่ในสถานะที่ถูกต้อง
            if (!roomData || roomData.gameState !== 'playing' || roomData.turn !== currentPlayerId) {
                return; // ไม่ทำอะไรหากเงื่อนไขไม่ตรง
            }
            
            // ตรวจสอบว่าผู้เล่นเป้าหมายมีตัวเลขแล้ว
            const targetPlayer = roomData.players[currentTargetId];
            const actorPlayer = roomData.players[currentPlayerId];
            
            if (!targetPlayer || !targetPlayer.number || !actorPlayer) {
                console.warn("Player data is incomplete");
                return; // ไม่ทำอะไรหากข้อมูลไม่ครบ
            }
            
            let actionType = '';
            let gameStateChanged = false;
            
            // ตรวจสอบคำตอบ
            if (finalAnswer === targetPlayer.number) {
                // ทายถูก
                targetPlayer.status = 'eliminated';
                actionType = 'final_correct';
                console.log(`Player ${currentTargetId} eliminated by ${currentPlayerId}`);
            } else {
                // ทายผิด
                playSound(wrongSound);
                actorPlayer.finalChances--;
                actionType = 'final_wrong';
                
                // ตรวจสอบว่าผู้ทายหมดโอกาสแล้วหรือไม่
                if (actorPlayer.finalChances <= 0) {
                    actorPlayer.status = 'eliminated';
                    console.log(`Player ${currentPlayerId} eliminated due to no chances`);
                }
            }
            
            // บันทึกการกระทำ
            roomData.lastAction = { 
                actorName: actorPlayer.name, 
                targetName: targetPlayer.name, 
                type: actionType, 
                timestamp: ServerValue.TIMESTAMP 
            };
            
            // ตรวจสอบจำนวนผู้เล่นที่ยังอยู่
            const activePlayers = roomData.turnOrder.filter(id => 
                roomData.players[id] && roomData.players[id].status === 'playing'
            );
            
            if (activePlayers.length <= 1) {
                // จบเกมหากเหลือผู้เล่นไม่เกิน 1 คน
                roomData.gameState = 'finished';
                roomData.winner = activePlayers[0] || null;
                roomData.reason = activePlayers.length === 1 ? 
                    'เป็นผู้รอดชีวิตคนสุดท้าย!' : 'ไม่มีผู้ชนะ';
                gameStateChanged = true;
            } else {
                // เปลี่ยนตาผู้เล่น
                const currentTurnIndex = activePlayers.indexOf(roomData.turn);
                const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
                roomData.turn = activePlayers[nextTurnIndex];
                roomData.turnStartTime = ServerValue.TIMESTAMP;
            }
            
            console.log(`Game state after final answer: ${roomData.gameState}${gameStateChanged ? ' (changed)' : ''}`);
            return roomData;
        } catch (error) {
            console.error("Error in submitFinalAnswer transaction:", error);
            return roomData; // คืนค่าเดิมหากเกิดข้อผิดพลาด
        }
    }, (error, committed) => {
        if (error || !committed) {
            console.error("submitFinalAnswer transaction failed:", error);
            showToast("ไม่สามารถส่งคำตอบสุดท้ายได้ กรุณาลองใหม่");
        }
    });
}

/**
 * ข้ามตา
 * @param {string} currentRoomId - ID ของห้อง
 * @param {string} currentPlayerId - ID ของผู้เล่นปัจจุบัน
 */
export function skipTurn(currentRoomId, currentPlayerId) {
    // ตรวจสอบ input
    if (!currentRoomId || !currentPlayerId) {
        showToast("ข้อมูลไม่ครบถ้วน กรุณาลองใหม่");
        return;
    }
    
    const roomRef = db.ref(`rooms/${currentRoomId}`);
    
    roomRef.once('value').then(snapshot => {
        const roomData = snapshot.val();
        
        // ตรวจสอบว่าห้องมีอยู่และอยู่ในสถานะที่ถูกต้อง
        if (!roomData || roomData.gameState !== 'playing' || roomData.turn !== currentPlayerId) {
            return;
        }
        
        // เปลี่ยนตาผู้เล่น
        const activePlayers = roomData.turnOrder.filter(id => 
            roomData.players[id] && roomData.players[id].status === 'playing'
        );
        
        if (activePlayers.length > 1) {
            const currentTurnIndex = activePlayers.indexOf(roomData.turn);
            const nextTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
            
            const updates = {
                turn: activePlayers[nextTurnIndex],
                turnStartTime: ServerValue.TIMESTAMP,
                lastAction: { 
                    actorName: roomData.players[currentPlayerId].name, 
                    type: 'skip', 
                    timestamp: ServerValue.TIMESTAMP 
                }
            };
            
            roomRef.update(updates).catch(error => {
                console.error("Error skipping turn:", error);
                showToast("ไม่สามารถข้ามตาได้ กรุณาลองใหม่");
            });
        }
    }).catch(error => {
        console.error("Error fetching room data for skipTurn:", error);
        showToast("ไม่สามารถข้ามตาได้ กรุณาลองใหม่");
    });
}

/**
 * ขอเล่นใหม่
 * @param {string} currentRoomId - ID ของห้อง
 * @param {string} currentPlayerId - ID ของผู้เล่นปัจจุบัน
 */
export function requestRematch(currentRoomId, currentPlayerId) {
    if (!currentRoomId || !currentPlayerId) {
        showToast("ข้อมูลไม่ครบถ้วน กรุณาลองใหม่");
        return;
    }
    
    db.ref(`rooms/${currentRoomId}/rematch/${currentPlayerId}`).set(true)
        .catch(error => {
            console.error("Error requesting rematch:", error);
            showToast("ไม่สามารถขอเล่นใหม่ได้ กรุณาลองใหม่");
        });
}

/**
 * รีเซ็ตเกมสำหรับการเล่นใหม่
 * @param {string} currentRoomId - ID ของห้อง
 * @param {Object} roomData - ข้อมูลห้องปัจจุบัน
 */
export function resetGameForRematch(currentRoomId, roomData) {
    if (!currentRoomId || !roomData) {
        console.error("Invalid parameters for resetGameForRematch");
        return;
    }
    
    const updates = {};
    const timestamp = ServerValue.TIMESTAMP;
    
    // อัปเดตสถานะเกม
    updates[`rooms/${currentRoomId}/gameState`] = 'setup';
    updates[`rooms/${currentRoomId}/turn`] = roomData.turnOrder[0];
    updates[`rooms/${currentRoomId}/winner`] = null;
    updates[`rooms/${currentRoomId}/reason`] = null;
    updates[`rooms/${currentRoomId}/rematch`] = {};
    updates[`rooms/${currentRoomId}/lastAction`] = null;
    updates[`rooms/${currentRoomId}/turnStartTime`] = timestamp;
    
    // รีเซ็ตข้อมูลผู้เล่น
    Object.keys(roomData.players).forEach(playerId => {
        const player = roomData.players[playerId];
        if (player && player.connected) {
            updates[`rooms/${currentRoomId}/players/${playerId}/numberSet`] = false;
            updates[`rooms/${currentRoomId}/players/${playerId}/finalChances`] = MAX_CHANCES;
            updates[`rooms/${currentRoomId}/players/${playerId}/status`] = 'playing';
            updates[`rooms/${currentRoomId}/players/${playerId}/guesses`] = null;
            updates[`rooms/${currentRoomId}/players/${playerId}/number`] = null;
        }
    });
    
    // ใช้ multi-location update
    db.ref().update(updates).then(() => {
        console.log("Game reset for rematch completed");
    }).catch(error => {
        console.error("Error resetting game for rematch:", error);
        showToast("ไม่สามารถรีเซ็ตเกมได้ กรุณาลองใหม่");
    });
}

/**
 * ตรวจสอบว่าตัวเลขที่ให้มานั้นถูกต้อง
 * @param {string[]} guess - ตัวเลขที่จะตรวจสอบ
 * @returns {boolean} true หากตัวเลขถูกต้อง
 */
export function isValidGuess(guess) {
    // ตรวจสอบความยาว
    if (guess.length !== GUESS_LENGTH) {
        return false;
    }
    
    // ตรวจสอบว่าทุกตัวเป็นตัวเลข
    for (const digit of guess) {
        if (!/^[0-9]$/.test(digit)) {
            return false;
        }
    }
    
    // ตรวจสอบว่าไม่มีตัวเลขซ้ำ (ตามกฎของเกม)
    const uniqueDigits = new Set(guess);
    if (uniqueDigits.size !== GUESS_LENGTH) {
        return false;
    }
    
    return true;
}

/**
 * สร้าง turn order สำหรับผู้เล่น
 * @param {Object} players - ข้อมูลผู้เล่นทั้งหมด
 * @returns {string[]} ลำดับการเล่น
 */
export function generateTurnOrder(players) {
    const connectedPlayers = Object.keys(players).filter(playerId => 
        players[playerId] && players[playerId].connected
    );
    
    // สุ่มลำดับผู้เล่น
    return connectedPlayers.sort(() => Math.random() - 0.5);
}

/**
 * ตรวจสอบว่าเกมจบแล้วหรือไม่
 * @param {Object} roomData - ข้อมูลห้อง
 * @returns {boolean} true หากเกมจบแล้ว
 */
export function isGameFinished(roomData) {
    if (!roomData || roomData.gameState !== 'playing') {
        return false;
    }
    
    const activePlayers = Object.keys(roomData.players).filter(playerId => 
        roomData.players[playerId] && roomData.players[playerId].status === 'playing'
    );
    
    return activePlayers.length <= 1;
}