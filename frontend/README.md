# WMS Frontend

> React 19 · Vite 6 · Tailwind CSS 4  
> Dashboard real-time สำหรับระบบบริหารจัดการคลังสินค้า SB1

ดู README หลักของทั้งระบบได้ที่ [../README.md](../README.md)

---

## สารบัญ

- [Tech Stack](#tech-stack)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้ง](#การติดตั้ง)
- [Environment Variables](#environment-variables)
- [การรัน](#การรัน)
- [หน้าหลัก (Pages)](#หน้าหลัก-pages)
- [Component Structure](#component-structure)
- [Custom Hooks](#custom-hooks)
- [การเชื่อมต่อ API และ WebSocket](#การเชื่อมต่อ-api-และ-websocket)

---

## Tech Stack

| เทคโนโลยี | เวอร์ชัน | วัตถุประสงค์ |
| ---------- | -------- | ------------ |
| React | 19.0 | UI framework |
| Vite | 6.2 | Build tool & Dev server |
| Tailwind CSS | 4.1 | Utility-first styling |
| Axios | 1.13 | HTTP client (REST API) |
| react-use-websocket | 4.13 | WebSocket hook |
| Lucide React | 1.8 | Icon library |
| Material-UI Icons | 7.3 | Supplemental icons |
| Emotion | latest | CSS-in-JS |

---

## โครงสร้างโปรเจกต์

โครงสร้างใช้รูปแบบ **Feature-first / Vertical Slice** — แต่ละ feature มี components, hooks, utils, constants อยู่ครบในที่เดียว ทำให้หาและแก้ไขโค้ดได้ง่ายโดยไม่ต้องกระโดดหลายโฟลเดอร์

```text
frontend/
├── package.json
├── vite.config.js
├── index.html                  ← entry → /src/app/index.jsx
├── .env                        ← Environment variables (ไม่ commit)
│
└── src/
    ├── app/                    ← Entry point
    │   ├── index.jsx           ← Bootstrap React app
    │   ├── App.jsx             ← Root component + navigation state
    │   └── router.jsx          ← Route definitions
    │
    ├── features/               ← หัวใจหลัก: แต่ละ feature อยู่ครบในที่เดียว
    │   ├── dashboard/
    │   │   ├── components/
    │   │   │   ├── DashboardLoadingState.jsx
    │   │   │   ├── LastUpdatedStatus.jsx
    │   │   │   └── SummaryCard.jsx
    │   │   ├── hooks/
    │   │   │   ├── useDashboardData.js       ← ดึงข้อมูลผ่าน REST API
    │   │   │   └── useDashboardRealtime.js   ← รับ WebSocket push
    │   │   ├── utils/
    │   │   │   ├── createDashboardState.js
    │   │   │   └── waitingTimeStyles.js
    │   │   ├── constants/index.js
    │   │   └── index.js                      ← barrel export (public API)
    │   │
    │   ├── queue/
    │   │   ├── components/
    │   │   │   ├── QueueTable.jsx
    │   │   │   └── modal/QueueDetailsModal.jsx
    │   │   ├── hooks/
    │   │   │   └── useTruckQueues.js          ← filter + sort + search
    │   │   ├── utils/
    │   │   │   ├── queueTransforms.js
    │   │   │   ├── queueDetailsModel.js
    │   │   │   └── timelineStyles.js
    │   │   ├── constants/index.js
    │   │   └── index.js
    │   │
    │   ├── yard/
    │   │   ├── components/
    │   │   │   ├── YardPanel.jsx
    │   │   │   ├── ZoneSection.jsx
    │   │   │   ├── SlotCard.jsx
    │   │   │   ├── SlotResourceIcons.jsx
    │   │   │   └── modal/
    │   │   │       ├── YardDetailsModal.jsx
    │   │   │       └── EmptySlotModal.jsx
    │   │   ├── hooks/
    │   │   │   ├── useYardPanel.js
    │   │   │   └── useSlotCard.js
    │   │   ├── utils/
    │   │   │   ├── yardTransforms.js
    │   │   │   ├── yardNormalize.js
    │   │   │   ├── yardMatching.js
    │   │   │   ├── yardDetailsModel.js
    │   │   │   └── slotCardModel.js
    │   │   ├── constants/index.js
    │   │   └── index.js
    │   │
    │   ├── prediction/
    │   │   ├── components/
    │   │   │   ├── MetricCard.jsx            ← การ์ด MAE / RMSE / Accuracy / Total
    │   │   │   ├── ErrorBadge.jsx            ← badge ความคลาดเคลื่อน (สี + นาที)
    │   │   │   ├── PredictionToolbar.jsx     ← search + filter + Export CSV
    │   │   │   ├── PredictionTable.jsx       ← ตาราง + loading/empty state
    │   │   │   └── PredictionPagination.jsx
    │   │   ├── hooks/
    │   │   │   └── usePredictionData.js      ← fetch + filter + pagination
    │   │   ├── utils/
    │   │   │   └── exportCsv.js
    │   │   ├── constants/index.js
    │   │   └── index.js
    │   │
    │   └── notifications/                    ← ระบบแจ้งเตือน (sound, toast, rules)
    │       ├── components/
    │       ├── hooks/
    │       ├── utils/
    │       └── constants/
    │
    ├── shared/                 ← ของที่ใช้ร่วมกันหลาย feature
    │   ├── components/
    │   │   ├── StatusBadge.jsx
    │   │   ├── QueueStatusBadge.jsx
    │   │   ├── WaitingTimeBar.jsx
    │   │   ├── YardSlotStatusBadge.jsx
    │   │   ├── BottomSheet.jsx
    │   │   ├── InfoSection.jsx               ← ใช้ใน QueueDetailsModal + YardDetailsModal
    │   │   └── ModalIconHeader.jsx           ← ใช้ใน QueueDetailsModal + YardDetailsModal
    │   ├── hooks/
    │   │   ├── useLiveClock.js
    │   │   └── useModal.js
    │   ├── utils/
    │   │   ├── dateTime.js
    │   │   └── text.js
    │   └── constants/
    │       ├── app.js
    │       └── dateTime.js
    │
    ├── services/               ← API clients
    │   ├── apiClient.js        ← Axios instance
    │   ├── dashboardService.js
    │   └── predictionService.js
    │
    ├── config/                 ← Environment config (อ่านจาก .env)
    ├── layouts/                ← Layout wrappers
    │   ├── DashboardLayout.jsx
    │   └── Header.jsx
    ├── pages/                  ← Page components (thin composition — ไม่มี logic)
    │   ├── DashboardPage.jsx
    │   └── PredictionPage.jsx
    └── styles/                 ← Global CSS
```

### กฎของโครงสร้าง

| กฎ | รายละเอียด |
| -- | --------- |
| **Feature code อยู่ใน `features/`** | ถ้า code ใช้เฉพาะ feature นั้น → วางใน `features/{feature}/` |
| **Shared code อยู่ใน `shared/`** | ถ้า code ใช้ 2+ feature → วางใน `shared/` |
| **นำเข้าผ่าน barrel** | import จาก feature ผ่าน `index.js` เช่น `import { useDashboardData } from '@/features/dashboard'` |
| **Pages บาง** | `pages/` แค่ compose components — ไม่มี logic ของตัวเอง |

---

## การติดตั้ง

```bash
# 1. เข้า directory
cd frontend

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env (ดูหัวข้อ Environment Variables)
```

---

## Environment Variables

สร้างไฟล์ `.env` ใน `frontend/`:

```env
VITE_API_ORIGIN=http://127.0.0.1:8000
VITE_WS_ORIGIN=ws://127.0.0.1:8000
```

| Variable | ตัวอย่าง | คำอธิบาย |
| -------- | -------- | --------- |
| `VITE_API_ORIGIN` | `http://127.0.0.1:8000` | Base URL ของ Backend REST API |
| `VITE_WS_ORIGIN` | `ws://127.0.0.1:8000` | Base URL ของ WebSocket server |

> หาก Backend รันบน IP หรือ port อื่น ให้แก้ไขที่นี่

---

## การรัน

| คำสั่ง | คำอธิบาย |
| ------- | --------- |
| `npm run dev` | รัน dev server ที่ `http://localhost:3000` พร้อม HMR |
| `npm run build` | Build production → output ที่ `dist/` |
| `npm run preview` | Preview production build ก่อน deploy |
| `npm run test` | รัน unit tests |
| `npm run test:watch` | รัน tests แบบ watch mode |

**Dev server:**

```bash
npm run dev
```

เมื่อรันสำเร็จ:

```text
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://0.0.0.0:3000/
```

**Production build:**

```bash
npm run build
# ไฟล์ output อยู่ใน dist/
```

---

## หน้าหลัก (Pages)

### Dashboard Page

แสดงข้อมูล warehouse แบบ real-time โดยรับข้อมูลผ่าน WebSocket

| ส่วน | คำอธิบาย |
| ---- | --------- |
| Summary Bar | จำนวนรถ: รอคิว · กำลังโหลด · เสร็จสิ้น · เกินเวลา · ช่องว่าง |
| Truck Queue | ตารางรถทุกคันพร้อมสถานะ ประเภทคิว สินค้า และ timestamps |
| Yard Panel | แผนผัง Yard แสดงสถานะทุกช่องโหลดและ forklift |
| Notifications | แจ้งเตือนรถที่รอนานเกินกำหนด พร้อมเสียงและ toast |

### Prediction Page

แสดงรายงานความแม่นยำของ ML model

| ส่วน | คำอธิบาย |
| ---- | --------- |
| Metrics Summary | MAE · RMSE · Accuracy ±15 นาที |
| Comparison Table | เวลาพยากรณ์ vs เวลาจริงรายคัน พร้อม error |
| Filter & Pagination | กรองตามวันที่ ประเภทรถ |
| Export CSV | Download รายงานเป็นไฟล์ CSV |

---

## Component Structure

| ที่อยู่ | Components |
| ------- | ---------- |
| `shared/components/` | StatusBadge · QueueStatusBadge · WaitingTimeBar · YardSlotStatusBadge · BottomSheet · InfoSection · ModalIconHeader |
| `features/dashboard/components/` | SummaryCard · LastUpdatedStatus · DashboardLoadingState |
| `features/queue/components/` | QueueTable · QueueDetailsModal |
| `features/yard/components/` | YardPanel · ZoneSection · SlotCard · SlotResourceIcons · YardDetailsModal · EmptySlotModal |
| `features/prediction/components/` | MetricCard · ErrorBadge · PredictionToolbar · PredictionTable · PredictionPagination |
| `features/notifications/components/` | NotificationMenu · NotificationToast |

---

## Custom Hooks

| Hook | ที่อยู่ | คำอธิบาย |
| ---- | ------- | --------- |
| `useDashboardData` | `features/dashboard/` | ดึงข้อมูล dashboard ผ่าน REST API (`/api/dashboard/snapshot/`) |
| `useDashboardRealtime` | `features/dashboard/` | จัดการ WebSocket connection และรับ push data ทุก 10 วินาที |
| `useTruckQueues` | `features/queue/` | Filter, sort, search สำหรับ truck queue |
| `useYardPanel` | `features/yard/` | State ของ Yard panel (open/close, selected zone) |
| `useSlotCard` | `features/yard/` | State ของ slot card แต่ละช่อง |
| `usePredictionData` | `features/prediction/` | Fetch + filter + pagination สำหรับ prediction report |
| `useLiveClock` | `shared/hooks/` | นาฬิกาที่อัปเดตทุกวินาที |
| `useModal` | `shared/hooks/` | เปิด/ปิด modal พร้อม payload |

---

## การเชื่อมต่อ API และ WebSocket

### REST API

ใช้ Axios เรียก Backend ที่ `VITE_API_ORIGIN`:

```js
// ตัวอย่าง: ดึง snapshot
GET http://127.0.0.1:8000/api/dashboard/snapshot/?plant_code=COM20060001
```

### WebSocket

เชื่อมต่อที่ `VITE_WS_ORIGIN` ด้วย `react-use-websocket`:

```js
// WebSocket URL
ws://127.0.0.1:8000/ws/dashboard/stream/?plant_code=COM20060001
```

Server จะ push ข้อมูลใหม่ให้อัตโนมัติทุก **10 วินาที** โดยไม่ต้องร้องขอ
