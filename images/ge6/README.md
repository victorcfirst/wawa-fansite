# 🗳️ รูปสำหรับหน้า GE6

วางไฟล์รูปในโฟลเดอร์นี้ **ตั้งชื่อให้ตรงตามตาราง** แล้วรูปจะขึ้นบนหน้า `ge6.html` เองทันที
ถ้ายังไม่มีไฟล์ไหน ตรงนั้นจะโชว์กรอบเส้นประบอกชื่อไฟล์ไว้ — หน้าไม่พัง

| ชื่อไฟล์ | ใช้ตรงไหน |
|---|---|
| `ttb-logo.png` | โลโก้ธนาคาร ttb บนการ์ดบัญชีบ้าน (แนะนำ PNG พื้นหลังโปร่ง) |
| `theme-promo.jpg` | แท็บกิจกรรม — รูปโปรโมตธีม `#21SINGWithWawa` (ช่องซ้าย) |
| `theme-map.jpg` | แท็บกิจกรรม — แผนที่รวมภารกิจ (ช่องขวา) |
| `mission-2.jpg` | กระดาน Mission 2 · STAR SIGNAL (สิ้นสุดแล้ว) |
| `mission-1.jpg` | กระดาน Mission 1 · The Awakening (สิ้นสุดแล้ว) |
| `mission-0.jpg` | กระดาน Mission 0 · #RisingWithWawa (สิ้นสุดแล้ว) |
| `announce-01.jpg` | แท็บประกาศ — ประกาศฉบับที่ 1 |
| `mission-3.jpg` | กระดาน Mission 3 · Follow the Pawprints (สิ้นสุดแล้ว) |
| `side-mission-1.jpg` | สรุป Side Mission 1 · อวยพรวันเกิด (สิ้นสุดแล้ว) |
| `side-mission-2.jpg` | กระดาน Side Mission 2 · Flip With Wawa (สิ้นสุดแล้ว) |
| `mission-4.jpg` | กระดาน Mission 4 · Feed the Guardian (สิ้นสุดแล้ว) |
| `donation-summary.jpg` | โซนสรุปยอดสนับสนุน · Donation Summary |
| `side-mission-3.jpg` | กระดาน Side Mission 3 · Hearts for Wawa (สิ้นสุดแล้ว) |
| `mission-5.jpg` | กระดาน Mission 5 · Gear Up, Little Hero! (สิ้นสุดแล้ว) |
| `side-mission-4.jpg` | กระดาน Side Mission 4 · Wawa Recovery Camp (เปิดอยู่) |
| `wawa-ge6-form.jpg` | การ์ด "วาว่าส่งใบสมัครแล้ว" ใต้การ์ดนับถอยหลัง |
| `statement-latest.jpg` | แท็บ Statement — รูป statement ล่าสุด |

## ข้อแนะนำ

- ไฟล์ `.jpg` ย่อให้เหลือ **ด้านยาวสุดไม่เกิน ~1200px** และขนาดไม่เกิน ~500KB ต่อรูป
  หน้าเว็บจะโหลดไวขึ้นมากบนมือถือ (รูปกระดานปกติส่งออกมา 1080×1080 อยู่แล้ว ใช้ได้เลย)
- ถ้าจะเปลี่ยนชื่อไฟล์ ต้องไปแก้ `src` ใน `ge6.html` ให้ตรงกันด้วย

## เพิ่มภารกิจใหม่ในอนาคต

1. วางรูปกระดานเป็น `mission-4.jpg` / `side-mission-3.jpg` (นับต่อไปเรื่อยๆ)
2. ใน `ge6.html` ก๊อปการ์ด `.act-card.has-shot` ที่อยู่ใน `#openActivities` มาวางแล้วแก้ข้อความ
3. พอภารกิจจบ ให้ย้ายการ์ดนั้นไปไว้**บนสุด**ของ `#closedActivities`
   แล้วเปลี่ยน tag เป็น `<span class="act-tag tag-done">✓ สำเร็จแล้ว</span>`

## อัปเดตยอดในแถบความคืบหน้า

แก้ที่ `data-now` ของ `<div class="mp" data-now="780" data-goal="4800">` — แถบกับตัวเลขจะขยับตามเอง

## อัปเดตโซนสรุปยอดสนับสนุน (Donation Summary)

ใน `ge6.html` หา `.ds-table` — ก๊อป `.ds-row` มาวางต่อท้ายเวลามีภารกิจใหม่
แล้วแก้ยอดรวม 2 ที่ใน `.ds-total` ให้ตรงกัน — ทั้ง `data-total="117448"` (ตัวเลขล้วน)
และข้อความ `฿ 117,448.00` · จำนวนโหวตข้างล่างคำนวณจาก `data-total` ให้เอง (token ละ 68 บาท)
อย่าลืมแก้วันที่ใน `.ds-updated` ด้วย
(ยอดในแท็บ Statement เป็นคนละที่ ต้องแก้แยก)

## ยอด Token ในหน้า GE6

แท็บ Token ของ `ge6.html` **ดึงตัวเลขจาก `token.html` มาแสดงเอง** ตอนเปิดหน้า
อัปเดตที่ `token.html` ที่เดียวพอ ไม่ต้องมาแก้สองที่
(เลขที่เขียนไว้ใน `ge6.html` เป็นแค่ค่าสำรองเผื่อโหลดไม่ได้)
