"""ระบบ login แบบเบาสำหรับแดชบอร์ด WMS (อ้างอิงค่าจาก environment ล้วน — ไม่มีตาราง user)

โครงสร้างสิทธิ์:
- ``admin``   = ผู้ดูแลส่วนกลาง เห็นได้ทุกโรงงานใน ``WMS_PLANTS``
- ``factory`` = ผู้ดูแลประจำโรงงาน เห็นได้เฉพาะ ``plant_code`` ของตัวเอง

ชื่อผู้ใช้/รหัสผ่านและรายชื่อโรงงานถูกกำหนดผ่าน environment variables (ดู settings.py
และ .env.example) Token เซ็นด้วย ``django.core.signing`` โดยใช้ ``SECRET_KEY`` ของ Django
จึงไม่ต้องเพิ่ม dependency ใด ๆ
"""

import logging
from functools import wraps

from django.conf import settings
from django.core import signing
from django.http import JsonResponse

logger = logging.getLogger(__name__)

_TOKEN_SALT = "wms.auth.token"
ALL_PLANTS = "*"  # ค่า sentinel สำหรับ admin ที่เห็นได้ทุกโรงงาน


# ---------------------------------------------------------------------------
# Catalogue / users (อ่านจาก settings ที่โหลดมาจาก env)
# ---------------------------------------------------------------------------

def get_plants():
    """รายชื่อโรงงานที่เลือกได้ — รวมจาก env (WMS_PLANTS) + ที่ admin เพิ่มผ่าน UI"""
    from . import plants_store

    merged = list(getattr(settings, "WMS_PLANTS", []) or [])
    seen = {plant["code"] for plant in merged}
    for plant in plants_store.read_custom_plants():
        if plant["code"] not in seen:
            merged.append(plant)
            seen.add(plant["code"])
    return merged


def _plant_code_set():
    return {plant["code"] for plant in get_plants()}


def get_users():
    return list(getattr(settings, "WMS_USERS", []))


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def authenticate(username, password):
    """คืน principal dict เมื่อ login สำเร็จ มิฉะนั้นคืน None"""
    if not username or not password:
        return None

    for user in get_users():
        if user.get("username") == username and user.get("password") == password:
            return _build_principal(
                username=username,
                role=user.get("role", "factory"),
                plant_code=user.get("plant_code"),
            )

    return None


def _build_principal(username, role, plant_code=None):
    if role == "admin":
        plants = ALL_PLANTS
    else:
        plants = [plant_code] if plant_code else []

    return {"username": username, "role": role, "plants": plants}


# ---------------------------------------------------------------------------
# Authorization helpers
# ---------------------------------------------------------------------------

def can_access(principal, plant_code):
    """principal มีสิทธิ์ดูโรงงาน ``plant_code`` หรือไม่"""
    if not principal or not plant_code:
        return False

    if principal.get("plants") == ALL_PLANTS:
        return plant_code in _plant_code_set()

    return plant_code in set(principal.get("plants", []))


def visible_plants(principal):
    """รายชื่อโรงงานที่ principal เห็นได้ (สำหรับแสดงใน selector ฝั่ง frontend)

    แต่ละรายการมี ``removable`` บอกว่าลบผ่าน UI ได้ไหม (เฉพาะโรงงานที่เพิ่มเอง)
    """
    if not principal:
        return []

    from . import plants_store
    removable_codes = plants_store.custom_plant_codes()

    if principal.get("plants") == ALL_PLANTS:
        plants = get_plants()
    else:
        code_set = set(principal.get("plants", []))
        plants = [plant for plant in get_plants() if plant["code"] in code_set]

    return [{**plant, "removable": plant["code"] in removable_codes} for plant in plants]


def default_plant_code(principal):
    plants = visible_plants(principal)
    return plants[0]["code"] if plants else None


def public_plant_code():
    """โรงงานที่ผู้ใช้ทั่วไป (ไม่ได้ login) เห็นได้ — ค่าเริ่มต้นคือโรงงานแรกใน catalogue"""
    explicit = getattr(settings, "WMS_PUBLIC_PLANT_CODE", None)
    if explicit:
        return explicit
    plants = get_plants()
    return plants[0]["code"] if plants else None


# ---------------------------------------------------------------------------
# Token issue / verify
# ---------------------------------------------------------------------------

def _token_ttl_seconds():
    return int(getattr(settings, "WMS_AUTH_TOKEN_TTL_HOURS", 12)) * 3600


def issue_token(principal):
    return signing.dumps(principal, salt=_TOKEN_SALT)


def verify_token(token):
    """ตรวจสอบ token — คืน principal เมื่อถูกต้องและยังไม่หมดอายุ มิฉะนั้นคืน None"""
    if not token:
        return None

    try:
        return signing.loads(token, salt=_TOKEN_SALT, max_age=_token_ttl_seconds())
    except signing.BadSignature:
        return None


# ---------------------------------------------------------------------------
# Request integration
# ---------------------------------------------------------------------------

def _token_from_request(request):
    header = request.META.get("HTTP_AUTHORIZATION", "")
    if header.startswith("Bearer "):
        return header[len("Bearer "):].strip()
    return request.GET.get("token")


def principal_from_request(request):
    return verify_token(_token_from_request(request))


def _auth_error(detail, status):
    return JsonResponse(
        {"detail": detail},
        status=status,
        json_dumps_params={"ensure_ascii": False},
    )


def require_auth(view):
    """บังคับว่าต้อง login เท่านั้น (ใช้กับ endpoint ที่เป็นข้อมูลผู้ใช้ เช่น /auth/me/)"""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        principal = principal_from_request(request)
        if not principal:
            return _auth_error("กรุณาเข้าสู่ระบบ", status=401)

        request.principal = principal
        return view(request, *args, **kwargs)

    return wrapper


def enforce_plant_access(view):
    """อนุญาตผู้ใช้ทั่วไป (ไม่ต้อง login) ให้ดูได้เฉพาะ "โรงงานสาธารณะ"

    - ไม่ได้ login → ดูได้เฉพาะ ``public_plant_code()`` เท่านั้น (ขอโรงงานอื่น = 401)
    - login แล้ว    → ดูได้ตามสิทธิ์ของ principal (โรงงานนอกสิทธิ์ = 403)

    ใช้ครอบ data endpoints (ใน urls.py) — ``request.principal`` จะเป็น None เมื่อไม่ได้ login
    """

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        principal = principal_from_request(request)
        requested_plant = request.GET.get("plant_code") or public_plant_code()

        if principal:
            if requested_plant and not can_access(principal, requested_plant):
                return _auth_error("ไม่มีสิทธิ์เข้าถึงโรงงานนี้", status=403)
        elif requested_plant and requested_plant != public_plant_code():
            return _auth_error("ต้องเข้าสู่ระบบเพื่อดูโรงงานนี้", status=401)

        request.principal = principal
        return view(request, *args, **kwargs)

    return wrapper
