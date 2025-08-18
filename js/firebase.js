// js/firebase.js

// --- Firebase Initialization ---
// ตรวจสอบให้แน่ใจว่าคุณใส่ Firebase Config ของคุณที่นี่
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
export const db = firebase.database(); // Export database instance

// --- Room Management Functions ---
// เราจะสร้างฟังก์ชันเหล่านี้ในขั้นตอนถัดไป แต่ export ชื่อไว้ก่อน
export function createRoom(hostName, roomName, password) {
    console.log(`(Firebase) Creating room: ${roomName} by ${hostName}`);
    // โค้ดจริงจะมาทีหลัง
    // ตอนนี้แค่จำลองว่าสร้างสำเร็จและแสดง Toast
    return Promise.resolve({ roomId: 'DUMMY_ROOM_ID', playerId: 'player1' });
}

export function loadAndDisplayRooms(onRoomClick) {
    console.log("(Firebase) Loading rooms...");
    // โค้ดจริงจะมาทีหลัง
}

// (ฟังก์ชันอื่นๆ ที่จะใช้ในอนาคต)
