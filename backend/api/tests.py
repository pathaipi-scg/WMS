import json
from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase

from .services import dashboard_snapshot_store
from .services.post_locations import group_post_locations
from .views import dashboard_snapshot, dashboard_summary, post_locations_api, truck_queues


class DashboardViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @patch("api.views.get_dashboard_summary_data")
    def test_dashboard_summary_returns_service_payload(self, mock_service):
        mock_service.return_value = {
            "total_trucks": 10,
            "waiting_queue": 2,
            "loading": 3,
            "completed": 5,
            "overtime_trucks": 1,
            "from": "2026-04-01 00:00:00",
            "to": "2026-04-01 23:59:59",
        }

        response = dashboard_summary(self.factory.get("/api/dashboard/summary/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), mock_service.return_value)

    @patch("api.views.get_cached_dashboard_snapshot_data")
    def test_dashboard_snapshot_returns_service_payload(self, mock_service):
        mock_service.return_value = {
            "success": True,
            "plant_code": "COM20060001",
            "plant_name": "SB1",
            "captured_at": "2026-03-06T13:09:43+07:00",
            "summary": {"total_trucks": 10},
            "truck_queues": [],
            "yards": [],
        }

        response = dashboard_snapshot(self.factory.get("/api/dashboard/snapshot/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), mock_service.return_value)

    @patch("api.views.get_truck_queues_data")
    def test_truck_queues_returns_list_payload(self, mock_service):
        mock_service.return_value = [
            {
                "sequence": 1,
                "licensePlate": "70-1234",
                "queueType": "SmartQ",
                "customer_name": "Customer A",
                "post_location_name": "Lane 1",
                "waitingTime": 15,
                "cpac": 0,
                "prestige": 0,
                "neustile": 0,
                "fitting": 0,
                "accessories": 0,
                "status": "รอคิว",
                "arrivalDate": "2026-04-21T08:00:00+07:00",
                "callDate": "2026-04-21T08:15:00+07:00",
                "startDate": "2026-04-21T08:30:00+07:00",
                "completedDate": "2026-04-21T09:00:00+07:00",
                "exitDate": "2026-04-21T09:10:00+07:00",
                "tileStatus": "ไม่มีรับ",
                "fittingStatus": "ยังไม่เริ่ม",
                "accStatus": "เสร็จแล้ว",
            }
        ]

        response = truck_queues(self.factory.get("/api/dashboard/truck_queues/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), mock_service.return_value)

    @patch("api.views.get_post_locations_response_data")
    def test_post_locations_returns_service_payload(self, mock_service):
        mock_service.return_value = {
            "success": True,
            "plant_code": "COM20060001",
            "plant_name": "SB1",
            "yards": [],
        }

        response = post_locations_api(self.factory.get("/api/dashboard/post-locations/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), mock_service.return_value)

    @patch("api.views.get_post_locations_response_data", side_effect=RuntimeError("boom"))
    def test_post_locations_returns_500_when_service_fails(self, mock_service):
        response = post_locations_api(self.factory.get("/api/dashboard/post-locations/"))

        self.assertEqual(response.status_code, 500)
        self.assertEqual(
            json.loads(response.content),
            {
                "success": False,
                "message": "เกิดข้อผิดพลาดในการดึงข้อมูลลานจ่าย",
                "error": "boom",
            },
        )


class PostLocationGroupingTests(SimpleTestCase):
    def test_group_post_locations_combines_channels_under_same_yard(self):
        rows = [
            {
                "main_name": "ลานจ่าย 1",
                "main_code": "1",
                "slot_name": "ช่อง 1",
                "slot_code": "1",
                "post_location_code": "A1",
                "post_location_name": "ลานจ่าย 1 ช่อง 1",
                "truck_count": 1,
                "car_no": "70-1234",
                "truck_seq_no": 100,
                "truck_status": "Loading",
                "packlist_status": "WAITCHECKER",
                "customer_name": "Customer A",
                "queue_time": None,
                "picking_time": None,
                "posting_time": None,
                "forklift_count": 2,
                "forklift_driver_names": "Forklift A",
                "channel_status": "กำลังโหลด",
                "channel_status_code": "loading",
            },
            {
                "main_name": "ลานจ่าย 1",
                "main_code": "1",
                "slot_name": "ช่อง 2",
                "slot_code": "2",
                "post_location_code": "A2",
                "post_location_name": "ลานจ่าย 1 ช่อง 2",
                "truck_count": 0,
                "car_no": None,
                "truck_seq_no": None,
                "truck_status": None,
                "packlist_status": None,
                "customer_name": None,
                "queue_time": None,
                "picking_time": None,
                "posting_time": None,
                "forklift_count": 0,
                "forklift_driver_names": "-",
                "channel_status": "ว่าง",
                "channel_status_code": "empty",
            },
        ]

        grouped = group_post_locations(rows)

        self.assertEqual(len(grouped), 1)
        self.assertEqual(grouped[0]["main_name"], "ลานจ่าย 1")
        self.assertEqual(grouped[0]["main_code"], "1")
        self.assertEqual(len(grouped[0]["channels"]), 2)
        self.assertEqual(grouped[0]["channels"][0]["car_no"], "70-1234")
        self.assertEqual(grouped[0]["channels"][0]["customer_name"], "Customer A")
        self.assertIsNone(grouped[0]["channels"][1]["car_no"])


class DashboardSnapshotStoreTests(SimpleTestCase):
    def setUp(self):
        dashboard_snapshot_store.reset_dashboard_snapshot_store()

    @patch("api.services.dashboard_snapshot_store.get_dashboard_snapshot_data")
    def test_cached_snapshot_reuses_latest_payload_within_max_age(self, mock_snapshot_builder):
        mock_snapshot_builder.return_value = {"captured_at": "2026-03-06T13:09:43+07:00"}

        first_payload = dashboard_snapshot_store.get_cached_dashboard_snapshot_data(
            plant_code="COM20060001",
            max_age_seconds=30,
        )
        second_payload = dashboard_snapshot_store.get_cached_dashboard_snapshot_data(
            plant_code="COM20060001",
            max_age_seconds=30,
        )

        self.assertEqual(first_payload, second_payload)
        self.assertEqual(mock_snapshot_builder.call_count, 1)

    @patch("api.services.dashboard_snapshot_store.get_dashboard_snapshot_data")
    def test_force_refresh_updates_snapshot_version(self, mock_snapshot_builder):
        mock_snapshot_builder.side_effect = [
            {"captured_at": "2026-03-06T13:09:43+07:00"},
            {"captured_at": "2026-03-06T13:09:48+07:00"},
        ]

        dashboard_snapshot_store.get_cached_dashboard_snapshot_data(
            plant_code="COM20060001",
            force_refresh=True,
        )
        dashboard_snapshot_store.get_cached_dashboard_snapshot_data(
            plant_code="COM20060001",
            force_refresh=True,
        )

        self.assertEqual(mock_snapshot_builder.call_count, 2)
