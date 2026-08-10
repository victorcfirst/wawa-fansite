# 🎂 หน้าอวยพรวันเกิดวาว่า — คู่มือติดตั้ง

ไฟล์: `birthday.html`
เก็บคำอวยพรใน **Supabase** (โปรเจกต์เดียวกับ leaderboard เกม)

---

## 1. สร้างตารางใน Supabase (ทำครั้งเดียว)

เข้า Supabase → **SQL Editor** → วางโค้ดนี้แล้วกด Run

```sql
-- ตารางเก็บคำอวยพรวันเกิด
create table if not exists birthday_wishes (
  id         bigserial primary key,
  name       text        not null,
  message    text        not null,
  color      smallint    not null default 0,
  created_at timestamptz not null default now()
);

-- index สำหรับเรียงล่าสุดขึ้นก่อน
create index if not exists birthday_wishes_created_idx
  on birthday_wishes (created_at desc);

-- เปิด Row Level Security
alter table birthday_wishes enable row level security;

-- ทุกคนอ่านได้
create policy "public read wishes"
  on birthday_wishes for select
  using (true);

-- ทุกคนเขียนได้ (ไม่ต้อง login)
create policy "public insert wishes"
  on birthday_wishes for insert
  with check (true);
```

> **หมายเหตุ:** ไม่ได้เปิด policy `update` / `delete` ไว้ — คนทั่วไปจึงแก้หรือลบคำอวยพรของคนอื่นไม่ได้
> ถ้าแอดมินต้องการลบข้อความไม่เหมาะสม ให้ลบผ่านหน้า **Table Editor** ใน Supabase ได้เลย

---

## 2. ตรวจสอบว่าใช้งานได้

1. เปิด `birthday.html`
2. กรอกชื่อ + คำอวยพร แล้วกดส่ง
3. ถ้าขึ้น **"ส่งคำอวยพรเรียบร้อยแล้ว ขอบคุณนะ! 🎉"** = ต่อ Supabase สำเร็จ
4. ถ้าขึ้น **"บันทึกไว้ในเครื่องแล้ว (เชื่อมต่อเซิร์ฟเวอร์ไม่ได้) 💾"** = ยังไม่ได้สร้างตาราง หรือ policy ไม่ถูก
   → เปิด Console (F12) ดู error แล้วกลับไปทำข้อ 1 ใหม่

---

## 3. ค่าที่ปรับได้ในไฟล์ `birthday.html`

อยู่ในบล็อก `/* ════ CONFIG ════ */` ท้ายไฟล์

| ตัวแปร | ค่าปัจจุบัน | ความหมาย |
|---|---|---|
| `BIRTHDAY` | `2026-08-11T00:00:00+07:00` | วันเวลาที่นับถอยหลังไปหา · พอถึงเวลาแล้วหน้าจะสลับเป็นโหมดฉลองอัตโนมัติ |
| `COOLDOWN_MS` | `30000` (30 วิ) | เว้นระยะห่างขั้นต่ำระหว่างการส่งแต่ละครั้ง (กันสแปม) |
| `TABLE` | `birthday_wishes` | ชื่อตารางใน Supabase |

ข้อความอื่นที่แก้ได้ตรงๆ ใน HTML:
- อายุ — ค้นหา `ครบ 17 ปีแล้ว`
- รูปหลัก — `images/wawa.jpg`
- แกลเลอรี่ 6 รูป — `images/wawa-1.jpg` ถึง `wawa-6.jpg`

---

## 4. ฟีเจอร์ที่มีในหน้า

- **นับถอยหลัง** ถึงวันเกิด → พอถึงเวลาสลับเป็น "วันนี้วันเกิดวาว่า!" + ยิงคอนเฟตตี
- **ฟอร์มอวยพร** — ชื่อ (40 ตัว) + ข้อความ (500 ตัว) + เลือกสีการ์ด 5 สี
- **กระดานคำอวยพร** — การ์ดแบบ masonry ล่าสุดอยู่บนสุด, โหลดสูงสุด 300 ข้อความ, รีเฟรชอัตโนมัติทุก 60 วินาที
- **กันสแปม** — cooldown 30 วิ/เครื่อง, จำกัดความยาว, ต้องพิมพ์อย่างน้อย 5 ตัวอักษร
- **กัน XSS** — ข้อความทุกอันแสดงผ่าน `textContent` ไม่ใช่ `innerHTML`
- **Fallback** — ถ้า Supabase ล่ม จะเก็บลง localStorage ไม่ให้คำอวยพรหาย
- **จำชื่อ** — ใช้ key `wawa_profile_v1` ร่วมกับหน้าเกม ถ้าเคยกรอกชื่อในเกมแล้วจะเติมให้อัตโนมัติ
- **ปุ่มแชร์** — คัดลอกลิงก์หน้านี้

---

## 5. ถ้าอยากลบคำอวยพรที่ไม่เหมาะสม

Supabase → **Table Editor** → `birthday_wishes` → เลือกแถว → Delete

หรือใช้ SQL:

```sql
delete from birthday_wishes where id = <ใส่ id>;
```
