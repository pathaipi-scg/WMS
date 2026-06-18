# WMS Frontend

> React 19 · Vite 6 · Tailwind CSS 4
> Dashboard real-time + Analytics + Prediction report สำหรับระบบบริหารจัดการคลังสินค้า SB1

ดู README หลักของทั้งระบบ (Quick Start, Tech Stack, Business Workflow, Deploy) ที่ [../README.md](../README.md)

---

## สารบัญ

- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้งและการรัน](#การติดตั้งและการรัน)
- [Environment Variables](#environment-variables)
- [หน้าหลัก (Pages)](#หน้าหลัก-pages)
- [Components & Hooks](#components--hooks)
- [การเชื่อมต่อ API และ WebSocket](#การเชื่อมต่อ-api-และ-websocket)
- [การไหลของข้อมูล Real-time](#การไหลของข้อมูล-real-time)

---

## โครงสร้างโปรเจกต์

ใช้รูปแบบ **Feature-first / Vertical Slice** — แต่ละ feature มี components, hooks, utils, constants อยู่ครบในที่เดียว ทำให้หาและแก้ไขโค้ดได้ง่ายโดยไม่ต้องกระโดดหลายโฟลเดอร์

```text
frontend/
├── package.json                ← dependency + คำสั่ง npm
├── vite.config.js              ← ตั้งค่า Vite
├── index.html                  ← entry point ของหน้าเว็บ
├── .env.example                ← ตัวอย่างไฟล์ตั้งค่า
│
└── src/                        ← โค้ดหน้าเว็บ
    ├── app/                    ← จุดเริ่มแอป + เส้นทางหน้า
    ├── features/               ← โค้ดแยกตามฟีเจอร์
    │   ├── dashboard/          ← หน้าภาพรวม real-time
    │   ├── queue/              ← ตารางคิวรถ
    │   ├── yard/               ← แผนผัง Yard
    │   ├── analytics/          ← กราฟวิเคราะห์ข้อมูล
    │   ├── prediction/         ← รายงานผลโมเดล
    │   └── notifications/      ← แจ้งเตือน (เสียง + toast)
    │
    ├── shared/                 ← ของใช้ร่วมกัน (components · hooks · utils · constants)
    ├── services/               ← ตัวเรียก API/WebSocket
    ├── config/                 ← อ่านค่าจาก .env
    ├── layouts/                ← โครงหน้าร่วม
    ├── pages/                  ← หน้าเพจ
    └── styles/                 ← ไฟล์ CSS
```

### กฎของโครงสร้าง

| กฎ | รายละเอียด |
| -- | --------- |
| **Feature code อยู่ใน `features/`** | code ที่ใช้เฉพาะ feature → วางใน `features/{feature}/` |
| **Shared code อยู่ใน `shared/`** | code ที่ใช้ 2+ feature → วางใน `shared/` |
| **นำเข้าผ่าน barrel** | import ผ่าน `index.js` เช่น `import { useDashboardData } from '@/features/dashboard'` |
| **Pages บาง** | `pages/` แค่ compose components — ไม่มี logic ของตัวเอง |
| **Path alias** | `@` → `./src` (ตั้งใน vite.config.js) |

---

## การติดตั้งและการรัน

```bash
cd frontend
npm install
copy .env.example .env     # ค่า default ชี้ไป http://127.0.0.1:3004
```

| คำสั่ง | คำอธิบาย |
| ------- | --------- |
| `npm run dev` | dev server ที่ `http://localhost:3000` พร้อม HMR |
| `npm run build` | build production → `dist/` |
| `npm run preview` | preview production build ก่อน deploy |
| `npm run test` | รัน unit tests |
| `npm run test:watch` | tests แบบ watch mode |

> ต้องรัน Backend (Daphne, port 3004) คู่กันด้วยเพื่อให้ Dashboard real-time ทำงาน — ดู [../README.md](../README.md)

---

## Environment Variables

สร้าง `.env` จาก `.env.example`:

```env
VITE_API_ORIGIN=http://127.0.0.1:3004
VITE_WS_ORIGIN=ws://127.0.0.1:3004
```

| Variable | ตัวอย่าง | คำอธิบาย |
| -------- | -------- | --------- |
| `VITE_API_ORIGIN` | `http://127.0.0.1:3004` | Base URL ของ Backend REST API |
| `VITE_WS_ORIGIN` | `ws://127.0.0.1:3004` | Base URL ของ WebSocket server |

> ค่า default ในโค้ด ([config/env.js](src/config/env.js)) คือ `http://127.0.0.1:3004` — หาก Backend รันบน IP / port อื่น ให้แก้ที่นี่

---

## หน้าหลัก (Pages)

มี 3 หน้า ตรงกับ 3 route ใน [app/router.jsx](src/app/router.jsx): `/` · `/predictions` · `/analytics`

### Dashboard Page (`/`)
แสดงข้อมูล warehouse แบบ real-time ผ่าน WebSocket

| ส่วน | คำอธิบาย |
| ---- | --------- |
| Summary Bar | จำนวนรถ: รอคิว · กำลังโหลด · เสร็จสิ้น · เกินเวลา · ช่องว่าง |
| Truck Queue | ตารางรถทุกคันพร้อมสถานะ ประเภทคิว สินค้า timestamps (คลิกเปิด QueueDetailsModal) |
| Yard Panel | แผนผัง Yard ทุกช่องโหลดและ forklift |
| Notifications | แจ้งเตือนรถที่รอนานเกินกำหนด (rule ประเมินจาก backend) พร้อมเสียง + toast |

### Prediction Page (`/predictions`)
รายงานความแม่นยำของ ML model

| ส่วน | คำอธิบาย |
| ---- | --------- |
| Metric Cards | MAE · RMSE · Accuracy ±15 นาที · จำนวนรถที่เสร็จ |
| Metric Charts | แนวโน้ม MAE/RMSE และ R² ตามเวลา (PredictionMetricCharts) |
| Comparison Table | เวลาพยากรณ์ vs เวลาจริงรายคัน พร้อม error และสถานะ |
| Toolbar & Pagination | ค้นหา / กรองตามประเภท / เลือก 10·25·50 แถวต่อหน้า |

### Analytics Page (`/analytics`)
รายงานสถิติย้อนหลัง เลือกช่วงเวลาได้ (`today` / `7d` / `30d` / `3m` / `6m` / `1y` หรือกำหนดวันที่เอง)

| ส่วน | คำอธิบาย |
| ---- | --------- |
| KPI Cards | ตัวเลขสรุปภาพรวม |
| Throughput Chart | ปริมาณงานต่อช่วงเวลา (จัดกลุ่มราย ชม./วัน) |
| Queue Distribution Chart | สัดส่วนตามประเภทคิว |
| Product Volume Chart | ปริมาณสินค้าแยกประเภท |
| Avg Time by Queue Chart | เวลาเฉลี่ยตามประเภทรถ/คิว |
| Notification Summary Chart | สรุปจำนวนการแจ้งเตือนแยกประเภท |

---

## Components & Hooks

### Analytics (`features/analytics/`)

| Components | Hooks |
| --------- | ----- |
| `KpiCard` · `ChartCard` · `ChartToggle` · `AnalyticsDateRangePicker` | `useKpiData` |
| `ThroughputChart` · `QueueDistributionChart` | `useThroughputData` · `useQueueDistributionData` |
| `ProductVolumeChart` · `AvgTimeByQueueChart` | `useProductVolumeData` · `useAvgTimeByTruckTypeData` |
| `NotificationSummaryChart` | `useNotificationSummaryData` |

### Prediction (`features/prediction/`)

| Components | Hooks |
| --------- | ----- |
| `MetricCard` · `PredictionTable` · `PredictionMetricCharts` | `usePredictionData` |
| `PredictionToolbar` · `PredictionPagination` | |

### Shared & Feature Hooks

| Hook | ที่อยู่ | คำอธิบาย |
| ---- | ------- | --------- |
| `useDashboardData` | `features/dashboard/` | อ่าน dashboard snapshot (REST ครั้งแรก + realtime) |
| `useTruckQueues` | `features/queue/` | filter / sort / search สำหรับ truck queue |
| `useYardPanel` · `useSlotCard` | `features/yard/` | state ของ Yard panel / slot card |
| `usePredictionData` | `features/prediction/` | fetch + filter + pagination |
| `useBackendNotifications` | `features/notifications/` | อ่าน notifications ที่มากับ snapshot |
| `useLatestNotificationToast` | `features/notifications/` | แสดง toast ของแจ้งเตือนล่าสุด |
| `useNotificationMenuState` | `features/notifications/` | state ของเมนูแจ้งเตือน |
| `useNotificationSound` | `features/notifications/` | เล่นเสียงแจ้งเตือน |
| `useRealtimeSnapshot` | `shared/hooks/` | core: โหลด REST ครั้งแรก + subscribe WebSocket + อัปเดต snapshot |
| `createRealtimeContext` | `shared/hooks/` | factory สร้าง Provider/Context ของ realtime แต่ละ feature |
| `useLiveClock` · `useModal` | `shared/hooks/` | นาฬิกา / เปิด-ปิด modal |

---

## การเชื่อมต่อ API และ WebSocket

### REST API
ใช้ Axios ([services/apiClient.js](src/services/apiClient.js)) เรียก Backend ที่ `VITE_API_ORIGIN`:

```text
GET http://127.0.0.1:3004/api/dashboard/snapshot/?plant_code=COM20060001
GET http://127.0.0.1:3004/api/analytics/throughput/?preset=7d&group_by=day
```

### WebSocket
เชื่อมต่อที่ `VITE_WS_ORIGIN` ด้วย `react-use-websocket` — มี **3 streams** ตรงกับ backend:

| Stream | URL | รอบ push |
| ------ | --- | -------- |
| Dashboard | `/ws/dashboard/stream/` | 10 วินาที |
| Predictions | `/ws/predictions/stream/` | 30 วินาที (เฉพาะ preset = today) |
| Analytics | `/ws/analytics/stream/` | 60 วินาที (เฉพาะ preset = today) |

Server push message รูปแบบ `{ "event": "<feature>.snapshot", "payload": {...} }` อัตโนมัติ

- payload ของ dashboard = REST snapshot (`summary`, `truck_queues`, `yards`) **+ `notifications`** ที่มีเฉพาะ stream นี้
- payload ของ predictions/analytics = โครงเดียวกับ `/predictions/snapshot/` และ `/analytics/snapshot/`

(รายละเอียด event + ตัวอย่าง payload เต็ม ดู [../README.md](../README.md#websocket-real-time))

---

## การไหลของข้อมูล Real-time

ทุก feature ที่มี real-time ใช้ pattern เดียวกัน (reuse ผ่าน `createRealtimeContext` + `useRealtimeSnapshot`):

```text
Provider (เช่น DashboardRealtimeProvider)
  └─ useRealtimeSnapshot({ socketUrl, event, fetchInitial, enabled })
       ├─ 1) fetchInitial() : โหลด snapshot ครั้งแรกผ่าน REST
       ├─ 2) subscribe WebSocket (ถ้า enabled)
       └─ 3) เมื่อได้ event ตรงชื่อ → อัปเดต snapshot จาก payload
  └─ useContext → useDashboardData / useKpiData / ... → Components
```

**กฎสำคัญ:** Analytics และ Prediction จะเปิด WebSocket **เฉพาะเมื่อ `preset === 'today'`** เท่านั้น
([useRealtimeSnapshot.js](src/shared/hooks/useRealtimeSnapshot.js)) — ช่วงเวลาย้อนหลังอื่น ๆ ใช้ REST ปกติ
(เพราะข้อมูลย้อนหลังไม่เปลี่ยน จึงไม่ต้อง stream)

- **Auto-reconnect:** reconnect อัตโนมัติเมื่อ connection ขาด
- **Socket sharing:** ใช้ `share: true` กัน connection ซ้ำสำหรับ URL เดียวกัน
- **Connection status:** แสดงสถานะการเชื่อมต่อผ่าน `ConnectionStatusBanner`
