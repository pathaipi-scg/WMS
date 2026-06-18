"""
Django settings for the WMS backend.

Sensitive values are loaded from ``backend/.env`` so secrets and database
credentials can be managed without editing this file.
"""

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
