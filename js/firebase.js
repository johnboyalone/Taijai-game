// js/firebase.js

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyAAeQyoxlwHv8Qe9yrsoxw0U5SFHTGzk8o",
    authDomain: "taijai.firebaseapp.com",
    databaseURL: "https://taijai-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "taijai",
    storageBucket: "taijai.appspot.com",
    messagingSenderId: "262573756581",
    appId: "1:262573756581:web:c17bfc795b5cf139693d4c"
};
// ป้องกันการ initialize ซ้ำ
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
export const db = firebase.database();

// --- ตัวแปรสำหรับจัดการ Listener ---
let roomListener = null;

// --- Room Management Functions ---

// (อัปเดต) ทำให้ createRoom ทำงานจริง
export function createRoom(hostName, roomName, password) {
    // ใช้ Promise เพื่อให้ main.js สามารถใช้ async/await ได้
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
            turn: null,
            turnOrder: [],
            rematch: {},
            lastAction: null
        };

        db.ref('rooms/' + newRoomId).set(roomData)
            .then(() => {
                // เมื่อสร้างสำเร็จ ส่ง roomId และ playerId กลับไป
                resolve({ roomId: newRoomId, playerId: playerId });
            })
            .catch(error => {
                // หากเกิดข้อผิดพลาด
                reject(error);
            });
    });
}

// (เพิ่มใหม่) ฟังก์ชันสำหรับ "ฟัง" การอัปเดตของห้อง
export function listenToRoomUpdates(roomId, onUpdateCallback) {
    const roomRef = db.ref('rooms/' + roomId);
    
    // ปิด listener เก่า (ถ้ามี) เพื่อป้องกันการทำงานซ้ำซ้อน
    if (roomListener) {
        roomRef.off('value', roomListener);
    }

    roomListener = roomRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            // กรณีห้องถูกลบ
            onUpdateCallback(null);
            return;
        }
        const roomData = snapshot.val();
        // ส่งข้อมูลห้องที่อัปเดตกลับไปให้ main.js ผ่าน callback
        onUpdateCallback(roomData);
    });
}

// (เพิ่มใหม่) ฟังก์ชันสำหรับหยุดฟัง
export function stopListeningToRoom(roomId) {
    if (roomListener) {
        const roomRef = db.ref('rooms/' + roomId);
        roomRef.off('value', roomListener);
        roomListener = null;
    }
}


export function loadAndDisplayRooms(onRoomClick) {
    console.log("(Firebase) Loading rooms...");
    // โค้ดจริงจะมาทีหลัง
}
