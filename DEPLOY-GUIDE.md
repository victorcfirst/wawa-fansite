# 🐶 คู่มือ Deploy เว็บบ้านชิวาว่าแลนด์ขึ้น Vercel (สำหรับมือใหม่)

## 📦 โครงสร้างไฟล์ในโปรเจกต์
```
wawa-fansite/
├── index.html                  ← หน้าเว็บหลัก
└── images/
    ├── logo.png                ← โลโก้ต้นฉบับ (พื้นดำ)
    ├── logo-transparent.png    ← โลโก้พื้นใส (ใช้บนเว็บ)
    ├── favicon.ico             ← thumbnail บน tab เบราว์เซอร์
    ├── favicon-32.png
    ├── apple-touch-icon.png    ← ไอคอนตอน save ลงมือถือ
    ├── icon-192.png
    └── (วางรูปวาว่าที่นี่: wawa.jpg, wawa-1.jpg ถึง wawa-6.jpg)
```

✅ favicon (thumbnail บน tab) ตั้งค่าให้เรียบร้อยแล้ว — ใช้โลโก้ชิวาว่าแลนด์

---

## ✅ สิ่งที่ต้องเตรียม (ฟรีทั้งหมด!)
- บัญชี GitHub (github.com)
- บัญชี Vercel (vercel.com)

---

## 📋 ขั้นตอนที่ 1 — สร้างบัญชี GitHub
1. ไปที่ **github.com** → คลิก Sign Up
2. กรอก Email, Password, Username แล้วยืนยัน Email

## 📁 ขั้นตอนที่ 2 — สร้าง Repository
1. Login GitHub → คลิก **"New"** (ปุ่มสีเขียว)
2. ตั้งชื่อ repo เช่น `wawa-fansite` → เลือก **Public**
3. คลิก **Create repository**

## 💻 ขั้นตอนที่ 3 — อัปโหลดไฟล์ (ไม่ต้องใช้ Terminal)
1. ในหน้า repo คลิก **"uploading an existing file"**
2. ลากทั้งโฟลเดอร์ (index.html + โฟลเดอร์ images ทั้งอัน) มาวาง
   - ⚠️ สำคัญ: ต้องอัปโหลดโฟลเดอร์ images ขึ้นไปด้วย ไม่งั้นโลโก้กับ favicon จะไม่ขึ้น
3. เลื่อนลงมา → กด **"Commit changes"**

## 🚀 ขั้นตอนที่ 4 — Deploy บน Vercel
1. ไปที่ **vercel.com** → Sign Up → เลือก **Continue with GitHub**
2. กด **Authorize**
3. คลิก **"Add New Project"** → เลือก repo `wawa-fansite` → **Import**
4. คลิก **Deploy** (ไม่ต้องแก้อะไร)
5. รอ ~30 วินาที → ได้ URL เว็บจริงเลย! 🎉

URL จะเป็นแบบ: `https://wawa-fansite.vercel.app`

---

## 🖼️ วิธีเพิ่มรูปจริงของวาว่า
1. เตรียมรูป ตั้งชื่อตามนี้:
   - `wawa.jpg` — รูปโปรไฟล์วงกลมหน้าแรก
   - `wawa-1.jpg` ถึง `wawa-6.jpg` — รูปในแกลเลอรี่
2. อัปโหลดเข้าโฟลเดอร์ `images/` บน GitHub
3. รูปจะขึ้นอัตโนมัติ! (ถ้ายังไม่มีรูป จะโชว์ไอคอนน่ารักแทน)

## ✏️ วิธีอัปเดตเว็บในอนาคต
1. แก้ไฟล์บน GitHub (คลิกไฟล์ → ไอคอนดินสอ) → **Commit changes**
2. Vercel จะ Deploy ใหม่อัตโนมัติภายใน 30 วินาที!

---

## 🎀 ฟีเจอร์ในเว็บเวอร์ชันนี้
- 🐶 โลโก้ชิวาว่าแลนด์ + favicon บน tab
- ⏰ นับถอยหลังอีเวนต์ถัดไป + วันเกิด (เปลี่ยนวันที่ได้ที่ data-target ใน index.html)
- 🔗 การ์ดลิงก์สำคัญ (pre-order, shop, iAM48, MV)
- 💖 ทำไมต้องโอชิวาว่า + วิดีโอแนะนำ
- 🌱 Timeline เส้นทางการเติบโต
- 📅 ปฏิทินงานแบบเต็ม + ปุ่มกรองประเภท
- 📸 แกลเลอรี่ + ฟีด iAM48

*Happy fansiting! 🐶💕 บ้านชิวาว่าแลนด์*
