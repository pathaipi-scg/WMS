import logging

from django.http import JsonResponse
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view

from .constants import PLANT_CODE
from .services.dashboard_snapshot_store import get_cached_dashboard_snapshot_data
from .services.dashboard_summary import get_dashboard_summary_data
from .services.post_locations import get_post_locations_response_data
from .services.truck_queues import get_truck_queues_data
from .services.prediction_report import get_prediction_report_data
from .services.analytics_kpi_summary import get_kpi_summary_data
from .services.analytics_throughput import get_throughput_data
from .services.analytics_queue_distribution import get_queue_distribution_data
from .services.analytics_product_volume import get_product_volume_data
from .services.analytics_avg_time_by_truck_type import get_avg_time_by_truck_type_data

logger = logging.getLogger(__name__)

_PLANT_CODE_PARAM = OpenApiParameter(
    name="plant_code",
    type=str,
    location=OpenApiParameter.QUERY,
    description="รหัสโรงงาน",
    required=False,
    default="COM20060001",
)


def _json_response(payload, *, safe=True, status=200):
    return JsonResponse(
        payload,
        safe=safe,
        status=status,
        json_dumps_params={"ensure_ascii": False, "default": str},
    )


@extend_schema(
    tags=["Dashboard"],
    summary="สรุปจำนวนรถบรรทุกแยกตามสถานะ",
    description="คืนค่าจำนวนรถบรรทุกทั้งหมดในวันนี้ แยกตามสถานะ: รอคิว, กำลังโหลด, เสร็จแล้ว, และล่าช้า",
    responses={
        200: inline_serializer("DashboardSummaryResponse", fields={
            "total_trucks": serializers.IntegerField(help_text="จำนวนรถทั้งหมดในวันนี้"),
            "waiting_queue": serializers.IntegerField(help_text="รอคิว"),
            "loading": serializers.IntegerField(help_text="กำลังโหลดสินค้า"),
            "completed": serializers.IntegerField(help_text="เสร็จแล้ว"),
            "overtime_trucks": serializers.IntegerField(help_text="ล่าช้าเกิน 2 ชั่วโมง"),
            "from": serializers.CharField(help_text="ช่วงเวลาเริ่มต้น (YYYY-MM-DD HH:MM:SS)"),
            "to": serializers.CharField(help_text="ช่วงเวลาสิ้นสุด (YYYY-MM-DD HH:MM:SS)"),
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
        "ข้อมูลนี้ถูก cache ไว้และอัปเดตทุก 30 วินาทีโดย broadcaster\n\n"
        "สำหรับข้อมูล real-time ให้ใช้ WebSocket: `ws://<host>/ws/dashboard/stream/`"
    ),
    parameters=[_PLANT_CODE_PARAM],
    responses={
        200: inline_serializer("DashboardSnapshotResponse", fields={
            "success": serializers.BooleanField(),
            "plant_code": serializers.CharField(help_text="รหัสโรงงาน"),
            "plant_name": serializers.CharField(help_text="ชื่อโรงงาน"),
            "captured_at": serializers.CharField(help_text="เวลาที่ดึงข้อมูล (ISO 8601)"),
            "summary": inline_serializer("SnapshotSummary", fields={
                "total_trucks": serializers.IntegerField(),
                "waiting_queue": serializers.IntegerField(),
                "loading": serializers.IntegerField(),
                "completed": serializers.IntegerField(),
                "overtime_trucks": serializers.IntegerField(),
            }),
            "truck_queues": serializers.ListField(help_text="รายการรถในคิว (ดูรูปแบบจาก /truck_queues/)"),
            "yards": serializers.ListField(help_text="รายการลานจ่าย (ดูรูปแบบจาก /post-locations/)"),
        }),
    },
)
@api_view(['GET'])
def dashboard_snapshot(request):
    plant_code = request.GET.get("plant_code", PLANT_CODE)
    return _json_response(get_cached_dashboard_snapshot_data(plant_code=plant_code))


@extend_schema(
    tags=["Dashboard"],
    summary="รายการรถในคิวทั้งหมดพร้อมรายละเอียด",
    description="คืนค่ารายการรถบรรทุกที่อยู่ในคิวของวันนี้ พร้อมข้อมูลสินค้า สถานะการจัด และเวลาต่างๆ",
    responses={
        200: inline_serializer("TruckQueueItem", fields={
            "sequence": serializers.IntegerField(help_text="ลำดับรถ"),
            "licensePlate": serializers.CharField(help_text="ทะเบียนรถ"),
            "queueType": serializers.CharField(help_text="ประเภทคิว: SmartQ, Walk in, ล่วงหน้า"),
            "status": serializers.CharField(help_text="สถานะ: รอคิว, กำลังโหลด"),
            "customer_name": serializers.CharField(help_text="ชื่อลูกค้า"),
            "post_location_name": serializers.CharField(help_text="ลานจ่ายที่รับผิดชอบ"),
            "waitingTime": serializers.IntegerField(help_text="เวลารอ (นาที)"),
            "cpac": serializers.IntegerField(help_text="จำนวนกระเบื้อง CPAC"),
            "prestige": serializers.IntegerField(help_text="จำนวนกระเบื้อง PRESTIGE"),
            "neustile": serializers.IntegerField(help_text="จำนวนกระเบื้อง NEUSTILE"),
            "fitting": serializers.IntegerField(help_text="จำนวน Fitting รวม"),
            "accessories": serializers.IntegerField(help_text="จำนวน Accessories"),
            "tileStatus": serializers.CharField(help_text="สถานะการจัดกระเบื้อง"),
            "fittingStatus": serializers.CharField(help_text="สถานะการจัด Fitting"),
            "accStatus": serializers.CharField(help_text="สถานะการจัด Accessories"),
            "arrivalDate": serializers.CharField(allow_null=True, help_text="เวลารถเข้า"),
            "completedDate": serializers.CharField(allow_null=True, help_text="เวลาจัดเสร็จ"),
            "exitDate": serializers.CharField(allow_null=True, help_text="เวลารถออก"),
            "predictedFinishTime": serializers.CharField(allow_null=True, help_text="เวลาเสร็จที่พยากรณ์ (ML)"),
            "predictedTotalTimeMin": serializers.FloatField(allow_null=True, help_text="เวลาโหลดรวมที่พยากรณ์ (นาที)"),
        }, many=True),
    },
)
@api_view(['GET'])
def truck_queues(request):
    return _json_response(get_truck_queues_data(), safe=False)


@extend_schema(
    tags=["Predictions"],
    summary="รายงานผลพยากรณ์และ metrics ความแม่นยำ",
    description=(
        "คืนค่าผลเปรียบเทียบระหว่างเวลาที่พยากรณ์ด้วย ML (XGBoost) กับเวลาจริงของรถทุกคันในวันนี้\n\n"
        "**Metrics:**\n"
        "- `mae`: Mean Absolute Error (นาที)\n"
        "- `rmse`: Root Mean Square Error (นาที)\n"
        "- `accuracy15`: % ของรถที่พยากรณ์ผิดพลาดไม่เกิน 15 นาที\n"
        "- `n`: จำนวนรถที่ใช้คำนวณ metrics (เฉพาะที่เสร็จแล้ว)"
    ),
    responses={
        200: inline_serializer("PredictionReportResponse", fields={
            "total": serializers.IntegerField(help_text="จำนวนรถทั้งหมดในรายงาน"),
            "completed": serializers.IntegerField(help_text="จำนวนรถที่เสร็จแล้ว"),
            "metrics": inline_serializer("PredictionMetrics", fields={
                "mae": serializers.FloatField(allow_null=True, help_text="Mean Absolute Error (นาที)"),
                "rmse": serializers.FloatField(allow_null=True, help_text="Root Mean Square Error (นาที)"),
                "accuracy15": serializers.FloatField(allow_null=True, help_text="% ที่แม่นยำภายใน 15 นาที"),
                "n": serializers.IntegerField(help_text="จำนวนตัวอย่างที่ใช้คำนวณ"),
            }),
            "trucks": inline_serializer("PredictionTruckItem", fields={
                "sequence": serializers.IntegerField(),
                "licensePlate": serializers.CharField(),
                "carType": serializers.CharField(help_text="ประเภทรถ"),
                "queueType": serializers.CharField(),
                "arrivalTime": serializers.CharField(allow_null=True, help_text="เวลาเข้า (HH:MM:SS)"),
                "predictedFinishTime": serializers.CharField(allow_null=True, help_text="เวลาเสร็จที่พยากรณ์"),
                "actualFinishTime": serializers.CharField(allow_null=True, help_text="เวลาเสร็จจริง"),
                "errorMin": serializers.FloatField(allow_null=True, help_text="ความคลาดเคลื่อน (นาที)"),
                "isCompleted": serializers.BooleanField(),
            }, many=True),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงรายงาน"),
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
    tags=["Dashboard"],
    summary="ข้อมูลลานจ่ายทั้งหมด",
    description=(
        "คืนค่าข้อมูลลานจ่าย (Post Locations) ทั้งหมด จัดกลุ่มตาม yard หลัก\n\n"
        "แต่ละ yard มี channels (จุดจ่ายย่อย) พร้อมข้อมูลรถที่กำลังโหลด และ forklift ที่ active"
    ),
    parameters=[_PLANT_CODE_PARAM],
    responses={
        200: inline_serializer("PostLocationsResponse", fields={
            "success": serializers.BooleanField(),
            "plant_code": serializers.CharField(),
            "plant_name": serializers.CharField(),
            "yards": inline_serializer("YardItem", fields={
                "main_name": serializers.CharField(help_text="ชื่อลานจ่ายหลัก"),
                "main_code": serializers.CharField(help_text="รหัสลานจ่ายหลัก"),
                "channels": inline_serializer("ChannelItem", fields={
                    "slot_name": serializers.CharField(),
                    "slot_code": serializers.CharField(),
                    "post_location_code": serializers.CharField(),
                    "post_location_name": serializers.CharField(),
                    "truck_count": serializers.IntegerField(help_text="จำนวนรถในช่องนี้"),
                    "car_no": serializers.CharField(allow_null=True, help_text="ทะเบียนรถ"),
                    "truck_status": serializers.CharField(allow_null=True),
                    "channel_status": serializers.CharField(help_text="ว่าง หรือ กำลังโหลด"),
                    "channel_status_code": serializers.CharField(help_text="empty หรือ loading"),
                    "forklift_count": serializers.IntegerField(help_text="จำนวน forklift ที่ active"),
                    "forklift_driver_names": serializers.CharField(help_text="ชื่อคนขับ forklift"),
                    "waiting_time": serializers.IntegerField(help_text="เวลารอ (นาที)"),
                }, many=True),
            }, many=True),
        }),
        500: OpenApiResponse(description="เกิดข้อผิดพลาดในการดึงข้อมูลลานจ่าย"),
    },
)
@extend_schema(
    tags=["Analytics"],
    summary="KPI สรุปภาพรวมตามช่วงเวลา",
    description=(
        "คืนค่า KPI 4 ตัว: รถทั้งหมด, เวลารอเฉลี่ย, เวลาโหลดเฉลี่ย, รถใช้เวลาเกิน\n\n"
        "พร้อมเปรียบเทียบกับช่วงเวลาก่อนหน้าขนาดเดียวกัน (% change)\n\n"
        "**Presets:** `today`, `7d`, `30d`, `3m`, `6m`, `1y`"
    ),
    parameters=[
        OpenApiParameter(name="preset", type=str, location=OpenApiParameter.QUERY,
                         description="ช่วงเวลา: today | 7d | 30d | 3m | 6m | 1y",
                         required=False, default="today"),
    ],
)
@extend_schema(
    tags=["Analytics"],
    summary="ปริมาณรถที่เสร็จตามช่วงเวลา",
    description="คืนค่าจำนวนรถที่เสร็จแล้ว (OPERATORCOMPLETED) จัดกลุ่มตามชั่วโมงหรือวัน",
    parameters=[
        OpenApiParameter(name="preset", type=str, location=OpenApiParameter.QUERY,
                         description="ช่วงเวลา: today | 7d | 30d | 3m | 6m | 1y", required=False, default="today"),
        OpenApiParameter(name="group_by", type=str, location=OpenApiParameter.QUERY,
                         description="จัดกลุ่มตาม: hour | day", required=False, default="day"),
    ],
)
@api_view(['GET'])
def analytics_throughput(request):
    preset = request.GET.get("preset", "today")
    group_by = request.GET.get("group_by", "day")
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")
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
    summary="สัดส่วนประเภทคิวรถ",
    description="คืนค่าสัดส่วน SmartQ / Walk in / ล่วงหน้า ตามช่วงเวลาที่เลือก",
    parameters=[
        OpenApiParameter(name="preset", type=str, location=OpenApiParameter.QUERY,
                         description="ช่วงเวลา: today | 7d | 30d | 3m | 6m | 1y", required=False, default="today"),
    ],
)
@api_view(['GET'])
def analytics_queue_distribution(request):
    preset = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")
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
    parameters=[
        OpenApiParameter(name="preset", type=str, location=OpenApiParameter.QUERY,
                         description="ช่วงเวลา: today | 7d | 30d | 3m | 6m | 1y", required=False, default="today"),
    ],
)
@api_view(['GET'])
def analytics_product_volume(request):
    preset = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")
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
    summary="เวลาเฉลี่ย (รอ/โหลด/รวม) แยกตามประเภทรถ",
    description=(
        "คืนค่าเวลาเฉลี่ย 3 ตัว (รอ/โหลด/รวม) แยกตามประเภทรถ 4 ล้อ / 6 ล้อ / 10 ล้อ / เทรเลอร์\n\n"
        "จัดกลุ่มตามชั่วโมงหรือวัน\n\n"
        "- `avg_wait`  = CarConfirm − OperatorCarConfirm\n"
        "- `avg_load`  = LastPostPallet − FirstPostPallet\n"
        "- `avg_total` = PostingTime − OperatorCarConfirm"
    ),
    parameters=[
        OpenApiParameter(name="preset",   type=str, location=OpenApiParameter.QUERY,
                         description="ช่วงเวลา: today | 7d | 30d | 3m | 6m | 1y", required=False, default="today"),
        OpenApiParameter(name="group_by", type=str, location=OpenApiParameter.QUERY,
                         description="จัดกลุ่มตาม: hour | day", required=False, default="day"),
    ],
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


@api_view(['GET'])
def analytics_kpi_summary(request):
    preset = request.GET.get("preset", "today")
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")
    try:
        return _json_response(get_kpi_summary_data(preset, date_from, date_to))
    except Exception as error:
        logger.exception("Analytics KPI summary failed")
        return _json_response(
            {"success": False, "message": "เกิดข้อผิดพลาดในการดึงข้อมูล KPI", "error": str(error)},
            status=500,
        )


@api_view(['GET'])
def post_locations_api(request):
    plant_code = request.GET.get("plant_code", PLANT_CODE)

    try:
        return _json_response(get_post_locations_response_data(plant_code=plant_code))
    except Exception as error:
        logger.exception("Post locations API failed for plant_code=%s", plant_code)

        return _json_response(
            {
                "success": False,
                "message": "เกิดข้อผิดพลาดในการดึงข้อมูลลานจ่าย",
                "error": str(error),
            },
            status=500,
        )
