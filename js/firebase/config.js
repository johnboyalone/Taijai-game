// js/firebase/config.js

// ประกาศตัวแปร db เพื่อให้ไฟล์อื่นในโมดูล Firebase ใช้งานร่วมกันได้
export let db;

export function initializeFirebase() {
    // ใส่ข้อมูล Firebase Configuration จากโปรเจกต์เดิมของคุณ
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
    db = firebase.database();
}
