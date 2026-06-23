"""
Django settings for the WMS backend.

Sensitive values are loaded from ``backend/.env`` so secrets and database
credentials can be managed without editing this file.
"""

import json
import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / '.env'


def load_env_file(env_file: Path) -> None:
    if not env_file.exists():
        return

    for raw_line in env_file.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def get_env_list(name: str, default: list[str] | None = None) -> list[str]:
    value = os.getenv(name)
    if value is None:
        return default or []

    return [item.strip() for item in value.split(',') if item.strip()]


def get_env_json(name: str, default):
    value = os.getenv(name)
    if not value:
        return default

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        import logging
        logging.getLogger(__name__).warning('ไม่สามารถอ่านค่า %s เป็น JSON ได้ — ใช้ค่าเริ่มต้นแทน', name)
        return default


load_env_file(ENV_FILE)


SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'django-insecure-change-this-key-in-backend-env',
)
DEBUG = get_env_bool('DJANGO_DEBUG', True)
ALLOWED_HOSTS = get_env_list('DJANGO_ALLOWED_HOSTS', ['127.0.0.1', 'localhost'])
CORS_ALLOW_ALL_ORIGINS = get_env_bool('DJANGO_CORS_ALLOW_ALL_ORIGINS', True)


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'drf_spectacular',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'
ASGI_APPLICATION = 'backend.asgi.application'
WSGI_APPLICATION = 'backend.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE'),
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
        'OPTIONS': {
            'driver': os.getenv('DB_DRIVER', 'ODBC Driver 17 for SQL Server'),
            'TrustServerCertificate': (
                'yes' if get_env_bool('DB_TRUST_SERVER_CERTIFICATE', True) else 'no'
            ),
        },
    },
    'log': {
        'ENGINE': os.getenv('LOG_DB_ENGINE', 'mssql'),
        'NAME': os.getenv('LOG_DB_NAME'),
        'USER': os.getenv('LOG_DB_USER'),
        'PASSWORD': os.getenv('LOG_DB_PASSWORD'),
        'HOST': os.getenv('LOG_DB_HOST'),
        'PORT': os.getenv('LOG_DB_PORT', '1433'),
        'OPTIONS': {
            'driver': os.getenv('DB_DRIVER', 'ODBC Driver 17 for SQL Server'),
            'TrustServerCertificate': (
                'yes' if get_env_bool('LOG_DB_TRUST_SERVER_CERTIFICATE', True) else 'no'
            ),
        },
    },
}


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'th-th'
TIME_ZONE = 'Asia/Bangkok'
USE_I18N = True
USE_TZ = True


STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}


# ---------------------------------------------------------------------------
# Auth — login เฉพาะผู้ดูแล (อ่านค่าทั้งหมดจาก env, ไม่มีตาราง user)
# ---------------------------------------------------------------------------

# รายชื่อโรงงานที่เลือกได้ — ตั้งผ่าน env WMS_PLANTS (JSON) เพื่อเพิ่มโรงงานได้โดยไม่แก้โค้ด
# ตัวอย่าง: [{"code": "COM20060001", "name": "SB1"}, {"code": "COM20060002", "name": "SB2"}]
WMS_PLANTS = get_env_json('WMS_PLANTS', [
    {'code': 'COM20060001', 'name': 'SB1'},
])

# โรงงานที่ผู้ใช้ทั่วไป (ไม่ได้ login) เห็นได้ — ค่าว่าง = ใช้โรงงานแรกใน WMS_PLANTS
WMS_PUBLIC_PLANT_CODE = os.getenv('WMS_PUBLIC_PLANT_CODE') or (
    WMS_PLANTS[0]['code'] if WMS_PLANTS else None
)

# ไฟล์เก็บโรงงานที่ admin เพิ่มผ่าน UI (เสริมจาก WMS_PLANTS)
WMS_PLANTS_STORE = os.getenv('WMS_PLANTS_STORE', str(BASE_DIR / 'plants_store.json'))

# ผู้ใช้ — ตั้งผ่าน env WMS_USERS (JSON list ของ {username, password, role, plant_code})
#   role = "admin"   → เห็นได้ทุกโรงงาน (ไม่ต้องระบุ plant_code)
#   role = "factory" → เห็นได้เฉพาะ plant_code ที่ระบุ
WMS_USERS = get_env_json('WMS_USERS', [])

# ทางลัดสำหรับ admin ส่วนกลาง 1 คน (ตามที่ต้องการตอนนี้) — ค่าเริ่มต้น admin/admin สำหรับ dev
# โปรดตั้ง WMS_ADMIN_USERNAME / WMS_ADMIN_PASSWORD ใน .env ของ production
_admin_username = os.getenv('WMS_ADMIN_USERNAME', 'admin')
_admin_password = os.getenv('WMS_ADMIN_PASSWORD', 'admin')
if _admin_username and _admin_password and not any(
    u.get('username') == _admin_username for u in WMS_USERS
):
    WMS_USERS = [
        {'username': _admin_username, 'password': _admin_password, 'role': 'admin'},
        *WMS_USERS,
    ]

# อายุ token (ชั่วโมง) — เซ็นด้วย SECRET_KEY ของ Django
WMS_AUTH_TOKEN_TTL_HOURS = int(os.getenv('WMS_AUTH_TOKEN_TTL_HOURS', '12'))

SPECTACULAR_SETTINGS = {
    'TITLE': 'WMS Dashboard API',
    'DESCRIPTION': (
        'API สำหรับ WMS Dashboard ที่ให้ข้อมูลสถานะรถบรรทุก, คิว, ลานจ่าย และทำนายเวลารวมของรถในโรงงานแบบ real-time'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'TAGS': [
        {
            'name': 'Dashboard',
            'description': 'หน้าภาพรวม — สรุปสถานะรถบรรทุก, คิว และลานจ่ายแบบ real-time',
        },
        {
            'name': 'Predictions',
            'description': 'หน้ารายงานผลโมเดล — ทำนายเวลารวมของรถในโรงงานด้วย ML (XGBoost) และ metrics ความแม่นยำ',
        },
        {
            'name': 'Analytics',
            'description': 'หน้าวิเคราะห์ข้อมูล — KPI, ปริมาณรถ, สัดส่วนคิว, ปริมาณสินค้า และเวลาเฉลี่ยแยกตามช่วงเวลา',
        },
    ],
}
