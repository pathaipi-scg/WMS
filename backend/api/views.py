import logging

from django.http import JsonResponse
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view

from .auth import authenticate, issue_token, visible_plants, default_plant_code, require_auth
from .plants_store import add_plant, remove_plant, PlantExistsError, PlantNotFoundError
from .constants import PLANT_CODE
from .services.dashboard_snapshot import dashboard_snapshot_store
from .services.dashboard_summary import get_dashboard_summary_data
from .services.post_locations import get_post_locations_response_data
from .services.truck_queues import get_truck_queues_data
from .services.prediction_report import get_prediction_report_data, get_prediction_log_data, get_prediction_models
from .services.prediction_metrics import get_prediction_metrics_timeseries
from .services.predictions_snapshot import predictions_snapshot_store
from .services.analytics_snapshot import analytics_snapshot_store
from .services.analytics_kpi_summary import get_kpi_summary_data
from .services.analytics_throughput import get_throughput_data
from .services.analytics_throughput_by_truck_type import get_throughput_by_truck_type_data
from .services.analytics_hourly_breakdown import get_hourly_breakdown_data
from .services.analytics_time_distribution import get_time_distribution_data
from .services.analytics_phase_distribution import get_phase_distribution_data
from .services.analytics_queue_distribution import get_queue_distribution_data
from .services.analytics_product_volume import get_product_volume_data
from .services.analytics_lane_phase_breakdown import get_lane_phase_breakdown_data
from .services.analytics_truck_history import get_truck_history_data
from .services.analytics_overtime import get_overtime_data
from .services.analytics_avg_time_by_truck_type import get_avg_time_by_truck_type_data
from .services.analytics_notification_summary import get_notification_summary_data

logger = logging.getLogger(__name__)

_PLANT_CODE_PARAM = OpenApiParameter(
    name="plant_code",
    type=str,
    location=OpenApiParameter.QUERY,
    description="รหัสโรงงาน",
    required=False,
    default="COM20060001",
)

_PRESET_PARAM = OpenApiParameter(
    name="preset",
    type=str,
    location=OpenApiParameter.QUERY,
    description="ช่วงเวลา: `today` | `7d` | `30d` | `3m` | `6m` | `1y`",
    required=False,
    default="today",
)

_DATE_FROM_PARAM = OpenApiParameter(
    name="date_from",
    type=str,
    location=OpenApiParameter.QUERY,
    description="วันเริ่มต้น (YYYY-MM-DD) — ใช้เมื่อ preset=custom",
    required=False,
)

_DATE_TO_PARAM = OpenApiParameter(
    name="date_to",
    type=str,
    location=OpenApiParameter.QUERY,
    description="วันสิ้นสุด (YYYY-MM-DD) — ใช้เมื่อ preset=custom",
    required=False,
)

_GROUP_BY_PARAM = OpenApiParameter(
    name="group_by",
    type=str,
    location=OpenApiParameter.QUERY,
    description="จัดกลุ่มตาม: `hour` | `day`",
    required=False,
    default="day",
)

_MODEL_PARAM = OpenApiParameter(
    name="model",
    type=str,
    location=OpenApiParameter.QUERY,
    description="กรองเฉพาะโมเดลที่เลือก เช่น `XGBoost` | `LightGBM` (เว้นว่าง = ทุกโมเดล)",
    required=False,
)

_VERSION_PARAM = OpenApiParameter(
    name="version",
    type=float,
    location=OpenApiParameter.QUERY,
    description="กรองเฉพาะเวอร์ชันที่เลือก เช่น `1.0` | `2.0` (ใช้คู่กับ `model`)",
    required=False,
)


def _json_response(payload, *, safe=True, status=200):
    return JsonResponse(
        payload,
        safe=safe,
        status=status,
        json_dumps_params={"ensure_ascii": False, "default": str},
    )


# ---------------------------------------------------------------------------
# Dashboard — หน้าภาพรวม
# ---------------------------------------------------------------------------

@extend_schema(
    tags=["Dashboard"],
    summary="สรุปจำนวนรถบรรทุกแยกตามสถานะ",
    description="คืนค่าจำนวนรถบรรทุกทั้งหมดในวันนี้ แยกตามสถานะ: รอคิว, กำลังโหลด, เสร็จแล้ว, และล่าช้า",
    responses={
        200: inline_serializer("DashboardSummaryResponse", fields={
            "total_trucks":    serializers.IntegerField(help_text="จำนวนรถทั้งหมดในวันนี้"),
            "waiting_queue":   serializers.IntegerField(help_text="รอคิว"),
            "loading":         serializers.IntegerField(help_text="กำลังโหลดสินค้า"),
            "completed":       serializers.IntegerField(help_text="เสร็จแล้ว"),
            "overtime_trucks": serializers.IntegerField(help_text="ล่าช้าเกิน 2 ชั่วโมง"),
            "from":            serializers.CharField(help_text="ช่วงเวลาเริ่มต้น (YYYY-MM-DD HH:MM:SS)"),
            "to":              serializers.CharField(help_text="ช่วงเวลาสิ้นสุด (YYYY-MM-DD HH:MM:SS)"),
        }),
    },
)
@api_view(['GET'])
def dashboard_summary(request):
    return _json_response(get_dashboard_summary_data())


