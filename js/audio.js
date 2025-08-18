// js/config.js

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAAeQyoxlwHv8Qe9yrsoxw0U5SFHTGzk8o",
  authDomain: "taijai.firebaseapp.com",
  databaseURL: "https://taijai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "taijai",
  storageBucket: "taijai.appspot.com",
  messagingSenderId: "262573756581",
  appId: "1:262573756581:web:c17bfc795b5cf139693d4c"
};

// GAME STATE VARIABLES
let currentRoomId = null;
let joiningRoomData = null;
let currentPlayerId = null;
let currentTargetId = null;
let roomListener = null;
let roomListListener = null;
let currentGuess = [];
const GUESS_LENGTH = 4;
let isMuted = false;
let turnTimerInterval = null;
const TURN_DURATION = 20;

// AUDIO REFERENCES
const sounds = {
    background: new Audio('sounds/background-music.mp3'),
    click: new Audio('sounds/click.mp3'),
    win: new Audio('sounds/win-wow.mp3'),
    wrong: new Audio('sounds/wrong-answer.mp3'),
    turn: new Audio('sounds/your-turn.mp3')
};

// UI ELEMENT REFERENCES
const screens = { /* ...คัดลอก object screens ทั้งหมดมาวางที่นี่... */ };
const ui = { /* ...คัดลอก object ui ทั้งหมดมาวางที่นี่... */ };
