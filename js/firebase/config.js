export let db;

export function initializeFirebase() {
    const firebaseConfig = {
      apiKey: "AIzaSyAAeQyoxlwHv8Qe9yrsoxw0U5SFHTGzk8o",
      authDomain: "taijai.firebaseapp.com",
      databaseURL: "https://taijai-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "taijai",
      storageBucket: "taijai.appspot.com",
      messagingSenderId: "262573756581",
      appId: "1:262573756581:web:c17bfc795b5cf139693d4c"
    };
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
}
