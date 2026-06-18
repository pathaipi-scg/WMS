# WMS Backend

> Django 5.2 · DRF · Django Channels 4 · Daphne ASGI
> REST API + WebSocket server สำหรับระบบบริหารจัดการคลังสินค้า SB1

ดู README หลักของทั้งระบบ (Quick Start, Tech Stack, Business Workflow, Deploy) ที่ [../README.md](../README.md)

---

## สารบัญ

- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้ง](#การติดตั้ง)
- [Environment Variables](#environment-variables)
- [การรัน](#การรัน)
- [Services Layer](#services-layer)
- [API Endpoints](#api-endpoints)
- [WebSocket](#websocket)
- [Background Tasks & Lifecycle](#background-tasks--lifecycle)
- [ML Model](#ml-model)
- [Database](#database)

---

## โครงสร้างโปรเจกต์

```text
backend/
├── manage.py                   ← ตัวสั่งงาน Django
├── requirements.txt            ← รายการ package ของ Python
├── .env.example                ← ตัวอย่างไฟล์ตั้งค่า
│
├── backend/                    ← ตั้งค่าหลักของ project
│   ├── settings.py             ← ตั้งค่าระบบ + ฐานข้อมูล 2 ชุด
│   ├── urls.py                 ← URL หลัก
│   ├── asgi.py                 ← จุดเริ่ม ASGI + WebSocket + background task
│   └── wsgi.py                 ← จุดเริ่มแบบ WSGI (สำรอง)
│
├── api/                        ← แอปหลัก
│   ├── views.py                ← ฟังก์ชัน API
│   ├── urls.py                 ← URL ของ API
│   ├── models.py               ← ว่าง (ใช้ raw SQL)
│   ├── websocket.py            ← ตัวจัดการ WebSocket
│   ├── constants.py            ← ค่าคงที่ของระบบ
│   ├── services/               ← logic ธุรกิจ (ดูหัวข้อ Services Layer)
│   │   └── realtime/           ← โครงสร้าง pub/sub ที่ใช้ร่วม
│   ├── utils/                  ← ตัวช่วยใช้ร่วม (ต่อ DB, วันที่, SQL)
│   └── ml/                     ← โค้ด Machine Learning
│
├── model/                      ← ไฟล์โมเดลที่เทรนแล้ว
│   ├── Model_V.1.joblib              ← โมเดล XGBoost (เวอร์ชัน 1)
│   ├── Model_V.2.joblib              ← โมเดล LightGBM (เวอร์ชัน 2 · default)
│   └── feature_metadata.json         ← ข้อมูลประกอบโมเดล
│
└── sql/                        ← สคริปต์ SQL เสริม
```

---

## การติดตั้ง

```bash
cd backend
python -m venv venv

# เปิดใช้งาน venv
venv\Scripts\Activate.ps1     # Windows PowerShell
# venv\Scripts\activate.bat   # Windows CMD
# source venv/bin/activate    # macOS / Linux

pip install -r requirements.txt
copy .env.example .env        # แล้วแก้ค่า (ดูด้านล่าง)
python manage.py migrate
```

> สร้างค่า `DJANGO_SECRET_KEY`:
> `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

---

## Environment Variables

คัดลอกจาก `.env.example` แล้วแก้ค่าให้ตรง environment จริง — มีฐานข้อมูล **2 ชุด**:
ชุดหลัก (`DB_*`) อ่านจาก `OBM_DWMS` · ชุด log (`LOG_DB_*`) เขียนลง `WMS`

| Variable | ตัวอย่าง | คำอธิบาย |
| -------- | -------- | --------- |
| `DJANGO_SECRET_KEY` | `django-insecure-...` | Django secret key |
| `DJANGO_DEBUG` | `True` / `False` | Debug mode |
| `DJANGO_ALLOWED_HOSTS` | `127.0.0.1,localhost` | hosts ที่อนุญาต (คั่นด้วย comma) |
| `DJANGO_CORS_ALLOW_ALL_ORIGINS` | `True` | อนุญาต CORS ทุก origin (dev เท่านั้น) |
| `DB_ENGINE` | `mssql` | Database backend |
| `DB_NAME` | `OBM_DWMS` | ชื่อ Database (อ่านข้อมูล) |
| `DB_USER` | `sa` | SQL Server username |
| `DB_PASSWORD` | `P@ssw0rd` | SQL Server password |
| `DB_HOST` | `localhost` | SQL Server hostname / IP |
| `DB_PORT` | `1433` | SQL Server port |
| `DB_DRIVER` | `ODBC Driver 17 for SQL Server` | ODBC driver name |
| `DB_TRUST_SERVER_CERTIFICATE` | `True` | เชื่อถือ self-signed certificate |
| `LOG_DB_NAME` | `WMS` | ชื่อ Database (เขียน log แจ้งเตือน/พยากรณ์) |
| `LOG_DB_USER` | `sa` | username ของ DB log |
| `LOG_DB_PASSWORD` | `P@ssw0rd` | password ของ DB log |
| `LOG_DB_HOST` | `localhost` | host ของ DB log |
| `LOG_DB_PORT` | `1433` | port ของ DB log |
| `LOG_DB_TRUST_SERVER_CERTIFICATE` | `True` | เชื่อถือ self-signed cert |

> ถ้า `OBM_DWMS` กับ `WMS` อยู่บนเครื่องเดียวกัน ให้ตั้ง `LOG_DB_*` เหมือนชุดหลัก เปลี่ยนแค่ `LOG_DB_NAME=WMS`

---

## การรัน

### Development (แนะนำ — รองรับ WebSocket)
```bash
python -m daphne -b 0.0.0.0 -p 3004 backend.asgi:application
```

### Development (REST อย่างเดียว — ไม่รองรับ WebSocket)
```bash
python manage.py runserver
```
> ใช้ทดสอบ REST API ได้ แต่ Dashboard real-time จะไม่อัปเดต และ background task จะไม่ทำงาน

### Production
```bash
python -m daphne -b 0.0.0.0 -p 3004 backend.asgi:application
```
> ตั้ง `DJANGO_DEBUG=False` และ `DJANGO_ALLOWED_HOSTS` ให้ถูกต้องก่อน deploy

---

## Services Layer

Business logic ทั้งหมดอยู่ใน `api/services/` — แต่ละไฟล์รับผิดชอบงานเฉพาะส่วน

### Dashboard / Queue / Yard

| ไฟล์ | หน้าที่ |
| ---- | ------- |
| `dashboard_snapshot.py` | รวมข้อมูล dashboard (คิว + Yard + summary + แจ้งเตือน + พยากรณ์) และนิยาม `DashboardBroadcaster` + background tasks |
| `dashboard_summary.py` | นับจำนวนรถตามสถานะ (รอ / โหลด / เสร็จ / เกินเวลา) |
| `truck_queues.py` | Raw SQL ดึงรถในคิวพร้อมรายละเอียด (สินค้า, พาเลท, เวลารอ, สถานะ) |
| `post_locations.py` | Raw SQL ดึงสถานะ Yard / Channel / Forklift |

### Notifications

| ไฟล์ | หน้าที่ |
| ---- | ------- |
| `notification_service.py` | นิยาม **5 rule** + ประเมินกับรถทุกคัน (`compute_notifications`) |
| `notification_logger.py` | ติดตามการแจ้งเตือนที่ active ในหน่วยความจำ + UPSERT ลง `LogNotification` |

### Predictions (ML)

| ไฟล์ | หน้าที่ |
| ---- | ------- |
| `prediction.py` | สร้าง feature + รัน batch inference จากรายการรถ + สภาพคิว |
| `prediction_report.py` | คำนวณ metrics (MAE, RMSE, R², accuracy ±15 นาที) |
| `prediction_logger.py` | UPSERT ผลพยากรณ์ลง `PredictionLog` (เรียกโดย background job ทุก 2 นาที) |
| `prediction_metrics.py` | aggregate MAE/RMSE/R² ราย ชม./วัน จาก `PredictionLog` |
| `predictions_snapshot.py` | cache ข้อมูล predictions วันนี้ + broadcaster (push 30 วิ) |

### Analytics

| ไฟล์ | หน้าที่ |
| ---- | ------- |
| `analytics_kpi_summary.py` | KPI: จำนวนรถ, เวลารอ/โหลด/รวมเฉลี่ย, อัตราเกินเวลา + เทียบช่วงก่อนหน้า |
| `analytics_throughput.py` | จำนวนรถต่อช่วงเวลา (ราย ชม./วัน) |
| `analytics_queue_distribution.py` | สัดส่วนประเภทคิว (%) |
| `analytics_product_volume.py` | ปริมาณสินค้าแยกประเภท |
| `analytics_avg_time_by_truck_type.py` | เวลารวมเฉลี่ยตามประเภทรถ |
| `analytics_notification_summary.py` | นับการแจ้งเตือนแยกประเภทจาก `LogNotification` |
| `analytics_snapshot.py` | cache ข้อมูล analytics วันนี้ + broadcaster (push 60 วิ) |

### Realtime (โครงสร้างพื้นฐานที่ reuse)

| ไฟล์ | หน้าที่ |
| ---- | ------- |
| `realtime/broadcaster.py` | จัดการ subscriber queue ต่อ plant + loop refresh snapshot แล้ว publish (in-process pub/sub) |
| `realtime/snapshot_store.py` | cache + refresh snapshot ตาม TTL |

### Snapshot · Broadcaster · Stream ต่างกันยังไง

ทั้ง 3 อย่างทำงานร่วมกันเป็นชุดเดียว แต่คนละหน้าที่:

| คำ | คือ | หน้าที่ |
| --- | --- | ------- |
| **Snapshot** | *ตัวข้อมูล* — ก้อน JSON ที่รวมทุกอย่างของหน้านั้น ณ เวลาหนึ่ง (เช่น dashboard = summary + คิว + Yard + แจ้งเตือน) | สิ่งที่ถูกส่งออกไป โดยมี `SnapshotStore` ทำหน้าที่ cache ไว้ตาม TTL ไม่ต้องสร้างใหม่ทุกครั้ง |
| **Broadcaster** | *ตัวกระจาย* (background loop) | วน refresh snapshot ใหม่ตามรอบ (10/30/60 วิ) แล้ว push ก้อนเดียวกันไปให้ทุก client ที่ต่ออยู่ (fan-out) |
| **Stream** | *ท่อ WebSocket รายคน* | connection ของ client แต่ละราย — ตอนต่อส่ง snapshot ล่าสุดให้ทันที จากนั้นคอยรับ snapshot ใหม่จาก broadcaster มาส่งต่อ |

**ความสัมพันธ์:** `Broadcaster` สร้าง/refresh → `Snapshot` (เก็บใน `SnapshotStore`) → ส่งผ่าน `Stream` ไปยัง browser

```text
SnapshotStore.refresh()        ← สร้างก้อนข้อมูล (cache)
      ↑ ทุก 10/30/60 วิ
Broadcaster._broadcast_forever()  ← วน refresh + publish ให้ทุก subscriber
      ↓ ก้อนเดียว แจกหลายคน
Stream (WebSocket รายคน)        ← ส่ง snapshot ให้ browser ตามรอบ
```

> **REST `/snapshot/` vs WebSocket stream:** ข้อมูลก้อนเดียวกัน (snapshot) แต่คนละวิธีรับ —
> REST = client **ดึงเอง** ครั้งเดียว (pull, ใช้ตอนโหลดหน้าแรกหรือดูข้อมูลย้อนหลัง) ·
> stream = server **ส่งให้เอง** ตามรอบผ่าน WebSocket (push, ใช้กับมุมมอง "วันนี้")

---

## API Endpoints

Base URL: `http://localhost:3004` · รวม **16 endpoints** (ทั้งหมดเป็น `GET`) — ดู [api/urls.py](api/urls.py)
schema เต็ม + ทดสอบยิงได้ที่ Swagger `http://localhost:3004/api/docs/`

### รูปแบบมาตรฐาน

- response เป็น JSON UTF-8 (`ensure_ascii=false`) — ดู `_json_response` ใน [api/views.py](api/views.py)
- สำเร็จ → `200` · ผิดพลาด → `500` + `{ "success": false, "message": "...", "error": "..." }`
- Query params ที่ใช้ซ้ำ: `plant_code` (default `COM20060001`), `preset`
  (`today|7d|30d|3m|6m|1y`, default `today`), `date_from`/`date_to` (`YYYY-MM-DD`),
  `group_by` (`hour|day`, default `day`)

> ⚠️ schema `@extend_schema` ในบาง endpoint analytics (throughput / queue-distribution /
> product-volume / avg-time / metrics-timeseries) **เก่ากว่า output จริง** — ยึดตามตัวอย่างใน
> [../README.md#api-endpoints](../README.md#api-endpoints) ซึ่งตรงกับ service จริง

### Dashboard

| Endpoint | Query Params | คำอธิบาย |
| -------- | ------------ | --------- |
| `/api/dashboard/snapshot/` | `plant_code` | ข้อมูล dashboard ทั้งหมด (cached 10 วินาที) |
| `/api/dashboard/summary/` | — | สรุปจำนวนรถตามสถานะ |
| `/api/dashboard/truck_queues/` | — | รายการรถในคิวทั้งหมด |
| `/api/dashboard/post-locations/` | `plant_code` | สถานะ Yard · Channel · Forklift |

### Predictions

| Endpoint | Query Params | คำอธิบาย |
| -------- | ------------ | --------- |
| `/api/predictions/report/` | — | รายงานความแม่นยำ ML คำนวณสด (รัน ML ทุกครั้ง) |
| `/api/predictions/log/` | `preset`, `date_from`, `date_to`, `model`, `version` | ประวัติผลพยากรณ์จากตาราง `PredictionLog` (ไม่รัน ML · กรองตามโมเดลได้) |
| `/api/predictions/metrics-timeseries/` | `preset`, `group_by`, `date_from`, `date_to`, `model`, `version` | แนวโน้ม MAE/RMSE/Accuracy ราย ชม./วัน + `summary` (กรองตามโมเดลได้) |
| `/api/predictions/models/` | `preset`, `date_from`, `date_to` | รายชื่อโมเดล (Model + Version) ที่เคยทำนาย — driver ของ dropdown เปรียบเทียบ |
| `/api/predictions/snapshot/` | `plant_code` | ข้อมูล predictions วันนี้ (cached 30 วินาที) |

> field/response เต็มดูที่ Swagger `http://localhost:3004/api/docs/` ·
> `report`/`log` คืน `{ total, completed, metrics{mae,rmse,accuracy15,n}, trucks[] }` ·
> field `status` เป็นข้อความไทย (`เสร็จแล้ว` / `กำลังดำเนินการ`) ·
> แต่ละ truck ใน `log` มี `model` + `version` (โมเดลที่ทำนายแถวนั้น)

### Analytics

ทุก endpoint รับ `preset` (`today`/`7d`/`30d`/`3m`/`6m`/`1y`) หรือ `date_from` + `date_to`

| Endpoint | Query Params | คำอธิบาย |
| -------- | ------------ | --------- |
| `/api/analytics/snapshot/` | `plant_code` | ข้อมูล analytics วันนี้ทั้งหมด (cached 60 วินาที) |
| `/api/analytics/kpi-summary/` | `preset`, `date_from`, `date_to` | ตัวเลขสรุปภาพรวม |
| `/api/analytics/throughput/` | + `group_by` | ปริมาณงานต่อช่วงเวลา |
| `/api/analytics/queue-distribution/` | `preset`, `date_from`, `date_to` | สัดส่วนตามประเภทคิว |
| `/api/analytics/product-volume/` | `preset`, `date_from`, `date_to` | ปริมาณสินค้าแยกประเภท |
| `/api/analytics/avg-time-by-truck-type/` | + `group_by` | เวลาเฉลี่ยตามประเภทรถ |
| `/api/analytics/notification-summary/` | `preset`, `date_from`, `date_to` | สรุปจำนวนการแจ้งเตือนแยกประเภท |

> response analytics ทุกตัวมีรูปแบบ `{ "preset", ..., "data": [ ... ] }` (kpi-summary ใช้ `kpi{}` แทน
> `data`) — field/ตัวอย่างเต็มดูที่ Swagger `http://localhost:3004/api/docs/`

### API Documentation

| URL | คำอธิบาย |
| --- | --------- |
| `http://localhost:3004/api/docs/` | Swagger UI — ทดสอบ API ได้โดยตรง |
| `http://localhost:3004/api/redoc/` | ReDoc — อ่าน API reference |
| `http://localhost:3004/api/schema/` | OpenAPI 3.0 JSON schema |

---

## WebSocket

มี **3 streams** แยกตามหน้า — แต่ละ stream push snapshot ตามรอบของตัวเอง ([websocket.py](api/websocket.py), [asgi.py](backend/asgi.py))

| Stream | URL | รอบ push | Event name |
| ------ | --- | -------- | ---------- |
| Dashboard | `/ws/dashboard/stream/` | 10 วินาที | `dashboard.snapshot` |
| Predictions | `/ws/predictions/stream/` | 30 วินาที | `predictions.snapshot` |
| Analytics | `/ws/analytics/stream/` | 60 วินาที | `analytics.snapshot` |

### Connection
```text
ws://localhost:3004/ws/dashboard/stream/?plant_code=COM20060001
```

| Parameter | ค่าเริ่มต้น | คำอธิบาย |
| --------- | ----------- | --------- |
| `plant_code` | `COM20060001` | รหัส Plant |

### Events

**Server → Client** (push อัตโนมัติตามรอบ):
```jsonc
{
  "event": "dashboard.snapshot",
  "payload": {
    "success": true,
    "plant_code": "COM20060001",
    "plant_name": "SB1",
    "captured_at": "2026-06-11T09:15:00+07:00",
    "summary": { "total_trucks": 12, "waiting_queue": 4, "loading": 6, "completed": 2, "overtime_trucks": 1 },
    "truck_queues": [],
    "yards": [],
    "notifications": []   // inject เฉพาะ dashboard stream — REST snapshot ไม่มี field นี้
  }
}
```

**Client → Server (heartbeat):** ส่งข้อความ text ตรง ๆ ว่า `ping`

**Server → Client (ตอบ heartbeat):**
```json
{ "event": "pong" }
```

**Server → Client (error):** เช่น `dashboard.error`
```json
{ "event": "dashboard.error", "message": "Unable to stream updates." }
```

> Broadcast ทำงานแบบ in-process pub/sub ([realtime/broadcaster.py](api/services/realtime/broadcaster.py)) — `settings.py` ยังไม่ได้ตั้ง `CHANNEL_LAYERS` (Redis) แม้ `channels_redis`/`redis` จะอยู่ใน requirements

---

## Background Tasks & Lifecycle

Background task ทำงานด้วย asyncio (ไม่ต้องมี Celery / Redis) — เริ่ม/หยุดผ่าน **ASGI lifespan hook** ใน [asgi.py](backend/asgi.py)

| Task | รอบ | หน้าที่ | เริ่มเมื่อ |
| ---- | --- | ------- | --------- |
| Dashboard Broadcaster | 10 วิ | สร้าง snapshot · ประเมิน 5 rule แจ้งเตือน · push ให้ subscriber | `lifespan.startup` (รันตลอด) |
| Prediction Logger | **120 วิ** | รัน ML กับรถที่เสร็จวันนี้ → UPSERT ลง `PredictionLog` | คู่กับ broadcaster |
| Predictions Snapshot | 30 วิ | refresh cache predictions วันนี้ | เมื่อมี subscriber |
| Analytics Snapshot | 60 วิ | refresh cache analytics วันนี้ | เมื่อมี subscriber |

```python
# asgi.py — lifespan hook (ย่อ)
if message["type"] == "lifespan.startup":
    await dashboard_broadcaster.start(PLANT_CODE)   # เริ่ม broadcaster + prediction logger
elif message["type"] == "lifespan.shutdown":
    await dashboard_broadcaster.stop(PLANT_CODE)
```

> Dashboard Broadcaster ทำงานตลอดแม้ไม่มีใครเปิดหน้า — เพื่อให้ notification logging และ prediction logging เกิดต่อเนื่อง

---

## ML Model

Gradient Boosting Regression (XGBoost หรือ LightGBM) พยากรณ์ **เวลารวมในการโหลดสินค้า** (`total_time_min`, นาที) — ระบบตรวจชนิดโมเดลจากไฟล์ `.joblib` ที่โหลดอัตโนมัติ (ไม่ยึด `model_type` ใน metadata ที่อาจ stale)

- **Model files:** `model/Model_V.2.joblib` (LightGBM · **default**) · `model/Model_V.1.joblib` (XGBoost) — เลือกไฟล์ที่โหลดใน `predictor_singleton.py`
- **Metadata:** `model/feature_metadata.json` (feature names, medians, metrics)
- **Pipeline:** `engineer.py` (สร้าง feature) → `predictor_singleton.py` (โหลดโมเดลครั้งเดียว) → `predict.py` (inference)
- **Output:** เวลารวม (นาที) — log ลง `[WMS].[dbo].[PredictionLog]` พร้อมคอลัมน์ `Model` + `Version` (เวอร์ชัน parse จากชื่อไฟล์)

### Feature Groups (27 features)

| กลุ่ม | Features |
| ----- | -------- |
| ข้อมูลรถ/คิว | `CarType`, `PickListType`, `PrepareForward`, `PostLocationName`, `TruckSeqNo` |
| ข้อมูลสินค้า | `total_tile_amount`, `total_fitting_amount`, `total_accessories_amount`, `total_sap_amount`, `product_group_count` |
| สภาพคิว | `queue_waiting`, `queue_loading`, `queue_closing`, `total_queue`, `available_bays` |
| เวลา | `hour`, `day_of_week`, `week_of_month`, `month` |
| Derived | `sap_per_group`, `queue_x_bays`, `queue_x_sap`, `car_type_x_sap`, `inter_arrival_min` |
| Rolling Average | `rolling_avg_time_last5`, `avg_time_by_cartype`, `rolling_avg_cartype_last10` |

### Metrics

| Split | MAE | RMSE | R² |
| ----- | --- | ---- | -- |
| Train | 9.42 | 11.96 | 0.69 |
| Test | 11.43 | 14.49 | 0.55 |

### Retrain

ต้องติดตั้ง `scikit-learn` เพิ่ม และมีชุดข้อมูล training พร้อม:
```bash
python -m api.ml.train_pipeline
```
โมเดลใหม่จะถูกบันทึกที่ `model/best_model_totaltime.joblib` พร้อมอัปเดต `feature_metadata.json`

> **เผยแพร่เวอร์ชันใหม่:** runtime โหลดไฟล์ตามชื่อใน `predictor_singleton.py` (ปัจจุบัน `Model_V.2.joblib`) — หลัง retrain ให้เปลี่ยนชื่อไฟล์เป็น `Model_V.<N>.joblib` (เลขในชื่อไฟล์ถูก parse เก็บลงคอลัมน์ `Version`) แล้วอัปเดต path

---

## Database

| | |
| --- | --- |
| **Read** | `OBM_DWMS` — ข้อมูลคิวรถ / Yard / สินค้า (Raw SQL ทั้งหมด ไม่ใช้ ORM) |
| **Write log** | `WMS` — `LogNotification` (ประวัติแจ้งเตือน) · `PredictionLog` (ผลพยากรณ์) |
| **Driver** | ODBC Driver 17 for SQL Server |
| **Plant Code** | `COM20060001` (SB1) |

### Views / Tables ที่ใช้บ่อย

| ชื่อ | DB | ใช้ทำอะไร |
| ---- | -- | --------- |
| `vwTimeStampDashbaord` | OBM_DWMS | View หลัก — timestamp ทุกขั้นตอนของรถ (ที่มาของคิว + สถานะ) |
| `ForkPostPallets` | OBM_DWMS | บันทึกการโหลดพาเลท |
| `LogNotification` | WMS | ประวัติการแจ้งเตือน (DetailCode 1–5, status, duration) |
| `PredictionLog` | WMS | ผลพยากรณ์ ML เทียบกับเวลาจริง |

### Query Helpers

- [api/utils/db.py](api/utils/db.py) — `fetch_scalar(sql, params, default)` · `fetch_all_dicts(sql, params)` → ต่อ `OBM_DWMS`
- [api/utils/log_db.py](api/utils/log_db.py) — connection แยกไปยัง `WMS` สำหรับเขียน log

> ต้องติดตั้ง [ODBC Driver 17 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) ก่อนใช้งาน
