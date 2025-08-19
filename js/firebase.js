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

export const db = firebase.database();
export const auth = firebase.auth();

export async function signInAnonymously() {
    try {
        await auth.signInAnonymously();
    } catch (error) {
        console.error("Anonymous sign-in failed:", error);
    }
}

export function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
}

export function getCurrentUserId() {
    return auth.currentUser ? auth.currentUser.uid : null;
}

export function createRoom(hostName, roomName, password) {
    const newRoomId = db.ref('rooms').push().key;
    const userId = getCurrentUserId();
    const newPlayerId = 'player1';

    const roomData = {
        roomName, hostName, password,
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
        lastAction: null
    };

    return db.ref('rooms/' + newRoomId).set(roomData).then(() => {
        return { newRoomId, newPlayerId };
    });
}

export function listenToRoomList(callback) {
    const roomsRef = db.ref('rooms').orderByChild('gameState').equalTo('waiting');
    const listener = roomsRef.on('value', snapshot => {
        const rooms = [];
        snapshot.forEach(childSnapshot => {
            rooms.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        callback(rooms);
    });
    return { ref: roomsRef, listener };
}

export function detachRoomListListener(listenerData) {
    if (listenerData && listenerData.ref) {
        listenerData.ref.off('value', listenerData.listener);
    }
}

export function verifyPassword(roomId, password) {
    return db.ref(`rooms/${roomId}/password`).get().then(snapshot => {
        return snapshot.val() === password;
    });
}

export function joinRoom(roomId, joinerName) {
    const roomRef = db.ref(`rooms/${roomId}`);
    const userId = getCurrentUserId();
    return roomRef.transaction(currentRoomData => {
        if (currentRoomData) {
            if (currentRoomData.playerCount >= 4) return;

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
                currentRoomData.players[availableSlotId].uid = userId;
                currentRoomData.playerCount++;
                currentRoomData.newPlayerId = availableSlotId;
            } else {
                return;
            }
        }
        return currentRoomData;
    }).then(result => {
        if (!result.committed || !result.snapshot.val().newPlayerId) {
            throw new Error("ไม่สามารถเข้าร่วมห้องได้ อาจจะเต็มแล้ว");
        }
        const finalData = result.snapshot.val();
        return { newRoomId: roomId, newPlayerId: finalData.newPlayerId };
    });
}

export function listenToRoomUpdates(roomId, callback) {
    const roomRef = db.ref('rooms/' + roomId);
    const listener = roomRef.on('value', (snapshot) => {
        callback(snapshot.val());
    });
    return { ref: roomRef, listener: listener };
}

export function detachRoomListener(listenerData) {
    if (listenerData && listenerData.ref) {
        listenerData.ref.off('value', listenerData.listener);
    }
}

export function setupDisconnectHandler(roomId, playerId) {
    if (!roomId || !playerId) return;
    const playerRef = db.ref(`rooms/${roomId}/players/${playerId}`);
    const roomRef = db.ref(`rooms/${roomId}`);

    playerRef.onDisconnect().update({ connected: false }).then(() => {
        roomRef.onDisconnect().transaction(currentRoomData => {
            if (currentRoomData && currentRoomData.players[playerId]) {
                if(currentRoomData.players[playerId].connected) {
                    currentRoomData.playerCount--;
                }
            }
            return currentRoomData;
        });
    });
}

export function cancelDisconnectHandler(roomId, playerId) {
    if (!roomId || !playerId) return;
    const playerRef = db.ref(`rooms/${roomId}/players/${playerId}`);
    playerRef.onDisconnect().cancel();
    db.ref(`rooms/${roomId}`).onDisconnect().cancel();
}
