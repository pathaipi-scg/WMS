# โครงสร้างโค้ด `frontend/src`

สถาปัตยกรรมแบบ **feature-based**: โค้ดของแต่ละความสามารถ (feature) อยู่รวมกันในโฟลเดอร์เดียว
ส่วน `pages/` ทำหน้าที่แค่ "ประกอบ" feature ต่างๆ เข้าด้วยกันเป็นหน้าจอตาม route

## หน้า (page) ประกอบจาก feature ไหนบ้าง

| Page (route)                    | ประกอบจาก feature                                  |
| ------------------------------- | -------------------------------------------------- |
| `DashboardPage` (`/`)           | `dashboard` + `queue` + `yard`                     |
| `PredictionPage` (`/predictions`) | `prediction` (+ ยืม `DateRangePicker` จาก `analytics`) |
| `AnalyticsPage` (`/analytics`)  | `analytics`                                         |
| ทุกหน้า (ผ่าน `Header`/`layout`) | `notifications`                                     |

> จำนวน feature (6) มากกว่าจำนวน page (3) เป็นเรื่องปกติ — หนึ่งหน้าประกอบจากหลาย feature ได้
> และ feature อย่าง `queue`/`yard`/`notifications` ถูกออกแบบให้นำกลับไปใช้ซ้ำได้ จึงไม่ฝังไว้ในหน้าใดหน้าหนึ่ง

## โฟลเดอร์แต่ละตัว

```
src/
├── app/        จุดเริ่มต้นแอป + routing (App, router, index)
├── config/     ค่าคอนฟิกจาก environment (env.js)
├── layouts/    โครงหน้าร่วม (DashboardLayout, Header)
├── pages/      หน้าจอตาม route — ประกอบ feature เข้าด้วยกัน (ไม่มี business logic หนักๆ)
├── services/   ชั้นเรียก API (apiClient + service ต่อโดเมน)
├── styles/     สไตล์ส่วนกลาง (global.css)
├── shared/     ของกลางที่ใช้ข้ามหลาย feature
│   ├── components/  UI primitives (StatusBadge, WaitingTimeBar, modal/, feedback/)
│   ├── hooks/       hook ทั่วไป (useLiveClock, useModal)
│   ├── utils/       ฟังก์ชันช่วย (text, dateTime)
│   └── constants/   ค่าคงที่ส่วนกลาง (app, dateTime)
└── features/   แต่ละ feature แยกเป็นสัดส่วน
    ├── analytics/
    ├── dashboard/
    ├── notifications/
    ├── prediction/
    ├── queue/
    └── yard/
```

ภายในแต่ละ feature ใช้รูปแบบเดียวกัน:

```
features/<ชื่อ>/
├── components/   UI ของ feature นี้ (modal ย่อยไว้ใน components/modal/)
├── hooks/        logic + การดึงข้อมูลของ feature นี้
├── utils/        ฟังก์ชันแปลง/คำนวณข้อมูล
├── constants/    ค่าคงที่ของ feature นี้
└── index.js      barrel export — import จากภายนอกให้ดึงผ่านไฟล์นี้เท่านั้น
```

## จะเพิ่มโค้ดใหม่ วางตรงไหน?

- ใช้แค่ feature เดียว → วางในโฟลเดอร์ feature นั้น
- ใช้ข้าม feature ตั้งแต่ 2 ตัวขึ้นไป → ย้ายขึ้นไป `shared/`
- เป็นหน้าจอใหม่ → สร้างใน `pages/` แล้วเพิ่ม route ใน `app/router.jsx`
- import ของ feature จากภายนอก → ดึงผ่าน `features/<ชื่อ>/index.js` (barrel) ไม่ลึกเข้าไปในไฟล์ตรงๆ
