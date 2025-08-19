import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getDatabase, ref, set, push, get, child, onValue, off, update, transaction, serverTimestamp, increment, onDisconnect } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyAAeQyoxlwHv8Qe9yrsoxw0U5SFHTGzk8o",
    authDomain: "taijai.firebaseapp.com",
    databaseURL: "https://taijai-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "taijai",
    storageBucket: "taijai.appspot.com",
    messagingSenderId: "262573756581",
    appId: "1:262573756581:web:c17bfc795b5cf139693d4c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

export async function signInAnonymouslyHandler() {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Anonymous sign-in failed:", error);
        throw error;
    }
}

export function onAuthStateChangedHandler(callback) {
    return onAuthStateChanged(auth, callback);
}

export function getCurrentUserId() {
    return auth.currentUser ? auth.currentUser.uid : null;
}

export async function createRoom(hostName, roomName, password) {
    try {
        const newRoomRef = push(ref(db, 'rooms'));
        const newRoomId = newRoomRef.key;
        const userId = getCurrentUserId();
        const newPlayerId = 'player1';

        const roomData = {
            roomName, 
            hostName, 
            password,
            players: {
                'player1': { uid: userId, name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3, status: 'playing' },
                'player2': { uid: null, name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
                'player3': { uid: null, name: 'ผู้เล่น 3', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
                'player4': { uid: null, name: 'ผู้เล่น 4', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' }
            },
            playerCount: 1,
            gameState: 'waiting',
            turn: null,
            turnOrder: [],
            rematch: {},
            lastAction: null,
            createdAt: serverTimestamp()
        };

        await set(newRoomRef, roomData);
        return { newRoomId, newPlayerId };
    } catch (error) {
        console.error("Error creating room:", error);
        throw new Error("ไม่สามารถสร้างห้องได้ กรุณาลองใหม่");
    }
}

export function listenToRoomList(callback) {
    try {
        const roomsRef = ref(db, 'rooms');
        const listener = onValue(roomsRef, (snapshot) => {
            const rooms = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const roomData = childSnapshot.val();
                    if (roomData.gameState === 'waiting') {
                        rooms.push({ id: childSnapshot.key, ...roomData });
                    }
                });
            }
            callback(rooms);
        }, (error) => {
            console.error("Error listening to room list:", error);
            callback([]);
        });
        
        return { ref: roomsRef, listener };
    } catch (error) {
        console.error("Error setting up room list listener:", error);
        callback([]);
        return null;
    }
}

export function detachRoomListListener(listenerData) {
    if (listenerData && listenerData.ref && listenerData.listener) {
        off(listenerData.ref, 'value', listenerData.listener);
    }
}

export async function verifyPassword(roomId, password) {
    try {
        const passwordRef = ref(db, `rooms/${roomId}/password`);
        const snapshot = await get(passwordRef);
        return snapshot.exists() && snapshot.val() === password;
    } catch (error) {
        console.error("Error verifying password:", error);
        return false;
    }
}

export async function joinRoom(roomId, joinerName) {
    const userId = getCurrentUserId();
    
    try {
        const result = await transaction(ref(db, `rooms/${roomId}/players`), (players) => {
            if (players) {
                let playerCount = Object.values(players).filter(p => p.connected).length;
                if (playerCount >= 4) return; // Abort transaction

                let availableSlotId = null;
                for (const playerId in players) {
                    if (!players[playerId].connected) {
                        availableSlotId = playerId;
                        break;
                    }
                }

                if (availableSlotId) {
                    players[availableSlotId].connected = true;
                    players[availableSlotId].name = joinerName;
                    players[availableSlotId].uid = userId;
                }
            }
            return players;
        });

        if (!result.committed) {
            throw new Error("ไม่สามารถเข้าร่วมห้องได้ อาจจะเต็มแล้ว");
        }

        const players = result.snapshot.val();
        const newPlayerId = Object.keys(players).find(pId => players[pId].uid === userId);

        if (!newPlayerId) {
            throw new Error("เกิดข้อผิดพลาดในการหาข้อมูลผู้เล่น");
        }

        // Update player count
        await update(ref(db, `rooms/${roomId}`), {
            playerCount: increment(1)
        });

        return { newRoomId: roomId, newPlayerId: newPlayerId };
    } catch (error) {
        console.error("Error joining room:", error);
        throw error;
    }
}

export function listenToRoomUpdates(roomId, callback) {
    try {
        const roomRef = ref(db, `rooms/${roomId}`);
        const listener = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            } else {
                callback(null);
            }
        }, (error) => {
            console.error("Error listening to room updates:", error);
            callback(null);
        });
        
        return { ref: roomRef, listener: listener };
    } catch (error) {
        console.error("Error setting up room listener:", error);
        callback(null);
        return null;
    }
}

export function detachRoomListener(listenerData) {
    if (listenerData && listenerData.ref && listenerData.listener) {
        off(listenerData.ref, 'value', listenerData.listener);
    }
}

export function setupDisconnectHandler(roomId, playerId) {
    if (!roomId || !playerId) return;
    
    try {
        const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
        const roomCountRef = ref(db, `rooms/${roomId}/playerCount`);

        const playerDisconnect = onDisconnect(playerRef);
        const countDisconnect = onDisconnect(roomCountRef);

        playerDisconnect.update({ connected: false, uid: null });
        countDisconnect.set(increment(-1));
    } catch (error) {
        console.error("Error setting up disconnect handler:", error);
    }
}

export function cancelDisconnectHandler(roomId, playerId) {
    if (!roomId || !playerId) return;
    
    try {
        const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
        const roomCountRef = ref(db, `rooms/${roomId}/playerCount`);
        
        onDisconnect(playerRef).cancel();
        onDisconnect(roomCountRef).cancel();
    } catch (error) {
        console.error("Error canceling disconnect handler:", error);
    }
}