@extend_schema(
    tags=["Dashboard"],
    summary="ข้อมูล Dashboard ทั้งหมด (snapshot)",
    description=(
        "คืนค่าข้อมูล Dashboard แบบครบถ้วน ประกอบด้วย summary, คิวรถ และสถานะลานจ่ายทั้งหมด\n\n"
        "ข้อมูลนี้ถูก cache ไว้และอัปเดตทุก 10 วินาทีโดย broadcaster\n\n"
        "สำหรับข้อมูล real-time ให้ใช้ WebSocket: `ws://<host>/ws/dashboard/stream/`"
    ),
    parameters=[_PLANT_CODE_PARAM],
    responses={
        200: inline_serializer("DashboardSnapshotResponse", fields={
            "success":     serializers.BooleanField(),
            "plant_code":  serializers.CharField(help_text="รหัสโรงงาน"),
            "plant_name":  serializers.CharField(help_text="ชื่อโรงงาน"),
            "captured_at": serializers.CharField(help_text="เวลาที่ดึงข้อมูล (ISO 8601)"),
            "summary": inline_serializer("SnapshotSummary", fields={
                "total_trucks":    serializers.IntegerField(),
                "waiting_queue":   serializers.IntegerField(),
                "loading":         serializers.IntegerField(),
                "completed":       serializers.IntegerField(),
                "overtime_trucks": serializers.IntegerField(),
            }),
            "truck_queues": serializers.ListField(help_text="รายการรถในคิว (ดูรูปแบบจาก /truck_queues/)"),
            "yards":        serializers.ListField(help_text="รายการลานจ่าย (ดูรูปแบบจาก /post-locations/)"),
        }),
    },
)
@api_view(['GET'])
def dashboard_snapshot(request):
    plant_code = request.GET.get("plant_code", PLANT_CODE)
    return _json_response(dashboard_snapshot_store.get_cached(plant_code=plant_code))


@extend_schema(
    tags=["Dashboard"],
    summary="รายการรถในคิวทั้งหมดพร้อมรายละเอียด",
    description="คืนค่ารายการรถบรรทุกที่อยู่ในคิวของวันนี้ พร้อมข้อมูลสินค้า สถานะการจัด และเวลาต่างๆ",
    responses={
        200: inline_serializer("TruckQueueItem", fields={
            "sequence":             serializers.IntegerField(help_text="ลำดับรถ"),
            "licensePlate":         serializers.CharField(help_text="ทะเบียนรถ"),
            "queueType":            serializers.CharField(help_text="ประเภทคิว: SmartQ, Walk in, ล่วงหน้า"),
            "status":               serializers.CharField(help_text="สถานะ: รอคิว, กำลังโหลด"),
            "customer_name":        serializers.CharField(help_text="ชื่อลูกค้า"),
            "post_location_name":   serializers.CharField(help_text="ลานจ่ายที่รับผิดชอบ"),
            "waitingTime":          serializers.IntegerField(help_text="เวลารอ (นาที)"),
            "cpac":                 serializers.IntegerField(help_text="จำนวนกระเบื้อง CPAC"),
            "prestige":             serializers.IntegerField(help_text="จำนวนกระเบื้อง PRESTIGE"),
            "neustile":             serializers.IntegerField(help_text="จำนวนกระเบื้อง NEUSTILE"),
            "fitting":              serializers.IntegerField(help_text="จำนวน Fitting รวม"),
            "accessories":          serializers.IntegerField(help_text="จำนวน Accessories"),
            "tileStatus":           serializers.CharField(help_text="สถานะการจัดกระเบื้อง"),
            "fittingStatus":        serializers.CharField(help_text="สถานะการจัด Fitting"),
            "accStatus":            serializers.CharField(help_text="สถานะการจัด Accessories"),
            "arrivalDate":          serializers.CharField(allow_null=True, help_text="เวลารถเข้า"),
            "completedDate":        serializers.CharField(allow_null=True, help_text="เวลาจัดเสร็จ"),
            "exitDate":             serializers.CharField(allow_null=True, help_text="เวลารถออก"),
            "predictedFinishTime":  serializers.CharField(allow_null=True, help_text="เวลาเสร็จที่พยากรณ์ (ML)"),
            "predictedTotalTimeMin": serializers.FloatField(allow_null=True, help_text="เวลาโหลดรวมที่พยากรณ์ (นาที)"),
        }, many=True),
    },
)
@api_view(['GET'])
def truck_queues(request):
    return _json_response(get_truck_queues_data(), safe=False)


