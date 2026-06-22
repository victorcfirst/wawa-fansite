# 🎮 คู่มือ WAWA GAME HUB

## 📁 โครงสร้างไฟล์เกม
```
wawa-fansite/
├── activity.html          ← หน้าเกม (ฝัง game hub แล้ว)
└── games/
    ├── beatmaps.js        ← ข้อมูลบีตเพลง (จากแฟนแคมจริง)
    ├── games.js           ← โค้ดเกม Rhythm Tap + Photo Catch + leaderboard
    └── fancam/            ← (สร้างเอง) เก็บคลิปแฟนแคม .mp4
```

---

## 🎬 วิธีใส่คลิปแฟนแคมประกอบเกม Rhythm Tap

ตอนนี้เกม Rhythm Tap เล่นได้เลยโดยใช้ beatmap จากแฟนแคมจริง (จับจังหวะไว้แล้ว)
แต่ยัง **ไม่มีวิดีโอ/เสียง** เล่นประกอบ ถ้าอยากให้มีคลิปแฟนแคมเล่นไปพร้อมเกม ทำตามนี้:

### ขั้นที่ 1 — เตรียมไฟล์คลิป
- ต้องเป็นไฟล์ **.mp4** (H.264) — เล่นได้ทุกเบราว์เซอร์
- แนะนำความยาวตรงกับ beatmap:
  - `Saikyou Twintail` ≈ 81 วินาที
  - `Oh my Pumpkin` ≈ 85 วินาที
- ขนาดไฟล์ไม่ควรเกิน ~25 MB ต่อคลิป (เพื่อให้โหลดเร็ว)
- ถ้าไฟล์ใหญ่ไป บีบอัดก่อนได้ที่เว็บฟรี เช่น freeconvert.com หรือ handbrake

### ขั้นที่ 2 — อัปโหลดเข้า GitHub
1. ในโฟลเดอร์ `games/` สร้างโฟลเดอร์ย่อยชื่อ `fancam`
2. อัปโหลดคลิปเข้าไป ตั้งชื่อให้ตรง เช่น:
   - `games/fancam/saikyou.mp4`
   - `games/fancam/pumpkin.mp4`

### ขั้นที่ 3 — เปิดใช้งานวิดีโอในโค้ด
เปิดไฟล์ `games/games.js` แล้วแก้ 2 จุด:

**จุดที่ 1** — เปลี่ยน `USE_VIDEO` จาก `false` เป็น `true`:
```js
const USE_VIDEO = true;
```

**จุดที่ 2** — ใส่พาธคลิปในช่อง `src` ของแต่ละเพลง:
```js
const SONGS = [
  { id: 'saikyou', title: 'Saikyou Twintail', ... , src: 'games/fancam/saikyou.mp4' },
  { id: 'pumpkin', title: 'Oh my Pumpkin',   ... , src: 'games/fancam/pumpkin.mp4' }
];
```

เสร็จแล้ว commit ขึ้น GitHub → Vercel อัปเดตเอง
เกมจะเล่นคลิปไปพร้อมกับโน้ต และ sync จังหวะกับวิดีโออัตโนมัติ 🎵

> ⚠️ หมายเหตุลิขสิทธิ์: คลิปแฟนแคมควรเป็นคลิปที่คุณถ่าย/มีสิทธิ์ใช้เอง
> หรือได้รับอนุญาตจากเจ้าของคลิป เพื่อหลีกเลี่ยงปัญหาลิขสิทธิ์

---

## 🏆 เพิ่มเพลงใหม่ในเกม Rhythm Tap (ภายหลัง)

1. ต้องมี beatmap (ลิสต์เวลาโน้ต) ของเพลงใหม่ — ส่งคลิปมาให้ Claude วิเคราะห์บีตให้ได้
2. เพิ่มข้อมูลลงใน `games/beatmaps.js` และ `SONGS` ใน `games.js`

---

## 🌐 เฟส 2 — ทำ Leaderboard ส่วนกลาง (ทุกคนเห็นร่วมกัน)

ตอนนี้คะแนนเก็บใน **เครื่องของผู้เล่นแต่ละคน** (localStorage)
ถ้าอยากให้ทุกคนเห็นคะแนนร่วมกันจริงๆ ต้องต่อฐานข้อมูลกลาง แนะนำ **Supabase** (ฟรี):

### ภาพรวมขั้นตอน
1. สมัคร supabase.com (ฟรี) → สร้าง project
2. สร้างตาราง `scores` (คอลัมน์: name, game, score, date)
3. เอา API URL + anon key มาใส่ในโค้ด
4. แก้ฟังก์ชัน `loadBoard()` และ `recordScore()` ใน `games.js`
   ให้ดึง/เขียนข้อมูลผ่าน Supabase แทน localStorage

โค้ดส่วนนี้วางโครงไว้ให้แล้วใน `games.js` (ดูคอมเมนต์ "เฟส 2")
เมื่อพร้อมทำจริง ส่งข้อความบอก Claude ได้เลย เดี๋ยวเขียนให้ครบ

---

## 🎯 เกมที่มีตอนนี้
- ✅ **Rhythm Tap** — กดตามจังหวะ 2 เพลง (Saikyou Twintail, Oh my Pumpkin)
- ✅ **Photo Catch** — รับการ์ดวาว่า เลี่ยงระเบิด
- 🔜 Endless Runner, Wawa Quiz, Memory Match, Spot Wawa (เตรียมไว้)

*Happy gaming! 🐶🎮 บ้านชิวาว่าแลนด์*
