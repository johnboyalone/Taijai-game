// js/cards.js

const cardDeck = [
    {
        id: 'reflective_shield',
        name: 'เกราะสะท้อน',
        description: 'ในตานี้, หากมีคนส่งคำตอบสุดท้ายผิด, เขาจะเสียโอกาส 2 ครั้งแทนที่จะเป็น 1 ครั้ง'
    },
    {
        id: 'misinformation',
        name: 'ปล่อยข่าวลวง',
        description: 'ในตานี้, ผลทาย S/B ของผู้เล่นคนแรกจะสลับกัน (S เป็น B, B เป็น S) ให้คนอื่นเห็น'
    },
    {
        id: 'concealing_fog',
        name: 'หมอกอำพราง',
        description: 'ในตานี้, ผลทายของผู้เล่นทุกคนจะแสดงแค่ว่า "มีเลขถูก" หรือ "OUT" เท่านั้น'
    },
    {
        id: 'emergency_swap',
        name: 'สับเปลี่ยนฉุกเฉิน',
        description: 'คุณสามารถสลับตำแหน่งเลขลับของคุณได้ 2 ตำแหน่งก่อนเริ่มการทาย'
    },
    {
        id: 'time_warp',
        name: 'ยืดเวลา',
        description: 'ลดเวลาทายของผู้เล่นคนอื่นในตานี้ลง 10 วินาที'
    }
];

/**
 * สุ่มการ์ด 1 ใบจากสำรับ
 * @returns {object} การ์ดที่สุ่มได้
 */
export function drawNewCard() {
    const randomIndex = Math.floor(Math.random() * cardDeck.length);
    return cardDeck[randomIndex];
}
