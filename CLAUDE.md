# 🐶 ChiwawaLand — เอกสารส่งต่องานให้ Claude Code

## ภาพรวมโปรเจกต์
เว็บแฟนไซต์ของ "วาว่า" BNK48 (แฟนด้อมชื่อ ChiwawaLand / บ้านชิวาว่าแลนด์)
- **Stack:** HTML/CSS/JS ธรรมดา (vanilla, ไม่มี framework) — deploy บน Vercel ผ่าน GitHub
- **ธีม:** พาสเทล ชมพู/ฟ้า/เขียวมิ้นต์/ทอง · ฟอนต์ Baloo 2, Fredoka, Mitr, Mali, Itim
- **เว็บจริง:** https://wawa-fansite.vercel.app

## โครงสร้างไฟล์
```
wawa-fansite/
├── index.html          # หน้าหลัก (hero, ข่าว, โปรไฟล์, timeline, social, gallery, iam48, why, calendar, stats)
├── token.html          # หน้า BNK Token สะสม + wallet address
├── activity.html       # หน้าเกม (ฝัง game hub)
├── games/
│   ├── games.js        # โค้ดเกม Rhythm Tap + Photo Catch + leaderboard
│   ├── beatmaps.js      # ข้อมูลบีต 2 เพลง (จากแฟนแคมจริง: saikyou 282 โน้ต, pumpkin 160 โน้ต)
│   └── fancam/          # (ต้องสร้าง) เก็บคลิป .mp4
└── images/             # โลโก้, favicon, รูปต่างๆ
```

## 🐞 บั๊กที่ยังแก้ไม่ตก (ต้องการ Claude Code ทดสอบจริง)
**Rhythm Tap ไม่เล่นทั้งภาพวิดีโอและเสียง** แม้ใส่คลิปแล้ว
- ไฟล์เกี่ยวข้อง: `games/games.js` ฟังก์ชัน `playRhythm()` (ราวบรรทัด 88-170)
- ค่าสวิตช์ `USE_VIDEO` (บรรทัด ~74) ต้องตั้ง `true` และใส่ `src` ใน `SONGS`
- โครง DOM: `.rt-playfield` ครอบ `<video>` + `<canvas>` (video เป็น background layer)
- จุดที่น่าตรวจ:
  1. ตอนนี้ `USE_VIDEO` ตั้งค่าไว้ถูกไหม / `song.src` ชี้พาธคลิปถูกไหม
  2. คลิปไฟล์ใหญ่เกิน — อาจต้องบีบอัด (เป้า <20MB, 720p, ตัดยาวพอดีเพลง ~81s/85s)
  3. autoplay policy: เบราว์เซอร์มือถือบล็อกเสียง ต้องเล่นผ่าน user gesture
  4. CSS `.rt-playfield video` กับ `#rtCanvas.rt-canvas-overlay` ใน activity.html ทำงานถูกไหม
  5. การ sync: `now()` ใช้ `video.currentTime` เมื่อ USE_VIDEO — ต้องรอ video โหลดก่อนเริ่มเกม (ตอนนี้อาจเริ่มก่อน video พร้อม)

## ✅ งานที่อยากพัฒนาต่อ
1. แก้บั๊กวิดีโอ Rhythm Tap (ภาพ+เสียง+sync)
2. รอ video พร้อม (loadeddata) ก่อนเริ่มนับโน้ต
3. เพิ่มเกมที่เหลือ: Endless Runner, Wawa Quiz, Memory Match, Spot Wawa (ตอนนี้เป็น "เร็วๆ นี้")
4. **เฟส 2 leaderboard ส่วนกลาง** — ต่อ Supabase (โครงโค้ดมีคอมเมนต์ "เฟส 2" ใน games.js: ฟังก์ชัน loadBoard/saveBoard/recordScore)

## 📝 หมายเหตุสำคัญ
- Leaderboard ตอนนี้ใช้ localStorage (เก็บในเครื่องผู้เล่น) — key คือ `wawa_leaderboard_v2`
- เก็บคะแนนสูงสุดต่อคนต่อเกม, คะแนนรวม = ผลรวมทุกเกม, แสดง Top 10
- nickname เก็บในตัวแปร `NICK`
- ทุกหน้าใช้ nav เหมือนกัน (sticky, มี hamburger บนมือถือ, ปุ่ม Token ทอง + Activity ชมพู)
- คู่มือคลิปแฟนแคม + Supabase อยู่ใน `games/GAMES-README.md`
```
