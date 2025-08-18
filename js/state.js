export const state = {
    currentRoomId: null,
    joiningRoomData: null,
    currentPlayerId: null,
    currentTargetId: null,
    roomListener: null,
    roomListListener: null,
    currentGuess: [],
    isMuted: false,
    turnTimerInterval: null,
    selectedGameMode: null,
    roomData: null, // เก็บข้อมูลห้องล่าสุด
};

export const constants = {
    GUESS_LENGTH: 4,
    TURN_DURATION: 20,
};
