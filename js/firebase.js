// js/firebase.js

// ... (ส่วน config และ initialize เดิม) ...
if (!firebase.apps.length) {
    // ...
}
export const db = firebase.database();
// ... (console.log เดิม) ...


// --- ฟังก์ชันสำหรับสร้างห้อง (นำกลับมา) ---
export function createRoom(hostName, roomName, password) {
    return new Promise((resolve, reject) => {
        const newRoomId = db.ref('rooms').push().key;
        const playerId = 'player1';

        const roomData = {
            roomName, hostName, password,
            players: {
                'player1': { id: 'player1', name: hostName, connected: true, isHost: true, numberSet: false, finalChances: 3, status: 'playing' },
                'player2': { id: 'player2', name: 'ผู้เล่น 2', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
                'player3': { id: 'player3', name: 'ผู้เล่น 3', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' },
                'player4': { id: 'player4', name: 'ผู้เล่น 4', connected: false, isHost: false, numberSet: false, finalChances: 3, status: 'playing' }
            },
            playerCount: 1,
            gameState: 'waiting',
        };

        db.ref('rooms/' + newRoomId).set(roomData)
            .then(() => {
                resolve({ roomId: newRoomId, playerId: playerId });
            })
            .catch(error => {
                reject(error);
            });
    });
}