@extend_schema(
    tags=["Dashboard"],
    summary="ข้อมูลลานจ่ายทั้งหมด",
    description=(
        "คืนค่าข้อมูลลานจ่าย (Post Locations) ทั้งหมด จัดกลุ่มตาม yard หลัก\n\n"
        "แต่ละ yard มี channels (จุดจ่ายย่อย) พร้อมข้อมูลรถที่กำลังโหลด และ forklift ที่ active"
    ),
    parameters=[_PLANT_CODE_PARAM],
    responses={
        200: inline_serializer("PostLocationsResponse", fields={
            "success":    serializers.BooleanField(),
            "plant_code": serializers.CharField(),
            "plant_name": serializers.CharField(),
            "yards": inline_serializer("YardItem", fields={
                "main_name": serializers.CharField(help_text="ชื่อลานจ่ายหลัก"),
                "main_code": serializers.CharField(help_text="รหัสลานจ่ายหลัก"),
                "channels": inline_serializer("ChannelItem", fields={
                    "slot_name":            serializers.CharField(),
                    "slot_code":            serializers.CharField(),
                    "post_location_code":   serializers.CharField(),
                    "post_location_name":   serializers.CharField(),
                    "truck_count":          serializers.IntegerField(help_text="จำนวนรถในช่องนี้"),
                    "car_no":               serializers.CharField(allow_null=True, help_text="ทะเบียนรถ"),
                    "truck_status":         serializers.CharField(allow_null=True),
                    "channel_status":       serializers.CharField(help_text="ว่าง หรือ กำลังโหลด"),
                    "channel_status_code":  serializers.CharField(help_text="empty หรือ loading"),
                    "forklift_count":       serializers.IntegerField(help_text="จำนวน forklift ที่ active"),
                    "forklift_driver_names": serializers.CharField(help_text="ชื่อคนขับ forklift"),
                    "waiting_time":         serializers.IntegerField(help_text="เวลารอ (นาที)"),
                }, many=True),
            }, many=True),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูลลานจ่าย"),
    },
)
@api_view(['GET'])
def post_locations_api(request):
    plant_code = request.GET.get("plant_code", PLANT_CODE)
    try:
        return _json_response(get_post_locations_response_data(plant_code=plant_code))
    except Exception as error:
        logger.exception("Post locations API failed for plant_code=%s", plant_code)
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลลานจ่าย", "error": str(error)},
            status=500,
        )


# ---------------------------------------------------------------------------
# Predictions — หน้ารายงานผลโมเดล
# ---------------------------------------------------------------------------

_PREDICTION_TRUCK_FIELDS = {
    "sequence":            serializers.IntegerField(help_text="ลำดับรถ"),
    "licensePlate":        serializers.CharField(help_text="ทะเบียนรถ"),
    "carType":             serializers.CharField(help_text="ประเภทรถ: 4 ล้อ, 6 ล้อ, 10 ล้อ, เทรเลอร์"),
    "queueType":           serializers.CharField(help_text="ประเภทคิว: SmartQ, Walk in, ล่วงหน้า"),
    "arrivalTime":         serializers.CharField(allow_null=True, help_text="เวลาเข้า (HH:MM:SS)"),
    "predictedFinishTime": serializers.CharField(allow_null=True, help_text="เวลาเสร็จที่พยากรณ์ (HH:MM:SS)"),
    "actualFinishTime":    serializers.CharField(allow_null=True, help_text="เวลาเสร็จจริง (HH:MM:SS)"),
    "errorMin":            serializers.FloatField(allow_null=True, help_text="ความคลาดเคลื่อน (นาที) + = ช้ากว่า, - = เร็วกว่า"),
    "isCompleted":         serializers.BooleanField(help_text="โหลดเสร็จแล้วหรือยัง"),
    "status":              serializers.CharField(help_text="เสร็จแล้ว | กำลังดำเนินการ"),
}

_PREDICTION_METRICS_FIELDS = {
    "mae":        serializers.FloatField(allow_null=True, help_text="Mean Absolute Error (นาที)"),
    "rmse":       serializers.FloatField(allow_null=True, help_text="Root Mean Square Error (นาที)"),
    "accuracy15": serializers.FloatField(allow_null=True, help_text="% ที่แม่นยำภายใน ±15 นาที"),
    "n":          serializers.IntegerField(help_text="จำนวนรถที่ใช้คำนวณ (เฉพาะที่เสร็จแล้ว)"),
}


@extend_schema(
    tags=["Predictions"],
    summary="รายงานผลทำนายแบบ real-time (คำนวณสด)",
    description=(
        "คำนวณผลทำนายด้วย ML (XGBoost) แบบ real-time สำหรับรถทุกคันในวันนี้\n\n"
        "**Metrics:**\n"
        "- `mae`: Mean Absolute Error (นาที)\n"
        "- `rmse`: Root Mean Square Error (นาที)\n"
        "- `accuracy15`: % ของรถที่พยากรณ์ผิดพลาดไม่เกิน ±15 นาที\n"
        "- `n`: จำนวนรถที่ใช้คำนวณ metrics (เฉพาะที่เสร็จแล้ว)\n\n"
        "⚠️ Endpoint นี้รัน ML model ทุกครั้งที่เรียก ใช้ `/predictions/log/` สำหรับการแสดงผลหน้าเว็บ"
    ),
    responses={
        200: inline_serializer("PredictionReportResponse", fields={
            "total":     serializers.IntegerField(help_text="จำนวนรถทั้งหมด"),
            "completed": serializers.IntegerField(help_text="จำนวนรถที่เสร็จแล้ว"),
            "metrics":   inline_serializer("PredictionMetrics", fields=_PREDICTION_METRICS_FIELDS),
            "trucks":    inline_serializer("PredictionTruckItem", fields=_PREDICTION_TRUCK_FIELDS, many=True),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการคำนวณผลโมเดล"),
    },
)
@api_view(['GET'])
def prediction_report(request):
    try:
        return _json_response(get_prediction_report_data())
    except Exception as error:
        logger.exception("Prediction report API failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงรายงานผลโมเดล", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Predictions"],
    summary="ผลทำนายจาก PredictionLog (อ่านจาก DB)",
    description=(
        "อ่านผลทำนายจากตาราง `PredictionLog` โดยตรง ไม่รัน ML model — กรองตามช่วงเวลาที่เลือก\n\n"
        "ข้อมูลถูกอัปเดตอัตโนมัติทุก 2 นาทีโดย background task\n\n"
        "**Status:**\n"
        "- `in_progress`: รถยังอยู่ในคิว ยังไม่ปิดงาน\n"
        "- `completed`: รถปิดงานแล้ว มีค่า `errorMin`\n\n"
        "**errorMin:** ค่าบวก = เสร็จช้ากว่าทำนาย, ค่าลบ = เสร็จเร็วกว่า"
    ),
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM, _MODEL_PARAM, _VERSION_PARAM],
    responses={
        200: inline_serializer("PredictionLogResponse", fields={
            "total":     serializers.IntegerField(help_text="จำนวนรถทั้งหมดในช่วงที่เลือก"),
            "completed": serializers.IntegerField(help_text="จำนวนรถที่ปิดงานแล้ว"),
            "metrics":   inline_serializer("PredictionLogMetrics", fields=_PREDICTION_METRICS_FIELDS),
            "trucks":    inline_serializer("PredictionLogTruckItem", fields=_PREDICTION_TRUCK_FIELDS, many=True),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล PredictionLog"),
    },
)
@api_view(['GET'])
def prediction_log(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    model     = request.GET.get("model") or None
    version   = request.GET.get("version") or None
    try:
        return _json_response(get_prediction_log_data(preset, date_from, date_to, model, version))
    except Exception as error:
        logger.exception("Prediction log API failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูล prediction log", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Predictions"],
    summary="รายชื่อโมเดลที่เคยทำนาย (สำหรับ dropdown เปรียบเทียบ)",
    description=(
        "คืนรายการคู่ (Model, Version) ที่มีใน `PredictionLog` ทั้งหมด พร้อม `n` = "
        "จำนวนแถวภายในช่วงวันที่ที่เลือก (n=0 หมายถึงโมเดลนั้นไม่ได้ใช้ในช่วงนี้)"
    ),
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: inline_serializer("PredictionModelsResponse", fields={
            "models": inline_serializer("PredictionModelItem", many=True, fields={
                "model":   serializers.CharField(allow_null=True, help_text="ชนิดโมเดล เช่น XGBoost, LightGBM"),
                "version": serializers.FloatField(allow_null=True, help_text="เวอร์ชันโมเดล เช่น 1.0, 2.0"),
                "n":       serializers.IntegerField(help_text="จำนวนแถวของโมเดลนี้ในช่วงวันที่ที่เลือก"),
            }),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงรายชื่อโมเดล"),
    },
)
@api_view(['GET'])
def prediction_models(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_prediction_models(preset, date_from, date_to))
    except Exception as error:
        logger.exception("Prediction models API failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงรายชื่อโมเดล", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Predictions"],
    summary="ข้อมูลหน้า Predictions มุมมองวันนี้ (snapshot)",
    description=(
        "คืนค่าข้อมูลมุมมอง \"วันนี้\" ของหน้า Predictions แบบรวม (prediction log + "
        "metrics timeseries รายชั่วโมง) โครงเดียวกับที่ส่งผ่าน WebSocket\n\n"
        "สำหรับข้อมูล real-time ให้ใช้ WebSocket: `ws://<host>/ws/predictions/stream/`"
    ),
    parameters=[_PLANT_CODE_PARAM],
    responses={200: OpenApiResponse(description="prediction log + metrics timeseries ของวันนี้")},
)
@api_view(['GET'])
def predictions_snapshot(request):
    plant_code = request.GET.get("plant_code", PLANT_CODE)
    try:
        return _json_response(predictions_snapshot_store.get_cached(plant_code=plant_code))
    except Exception as error:
        logger.exception("Predictions snapshot API failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูล predictions snapshot", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Predictions"],
    summary="แนวโน้ม MAE / RMSE / R² ตามช่วงเวลา",
    description=(
        "คืนค่าความคลาดเคลื่อนของโมเดล (MAE, RMSE) และ R² จัดกลุ่มตามชั่วโมงหรือวัน "
        "คำนวณจากแถวที่ปิดงานแล้วใน `PredictionLog` ตามช่วงเวลาที่เลือก"
    ),
    parameters=[_PRESET_PARAM, _GROUP_BY_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM, _MODEL_PARAM, _VERSION_PARAM],
    responses={
        200: inline_serializer("PredictionMetricsTimeseriesResponse", fields={
            "preset":   serializers.CharField(),
            "group_by": serializers.CharField(),
            "data":     inline_serializer("PredictionMetricsPoint", many=True, fields={
                "period": serializers.CharField(help_text="แกน X (ชั่วโมง HH:00 หรือวัน YYYY-MM-DD)"),
                "mae":    serializers.FloatField(allow_null=True),
                "rmse":   serializers.FloatField(allow_null=True),
                "r2":     serializers.FloatField(allow_null=True, help_text="R² (None ถ้าข้อมูลน้อยเกินไป)"),
                "n":      serializers.IntegerField(help_text="จำนวนคันที่เสร็จในช่วงนั้น"),
            }),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูลแนวโน้มผลโมเดล"),
    },
)
@api_view(['GET'])
def prediction_metrics_timeseries(request):
    preset    = request.GET.get("preset", "today")
    group_by  = request.GET.get("group_by", "day")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    model     = request.GET.get("model") or None
    version   = request.GET.get("version") or None
    try:
        return _json_response(get_prediction_metrics_timeseries(preset, group_by, date_from, date_to, model, version))
    except Exception as error:
        logger.exception("Prediction metrics timeseries API failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลแนวโน้มผลโมเดล", "error": str(error)},
            status=500,
        )


# ---------------------------------------------------------------------------
# Analytics — หน้าวิเคราะห์ข้อมูล
# ---------------------------------------------------------------------------

@extend_schema(
    tags=["Analytics"],
    summary="ข้อมูลหน้า Analytics มุมมองวันนี้ (snapshot)",
    description=(
        "คืนค่าข้อมูลมุมมอง \"วันนี้\" ของหน้า Analytics แบบรวม (KPI, throughput, "
        "queue distribution, product volume, avg time by truck type) โครงเดียวกับที่ส่งผ่าน WebSocket\n\n"
        "สำหรับข้อมูล real-time ให้ใช้ WebSocket: `ws://<host>/ws/analytics/stream/`"
    ),
    parameters=[_PLANT_CODE_PARAM],
    responses={200: OpenApiResponse(description="ชุดข้อมูล analytics ของวันนี้")},
)
@api_view(['GET'])
def analytics_snapshot(request):
    plant_code = request.GET.get("plant_code", PLANT_CODE)
    try:
        return _json_response(analytics_snapshot_store.get_cached(plant_code=plant_code))
    except Exception as error:
        logger.exception("Analytics snapshot API failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูล analytics snapshot", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="KPI สรุปภาพรวมตามช่วงเวลา",
    description=(
        "คืนค่า KPI 4 ตัว พร้อมเปรียบเทียบกับช่วงเวลาก่อนหน้าขนาดเดียวกัน (% change)\n\n"
        "- `total_trucks`: รถทั้งหมดที่เสร็จ\n"
        "- `avg_wait_min`: เวลารอเฉลี่ย (นาที)\n"
        "- `avg_load_min`: เวลาโหลดเฉลี่ย (นาที)\n"
        "- `overtime_trucks`: รถที่ใช้เวลาเกินกำหนด"
    ),
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: inline_serializer("KpiSummaryResponse", fields={
            "preset":  serializers.CharField(help_text="ช่วงเวลาที่เลือก"),
            "period":  inline_serializer("KpiPeriod", fields={
                "from": serializers.CharField(),
                "to":   serializers.CharField(),
            }),
            "kpi": inline_serializer("KpiValues", fields={
                "total_trucks":  inline_serializer("KpiMetricCount", fields={
                    "value":      serializers.FloatField(allow_null=True),
                    "prev":       serializers.FloatField(allow_null=True),
                    "change_pct": serializers.FloatField(allow_null=True, help_text="% เทียบช่วงก่อนหน้า"),
                }),
                "avg_wait_min":  inline_serializer("KpiMetricWait", fields={
                    "value":      serializers.FloatField(allow_null=True),
                    "prev":       serializers.FloatField(allow_null=True),
                    "change_pct": serializers.FloatField(allow_null=True),
                }),
                "avg_load_min":  inline_serializer("KpiMetricLoad", fields={
                    "value":      serializers.FloatField(allow_null=True),
                    "prev":       serializers.FloatField(allow_null=True),
                    "change_pct": serializers.FloatField(allow_null=True),
                }),
                "avg_total_min": inline_serializer("KpiMetricTotal", fields={
                    "value":      serializers.FloatField(allow_null=True),
                    "prev":       serializers.FloatField(allow_null=True),
                    "change_pct": serializers.FloatField(allow_null=True),
                }),
                "overtime": inline_serializer("KpiMetricOvertime", fields={
                    "value":      serializers.FloatField(allow_null=True, help_text="จำนวนรถที่ใช้เวลาเกินกำหนด"),
                    "rate":       serializers.FloatField(allow_null=True, help_text="% ของรถทั้งหมดในช่วงนี้"),
                    "prev":       serializers.FloatField(allow_null=True),
                    "change_pct": serializers.FloatField(allow_null=True),
                }),
            }),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล KPI"),
    },
)
@api_view(['GET'])
def analytics_kpi_summary(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_kpi_summary_data(preset, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics KPI summary failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูล KPI", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="ปริมาณรถที่เสร็จตามช่วงเวลา",
    description="คืนค่าจำนวนรถที่เสร็จแล้ว (OPERATORCOMPLETED) จัดกลุ่มตามชั่วโมงหรือวัน",
    parameters=[_PRESET_PARAM, _GROUP_BY_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: inline_serializer("ThroughputResponse", fields={
            "labels": serializers.ListField(child=serializers.CharField(), help_text="แกน X (ชั่วโมงหรือวัน)"),
            "data":   serializers.ListField(child=serializers.IntegerField(), help_text="จำนวนรถแต่ละช่วง"),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_throughput(request):
    preset    = request.GET.get("preset", "today")
    group_by  = request.GET.get("group_by", "day")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_throughput_data(preset, group_by, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics throughput failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลปริมาณรถ", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="ปริมาณรถเข้าตามช่วงเวลา แยกตามประเภทรถ",
    description="คืนค่าจำนวนรถเข้า (OperatorCarConfirm) จัดกลุ่มตามชั่วโมง/วัน และแยกตามประเภทรถ สำหรับกราฟเส้นหลายเส้น",
    parameters=[_PRESET_PARAM, _GROUP_BY_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: OpenApiResponse(description="ปริมาณรถแยกตามประเภท {period, '4 ล้อ', '6 ล้อ', ...}"),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_throughput_by_truck_type(request):
    preset    = request.GET.get("preset", "today")
    group_by  = request.GET.get("group_by", "day")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_throughput_by_truck_type_data(preset, group_by, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics throughput-by-truck-type failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลปริมาณรถแยกประเภท", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="รถเข้า/ออก รายชั่วโมง แยกตามประเภทรถ",
    description=(
        "คืนค่าจำนวนรถเข้า/ออก รวมตามชั่วโมงของวัน (0–23) แยกตามประเภทรถ\n\n"
        "- `in`  = นับจาก OperatorCarConfirm\n"
        "- `out` = นับจาก PostingTime\n\n"
        "หากเลือกช่วงหลายวัน จะรวมทุกวันเข้าด้วยกันตามชั่วโมง"
    ),
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: OpenApiResponse(description="{preset, in:[{period, '4 ล้อ', ...}], out:[...]}"),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_hourly_in_out(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_hourly_breakdown_data(preset, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics hourly in/out failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลรถเข้า/ออกรายชั่วโมง", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="การกระจายเวลารวมตามช่วงเวลา (box plot)",
    description=(
        "คืนค่าสถิติ 5 จุด (min/Q1/median/Q3/max) ของเวลารวม (PostingTime − OperatorCarConfirm) "
        "ต่อรถ จัดกลุ่มตามวัน/ชั่วโมง — ไม่แยกตามประเภทรถ"
    ),
    parameters=[_PRESET_PARAM, _GROUP_BY_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: OpenApiResponse(description="{preset, group_by, data:[{period, min, q1, median, q3, max, count}]}"),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_time_distribution(request):
    preset    = request.GET.get("preset", "today")
    group_by  = request.GET.get("group_by", "day")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_time_distribution_data(preset, group_by, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics time-distribution failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลการกระจายเวลา", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="การกระจายเวลา 5 ช่วง แยกตามประเภทรถ (box plot)",
    description=(
        "คืนค่าสถิติ 5 จุด ของ 5 ช่วงเวลา (รอเรียก/รอโหลด/โหลด/รอปิดงาน/รอ post) "
        "ต่อ (ช่วงเวลา × ประเภทรถ) จัดกลุ่มตามวัน/ชั่วโมง"
    ),
    parameters=[_PRESET_PARAM, _GROUP_BY_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: OpenApiResponse(description="{preset, group_by, phases:{<phase>:{data:[{period, <truckType>:{min,q1,median,q3,max,count}}]}}}"),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_phase_distribution(request):
    preset    = request.GET.get("preset", "today")
    group_by  = request.GET.get("group_by", "day")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_phase_distribution_data(preset, group_by, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics phase-distribution failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลการกระจายเวลาแต่ละช่วง", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="สัดส่วนประเภทคิวรถ",
    description="คืนค่าสัดส่วน SmartQ / Walk in / ล่วงหน้า ตามช่วงเวลาที่เลือก",
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: inline_serializer("QueueDistributionResponse", fields={
            "labels": serializers.ListField(child=serializers.CharField(), help_text="ประเภทคิว"),
            "data":   serializers.ListField(child=serializers.IntegerField(), help_text="จำนวนรถแต่ละประเภท"),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_queue_distribution(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_queue_distribution_data(preset, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics queue distribution failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลสัดส่วนคิว", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="ปริมาณสินค้าต่อวันแยกตามแบรนด์",
    description="คืนค่าปริมาณสินค้า (SapAmount) แยกตามแบรนด์ CPAC / PRESTIGE / NEUSTILE / DURA / อุปกรณ์เสริม รายวัน",
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: inline_serializer("ProductVolumeResponse", fields={
            "labels": serializers.ListField(child=serializers.CharField(), help_text="วันที่"),
            "datasets": serializers.ListField(help_text="ข้อมูลแต่ละแบรนด์ {label, data[]}"),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_product_volume(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_product_volume_data(preset, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics product volume failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลปริมาณสินค้า", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="เวลาเฉลี่ย 5 ช่วงแยกตามลานจอด",
    description="คืนค่าเวลาเฉลี่ย (นาที) ของ 5 ช่วงในวงจรรถ (รอเรียก/รอโหลด/โหลด/รอปิดงาน/รอ post) แยกตามลานจอด สำหรับ stacked bar",
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: OpenApiResponse(description="{preset, lanes:[{lane, truck_count, wait_call, wait_load, load, wait_close, wait_post, total}]}"),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_lane_phase_breakdown(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_lane_phase_breakdown_data(preset, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics lane phase breakdown failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลเวลาเฉลี่ยแยกตามลานจอด", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="ประวัติรถย้อนหลัง (N คันล่าสุด)",
    description="คืนค่ารายการรถล่าสุดในช่วงเวลาที่เลือก (รวมทุกสถานะ) สำหรับตารางย้อนดูข้อมูล โครงสร้างเหมือน /truck_queues/",
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: OpenApiResponse(description="{preset, limit, count, trucks:[...]}"),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_truck_history(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    limit     = request.GET.get("limit", 100)
    try:
        return _json_response(get_truck_history_data(preset, date_from, date_to, limit))
    except Exception as error:
        logger.exception("Analytics truck history failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติรถ", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="รถใช้เวลาเกินกำหนด (overtime)",
    description="คืนค่าข้อมูลรถที่ใช้เวลาเกิน 120 นาที: summary, เวลาเฉลี่ยแต่ละช่วง (overtime vs ปกติ), จำนวนแยกประเภทรถ, และรายการรถ",
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: OpenApiResponse(description="{preset, threshold, summary, by_phase, by_truck_type, trucks:[...]}"),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_overtime(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    limit     = request.GET.get("limit", 200)
    try:
        return _json_response(get_overtime_data(preset, date_from, date_to, limit))
    except Exception as error:
        logger.exception("Analytics overtime failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลรถใช้เวลาเกิน", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="เวลาเฉลี่ย (รอ/โหลด/รวม) แยกตามประเภทรถ",
    description=(
        "คืนค่าเวลาเฉลี่ย 3 ตัว แยกตามประเภทรถ 4 ล้อ / 6 ล้อ / 10 ล้อ / เทรเลอร์\n\n"
        "- `avg_wait`  = CarConfirm − OperatorCarConfirm\n"
        "- `avg_load`  = LastPostPallet − FirstPostPallet\n"
        "- `avg_total` = PostingTime − OperatorCarConfirm"
    ),
    parameters=[_PRESET_PARAM, _GROUP_BY_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: inline_serializer("AvgTimeByTruckTypeResponse", fields={
            "labels": serializers.ListField(child=serializers.CharField(), help_text="ช่วงเวลา"),
            "datasets": serializers.ListField(help_text="ข้อมูลแต่ละประเภทรถ {carType, avg_wait, avg_load, avg_total}"),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูล"),
    },
)
@api_view(['GET'])
def analytics_avg_time_by_truck_type(request):
    preset    = request.GET.get("preset",   "today")
    group_by  = request.GET.get("group_by", "day")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_avg_time_by_truck_type_data(preset, group_by, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics avg-time-by-truck-type failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลเวลาเฉลี่ย", "error": str(error)},
            status=500,
        )


@extend_schema(
    tags=["Analytics"],
    summary="สรุปการแจ้งเตือน KPI แยกตามประเภท",
    description="คืนค่าจำนวนการแจ้งเตือนแต่ละประเภทจาก LogNotification แยกตาม DetailCode (1–5) พร้อม % ของแต่ละประเภทต่อยอดรวม",
    parameters=[_PRESET_PARAM, _DATE_FROM_PARAM, _DATE_TO_PARAM],
    responses={
        200: inline_serializer("NotificationSummaryResponse", fields={
            "preset": serializers.CharField(),
            "total":  serializers.IntegerField(help_text="จำนวนการแจ้งเตือนทั้งหมด"),
            "data":   serializers.ListField(help_text="แต่ละประเภท {detail_code, label, count, pct}"),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน"),
    },
)
@api_view(['GET'])
def analytics_notification_summary(request):
    preset    = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to   = request.GET.get("date_to")
    try:
        return _json_response(get_notification_summary_data(preset, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics notification summary failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูลการแจ้งเตือน", "error": str(error)},
            status=500,
        )


# ---------------------------------------------------------------------------
# Auth — login เฉพาะผู้ดูแล
# ---------------------------------------------------------------------------

def _session_payload(principal, token):
    """ข้อมูล session ที่ส่งกลับให้ frontend หลัง login / ตรวจ token"""
    plants = visible_plants(principal)
    return {
        "token": token,
        "user": {"username": principal["username"], "role": principal["role"]},
        "is_admin": principal["role"] == "admin",
        "plants": plants,
        "default_plant_code": default_plant_code(principal),
    }


@extend_schema(
    tags=["Auth"],
    summary="เข้าสู่ระบบ",
    description="ตรวจสอบ username/password กับค่าใน environment แล้วคืน token พร้อมรายชื่อโรงงานที่มีสิทธิ์",
    request=inline_serializer("LoginRequest", fields={
        "username": serializers.CharField(),
        "password": serializers.CharField(),
    }),
    responses={
        200: inline_serializer("LoginResponse", fields={
            "token":              serializers.CharField(),
            "is_admin":           serializers.BooleanField(),
            "default_plant_code": serializers.CharField(allow_null=True),
            "user":               serializers.DictField(),
            "plants":             serializers.ListField(),
        }),
        401: OpenApiResponse(description="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"),
    },
)
@api_view(['POST'])
def auth_login(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    principal = authenticate(username, password)
    if not principal:
        return _json_response({"detail": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}, status=401)

    token = issue_token(principal)
    return _json_response(_session_payload(principal, token))


@extend_schema(
    tags=["Auth"],
    summary="ข้อมูลผู้ใช้ปัจจุบัน",
    description="ตรวจสอบ token ที่แนบมา (header `Authorization: Bearer ...`) แล้วคืนข้อมูล session เดิม",
    responses={
        200: OpenApiResponse(description="ข้อมูล session ของผู้ใช้"),
        401: OpenApiResponse(description="ยังไม่ได้เข้าสู่ระบบ / token หมดอายุ"),
    },
)
@api_view(['GET'])
@require_auth
def auth_me(request):
    token = request.META.get("HTTP_AUTHORIZATION", "")[len("Bearer "):].strip()
    return _json_response(_session_payload(request.principal, token))


@extend_schema(
    tags=["Auth"],
    summary="เพิ่มโรงงาน (เฉพาะผู้ดูแลส่วนกลาง)",
    description="เพิ่มโรงงานใหม่เข้าระบบ — เฉพาะ role admin เท่านั้น คืนรายชื่อโรงงานล่าสุดหลังเพิ่ม",
    request=inline_serializer("AddPlantRequest", fields={
        "code": serializers.CharField(help_text="รหัสโรงงาน"),
        "name": serializers.CharField(help_text="ชื่อโรงงาน"),
    }),
    responses={
        200: OpenApiResponse(description="รายชื่อโรงงานล่าสุด"),
        400: OpenApiResponse(description="ข้อมูลไม่ครบ"),
        403: OpenApiResponse(description="ไม่ใช่ผู้ดูแลส่วนกลาง"),
        409: OpenApiResponse(description="รหัสโรงงานซ้ำ"),
    },
)
@api_view(['POST'])
@require_auth
def auth_add_plant(request):
    principal = request.principal
    if principal.get("role") != "admin":
        return _json_response({"detail": "เฉพาะผู้ดูแลส่วนกลางเท่านั้นที่เพิ่มโรงงานได้"}, status=403)

    try:
        add_plant(request.data.get("code"), request.data.get("name"))
    except PlantExistsError:
        return _json_response({"detail": "มีรหัสโรงงานนี้อยู่แล้ว"}, status=409)
    except ValueError as error:
        return _json_response({"detail": str(error)}, status=400)

    return _json_response({
        "plants": visible_plants(principal),
        "default_plant_code": default_plant_code(principal),
        "is_admin": True,
    })


@extend_schema(
    tags=["Auth"],
    summary="ลบโรงงาน (เฉพาะผู้ดูแลส่วนกลาง)",
    description="ลบโรงงานที่เพิ่มผ่าน UI — เฉพาะ role admin; ลบโรงงานที่ตั้งค่าผ่าน env ไม่ได้",
    responses={
        200: OpenApiResponse(description="รายชื่อโรงงานล่าสุด"),
        400: OpenApiResponse(description="ลบไม่ได้ (เช่น เป็นโรงงานจาก env)"),
        403: OpenApiResponse(description="ไม่ใช่ผู้ดูแลส่วนกลาง"),
        404: OpenApiResponse(description="ไม่พบโรงงาน"),
    },
)
@api_view(['DELETE'])
@require_auth
def auth_delete_plant(request, code):
    principal = request.principal
    if principal.get("role") != "admin":
        return _json_response({"detail": "เฉพาะผู้ดูแลส่วนกลางเท่านั้นที่ลบโรงงานได้"}, status=403)

    try:
        remove_plant(code)
    except PlantNotFoundError:
        return _json_response({"detail": "ไม่พบโรงงานนี้"}, status=404)
    except ValueError as error:
        return _json_response({"detail": str(error)}, status=400)

    return _json_response({
        "plants": visible_plants(principal),
        "default_plant_code": default_plant_code(principal),
        "is_admin": True,
    })
