// js/firebase.js (เวอร์ชันเริ่มต้นใหม่)

// 1. ใส่ Firebase Config ของคุณ
const firebaseConfig = {
    apiKey: "AIzaSyAAeQyoxlwHv8Qe9yrsoxw0U5SFHTGzk8o",
    authDomain: "taijai.firebaseapp.com",
    databaseURL: "https://taijai-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "taijai",
    storageBucket: "taijai.appspot.com",
    messagingSenderId: "262573756581",
    appId: "1:262573756581:web:c17bfc795b5cf139693d4c"
};

// 2. Initialize Firebase (พร้อมตัวป้องกันการรันซ้ำ)
if (!firebase.apps.length) {
    console.log("firebase.js: Initializing Firebase...");
    firebase.initializeApp(firebaseConfig);
}

// 3. Export ตัวแปร database เพื่อให้ไฟล์อื่นนำไปใช้ได้
export const db = firebase.database();

console.log("firebase.js: Firebase initialized and db exported.");
