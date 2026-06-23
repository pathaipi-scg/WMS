"""ที่เก็บโรงงานที่ admin เพิ่มเองผ่าน UI

เก็บเป็นไฟล์ JSON (เสริมจากรายการใน env ``WMS_PLANTS``) เพื่อให้การเพิ่มโรงงานอยู่ถาวร
แม้รีสตาร์ทเซิร์ฟเวอร์ — สอดคล้องกับแนวทางของโปรเจกต์ที่ไม่ใช้ ORM model สำหรับ config
"""

import json
import logging
import threading
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)
_lock = threading.Lock()


class PlantExistsError(Exception):
    """รหัสโรงงานซ้ำกับที่มีอยู่แล้ว"""


class PlantNotFoundError(Exception):
    """ไม่พบโรงงานที่จะลบใน custom store (ลบได้เฉพาะโรงงานที่เพิ่มผ่าน UI)"""


def _store_path() -> Path:
    return Path(getattr(settings, "WMS_PLANTS_STORE", Path(settings.BASE_DIR) / "plants_store.json"))


def read_custom_plants():
    """รายชื่อโรงงานที่ถูกเพิ่มผ่าน UI — [{'code': ..., 'name': ...}]"""
    path = _store_path()
    if not path.exists():
        return []

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        logger.exception("อ่านไฟล์รายชื่อโรงงานไม่สำเร็จ: %s", path)
        return []

    if not isinstance(data, list):
        return []
    return [
        {"code": item["code"], "name": item["name"]}
        for item in data
        if isinstance(item, dict) and item.get("code") and item.get("name")
    ]


def add_plant(code, name):
    """เพิ่มโรงงานใหม่ลงไฟล์ — คืนรายการ custom ทั้งหมดหลังเพิ่ม

    raise ``ValueError`` เมื่อข้อมูลไม่ครบ และ ``PlantExistsError`` เมื่อรหัสซ้ำ
    """
    code = (code or "").strip()
    name = (name or "").strip()
    if not code or not name:
        raise ValueError("ต้องระบุทั้งรหัสและชื่อโรงงาน")

    with _lock:
        custom = read_custom_plants()
        env_codes = {p["code"] for p in (getattr(settings, "WMS_PLANTS", []) or [])}
        existing_codes = env_codes | {p["code"] for p in custom}
        if code in existing_codes:
            raise PlantExistsError(code)

        custom.append({"code": code, "name": name})
        path = _store_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(custom, ensure_ascii=False, indent=2), encoding="utf-8")

    return custom


def custom_plant_codes():
    """เซ็ตของรหัสโรงงานที่เพิ่มผ่าน UI (ใช้ทำเครื่องหมายว่าลบได้)"""
    return {plant["code"] for plant in read_custom_plants()}


def remove_plant(code):
    """ลบโรงงานออกจากไฟล์ — ลบได้เฉพาะที่เพิ่มผ่าน UI (โรงงานจาก env ห้ามลบ)

    raise ``ValueError`` เมื่อพยายามลบโรงงานจาก env และ ``PlantNotFoundError`` เมื่อไม่พบ
    """
    code = (code or "").strip()
    if not code:
        raise ValueError("ต้องระบุรหัสโรงงาน")

    env_codes = {p["code"] for p in (getattr(settings, "WMS_PLANTS", []) or [])}
    if code in env_codes:
        raise ValueError("ลบโรงงานที่ตั้งค่าผ่าน env ไม่ได้")

    with _lock:
        custom = read_custom_plants()
        remaining = [plant for plant in custom if plant["code"] != code]
        if len(remaining) == len(custom):
            raise PlantNotFoundError(code)

        path = _store_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(remaining, ensure_ascii=False, indent=2), encoding="utf-8")

    return remaining
