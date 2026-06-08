# WMS Backend

> Django 5.2 · Django REST Framework · Django Channels 4 · Daphne ASGI  
> REST API + WebSocket server สำหรับระบบบริหารจัดการคลังสินค้า SB1

ดู README หลักของทั้งระบบได้ที่ [../README.md](../README.md)

---

## สารบัญ

- [Tech Stack](#tech-stack)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การติดตั้ง](#การติดตั้ง)
- [Environment Variables](#environment-variables)
- [การรัน](#การรัน)
- [API Endpoints](#api-endpoints)
- [WebSocket](#websocket)
- [ML Model](#ml-model)
- [Database](#database)

---

## Tech Stack

| เทคโนโลยี | เวอร์ชัน | วัตถุประสงค์ |
| ---------- | -------- | ------------ |
| Python | 3.x | ภาษาหลัก |
| Django | 5.2 | Web framework |
| Django REST Framework | 3.17 | REST API |
| Django Channels | 4.2 | WebSocket (ASGI) |
| Daphne | 4.1 | ASGI server |
| drf-spectacular | ≥ 0.27 | OpenAPI docs (Swagger / ReDoc) |
| mssql-django | 1.7 | SQL Server database backend |
| pyodbc | 5.3 | ODBC driver connector |
| XGBoost | latest | ML model (ทำนายเวลาโหลด) |
| Pandas / NumPy | latest | Data processing |
| joblib | latest | Model serialization |
| python-dotenv | 1.2 | Environment variables |

---

## โครงสร้างโปรเจกต์

```text
backend/
├── manage.py
├── requirements.txt            ← Python dependencies
├── .env                        ← Environment variables (ไม่ commit)
│
├── backend/                    ← Django project config
│   ├── settings.py             ← การตั้งค่าทั้งหมด
│   ├── urls.py                 ← Root URL routing
│   ├── asgi.py                 ← ASGI app + WebSocket routing
│   └── wsgi.py
│
├── api/                        ← Main Django app
│   ├── views.py                ← API view functions
│   ├── urls.py                 ← API URL routes
│   ├── models.py               ← (ว่าง — ใช้ raw SQL แทน ORM)
│   ├── websocket.py            ← WebSocket consumer
│   ├── constants.py            ← ค่าคงที่ทั่วทั้งแอป
│   │
│   ├── services/               ← Business logic
│   │   ├── dashboard_snapshot.py       ← สร้าง dashboard snapshot
│   │   ├── dashboard_snapshot_store.py ← Cache snapshot ใน memory
│   │   ├── dashboard_broadcaster.py    ← Broadcast ผ่าน WebSocket
│   │   ├── dashboard_summary.py        ← สรุปสถิติรถ
│   │   ├── truck_queues.py             ← ดึงข้อมูลคิวรถ
│   │   ├── post_locations.py           ← ดึงข้อมูล Yard / Channel
│   │   ├── prediction.py               ← รัน ML inference
│   │   └── prediction_report.py        ← สร้างรายงาน prediction
│   │
│   ├── utils/                  ← Utility helpers
│   │   ├── db.py               ← Database connection & query helpers
│   │   ├── date_ranges.py      ← Date/time utilities
│   │   └── sql_fragments.py    ← Reusable SQL fragments
│   │
│   └── ml/                     ← ML pipeline
│       ├── predict.py              ← Inference pipeline
│       ├── engineer.py             ← Feature engineering
│       ├── predictor_singleton.py  ← Singleton model loader
│       └── train_pipeline.py       ← Model training script
│
└── model/
    ├── best_model_totaltime.joblib   ← Trained XGBoost model
    └── feature_metadata.json         ← Feature names & metadata สำหรับ inference
```

---

## การติดตั้ง

### 1. สร้าง Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. เปิดใช้งาน Virtual Environment

**Windows (PowerShell):**

```powershell
venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**

```cmd
venv\Scripts\activate.bat
```

**macOS / Linux:**

```bash
source venv/bin/activate
```

### 3. ติดตั้ง Dependencies

```bash
pip install -r requirements.txt
```

### 4. สร้างไฟล์ `.env`

```env
DB_ENGINE=mssql
DB_NAME=OBM_DWMS
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_sql_server_host
DB_PORT=1433
DB_TRUST_SERVER_CERTIFICATE=yes
SECRET_KEY=your-secret-key-here
DEBUG=True
```

> สร้าง `SECRET_KEY` ด้วยคำสั่ง:
>
> `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

### 5. รัน Migration

```bash
python manage.py migrate
```

---

## Environment Variables

| Variable | ตัวอย่าง | คำอธิบาย |
| -------- | -------- | --------- |
| `DB_ENGINE` | `mssql` | Database backend |
| `DB_NAME` | `OBM_DWMS` | ชื่อ Database |
| `DB_USER` | `sa` | SQL Server username |
| `DB_PASSWORD` | `P@ssw0rd` | SQL Server password |
| `DB_HOST` | `localhost` | SQL Server hostname / IP |
| `DB_PORT` | `1433` | SQL Server port |
| `DB_TRUST_SERVER_CERTIFICATE` | `yes` | เชื่อถือ self-signed certificate |
| `SECRET_KEY` | `django-insecure-...` | Django secret key |
| `DEBUG` | `True` / `False` | Debug mode |

---

## การรัน

### Development (แนะนำ — รองรับ WebSocket)

```bash
daphne -b 127.0.0.1 -p 8000 backend.asgi:application
```

เมื่อรันสำเร็จ:

```text
2025-xx-xx xx:xx:xx INFO     Starting server at tcp:interface=127.0.0.1:port=8000
```

### Development (ไม่รองรับ WebSocket)

```bash
python manage.py runserver
```

> ใช้ได้สำหรับทดสอบ REST API เท่านั้น WebSocket จะไม่ทำงาน

### Production

```bash
daphne -b 0.0.0.0 -p 8000 backend.asgi:application
```

> ตรวจสอบให้แน่ใจว่า `DEBUG=False` และ `ALLOWED_HOSTS` ถูกต้องก่อน deploy

---

## API Endpoints

Base URL: `http://localhost:8000`

### Dashboard

| Method | Endpoint | Query Params | คำอธิบาย |
| ------ | -------- | ------------ | --------- |
| `GET` | `/api/dashboard/summary/` | — | สรุปจำนวนรถตามสถานะ |
| `GET` | `/api/dashboard/snapshot/` | `plant_code` | ข้อมูล dashboard ทั้งหมด (cached 10 วินาที) |
| `GET` | `/api/dashboard/truck_queues/` | — | รายการรถในคิวทั้งหมด |
| `GET` | `/api/dashboard/post-locations/` | `plant_code` | สถานะ Yard · Channel · Forklift |

### Predictions

| Method | Endpoint | คำอธิบาย |
| ------ | -------- | --------- |
| `GET` | `/api/predictions/report/` | รายงานความแม่นยำ ML model (MAE, RMSE, accuracy ±15 นาที) |

### API Documentation

| URL | คำอธิบาย |
| --- | --------- |
| `http://localhost:8000/api/docs/` | Swagger UI — ทดสอบ API ได้โดยตรง |
| `http://localhost:8000/api/redoc/` | ReDoc — อ่าน API reference |
| `http://localhost:8000/api/schema/` | OpenAPI 3.0 JSON schema |

---

## WebSocket

### Connection

```text
ws://localhost:8000/ws/dashboard/stream/?plant_code=COM20060001
```

| Parameter | ค่าเริ่มต้น | คำอธิบาย |
| --------- | ----------- | --------- |
| `plant_code` | `COM20060001` | รหัส Plant |

### Events

**Server → Client (push อัตโนมัติทุก 10 วินาที):**

```json
{
  "type": "dashboard.snapshot",
  "data": {
    "summary": { ... },
    "truck_queues": [ ... ],
    "post_locations": [ ... ]
  }
}
```

**Client → Server (heartbeat):**

```json
{ "type": "ping" }
```

**Server → Client (heartbeat response):**

```json
{ "type": "pong" }
```

---

## ML Model

### ภาพรวม

XGBoost Regression สำหรับพยากรณ์เวลารวมในการโหลดสินค้า (นาที)

- **Model file:** `model/best_model_totaltime.joblib`
- **Algorithm:** XGBoost Regression
- **Input:** feature vector จากข้อมูลรถ สินค้า คิว และเวลา
- **Output:** เวลาโหลดสินค้ารวม (นาที)

### Feature Groups

| กลุ่ม | Features |
| ----- | -------- |
| ข้อมูลรถ | ประเภทรถ (4/6/10 ล้อ, หัวลาก), ประเภทคิว, PrepareForward |
| ข้อมูลสินค้า | กระเบื้อง CPAC/PRESTIGE/NEUSTILE, อุปกรณ์, ยอดรวม |
| สภาพคิว | รถรอ, รถโหลด, รถปิด, ช่องว่าง |
| เวลา | ชั่วโมง, วันในสัปดาห์, สัปดาห์ของเดือน, เดือน |
| Rolling Average | เฉลี่ย 5 คันล่าสุด, เฉลี่ยตามประเภทรถ 10 คันล่าสุด |

### Retrain Model

```bash
python -m api.ml.train_pipeline
```

โมเดลใหม่จะถูกบันทึกที่ `model/best_model_totaltime.joblib` โดยอัตโนมัติ

---

## Database

- **Engine:** Microsoft SQL Server
- **Database:** `OBM_DWMS`
- **Driver:** ODBC Driver 17 for SQL Server
- **Query style:** Raw SQL ทั้งหมด (ไม่ใช้ Django ORM)
- **Plant Code:** `COM20060001` (SB1)

> ต้องติดตั้ง [ODBC Driver 17 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) ก่อนใช้งาน
