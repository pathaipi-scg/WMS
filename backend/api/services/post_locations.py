from collections import OrderedDict

from ..constants import DEFAULT_FORKLIFT_ACTIVE_MINUTES, PLANT_CODE, PLANT_NAME
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import ACTIVE_PACK_STATUSES, EFFECTIVE_DATE_CASE_V


def _build_channel_payload(row):
    return {
        "slot_name": row["slot_name"],
        "slot_code": row["slot_code"],
        "post_location_code": row["post_location_code"],
        "post_location_name": row["post_location_name"],
        "truck_count": row["truck_count"],
        "car_no": row["car_no"],
        "truck_seq_no": row["truck_seq_no"],
        "truck_status": row["truck_status"],
        "packlist_status": row["packlist_status"],
        "customer_name": row["customer_name"],
        "queue_time": row["queue_time"],
        "picking_time": row["picking_time"],
        "posting_time": row["posting_time"],
        "first_post_pallet": row.get("first_post_pallet"),
        "last_post_pallet": row.get("last_post_pallet"),
        "forklift_count": row["forklift_count"],
        "forklift_driver_names": row["forklift_driver_names"],
        "last_forklift_activity_time": row.get("last_forklift_activity_time"),
        "channel_status": row["channel_status"],
        "channel_status_code": row["channel_status_code"],
        "waiting_time": row.get("waiting_time", 0),
    }


def group_post_locations(rows):
    yards_map = OrderedDict()

    for row in rows:
        yard_key = (row["main_code"], row["main_name"])

        if yard_key not in yards_map:
            yards_map[yard_key] = {
                "main_name": row["main_name"],
                "main_code": row["main_code"],
                "channels": [],
            }

        yards_map[yard_key]["channels"].append(_build_channel_payload(row))

    return list(yards_map.values())


def get_post_locations_rows(plant_code=PLANT_CODE, active_minutes=DEFAULT_FORKLIFT_ACTIVE_MINUTES):
    sql = f"""
        ;WITH TruckCandidate AS
        (
            SELECT
                pl.Code AS PostLocationCode,
                pl.LongName AS PostLocationName,

                v.CarNo,
                v.TruckSeqNo,
                v.TruckStatus,
                v.PackListStatus,
                v.CustomerName,
                v.QueueTime,
                v.PickingTime,
                v.PostingTime,
                v.FirstPostPallet,
                v.LastPostPallet,
                v.CarConfirm,
                v.PickListType,
                v.PrepareForward,
                v.PickDate,
                v.OperatorCarConfirm,

                CASE
                    WHEN v.OperatorCarConfirm IS NOT NULL THEN CAST(v.OperatorCarConfirm AS DATETIME)
                    WHEN v.PickListType = 'Walk-in' THEN CAST(v.PickDate AS DATETIME)
                    WHEN v.PickListType = 'SmartQ' THEN CAST(v.QueueTime AS DATETIME)
                    ELSE NULL
                END AS BaseWaitingTime,

                ROW_NUMBER() OVER
                (
                    PARTITION BY pl.Code
                    ORDER BY
                        CASE WHEN v.CarConfirm IS NULL THEN 1 ELSE 0 END,
                        v.CarConfirm ASC,
                        CASE WHEN v.QueueTime IS NULL THEN 1 ELSE 0 END,
                        v.QueueTime ASC,
                        v.TruckSeqNo ASC
                ) AS rn
            FROM [OBM_DWMS].[dbo].[PostLocations] pl
            LEFT JOIN [OBM_DWMS].[dbo].[vwTimeStampDashbaord] v
                ON v.PostLocationName = pl.LongName
                AND v.CarNo IS NOT NULL
                AND v.PackListStatus IN (
                    {ACTIVE_PACK_STATUSES}
                )
                AND ({EFFECTIVE_DATE_CASE_V}) >= CAST(GETDATE() AS DATE)
                AND ({EFFECTIVE_DATE_CASE_V}) < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
            WHERE pl.PlantCode = %s
        ),

        TruckCountByChannel AS
        (
            SELECT
                PostLocationCode,
                COUNT(CarNo) AS TruckCount
            FROM TruckCandidate
            GROUP BY PostLocationCode
        ),

        TruckInChannel AS
        (
            SELECT
                tc.PostLocationCode,
                tc.PostLocationName,
                ISNULL(tcb.TruckCount, 0) AS TruckCount,

                tc.CarNo,
                tc.TruckSeqNo,
                tc.TruckStatus,
                tc.PackListStatus,
                tc.CustomerName,
                tc.QueueTime,
                tc.PickingTime,
                tc.PostingTime,
                tc.FirstPostPallet,
                tc.LastPostPallet,
                tc.BaseWaitingTime,

                CASE
                    WHEN tc.BaseWaitingTime IS NULL THEN 0
                    ELSE DATEDIFF(MINUTE, tc.BaseWaitingTime, GETDATE())
                END AS waiting_time
            FROM TruckCandidate tc
            LEFT JOIN TruckCountByChannel tcb
                ON tcb.PostLocationCode = tc.PostLocationCode
            WHERE tc.rn = 1
        ),

        ForkliftRaw AS
        (
            SELECT
                p.ToLocationCode,
                p.UserCreateCode,
                p.UserCreate,
                p.StampDateTime,
                ROW_NUMBER() OVER (
                    PARTITION BY p.UserCreate
                    ORDER BY p.StampDateTime DESC
                ) AS rn
            FROM [OBM_DWMS].[dbo].[PalletLogs_Today] p
            INNER JOIN [OBM_DWMS].[dbo].[PostLocations] pl2
                ON pl2.Code = p.ToLocationCode
                AND pl2.PlantCode = %s
            WHERE p.StampDateTime >= DATEADD(MINUTE, -%s, GETDATE())
            AND p.ToLocationCode IS NOT NULL
            AND p.UserCreate IS NOT NULL
        ),

        ForkliftInChannel AS
        (
            SELECT
                fr.ToLocationCode AS PostLocationCode,
                COUNT(*) AS ForkliftCount,
                STRING_AGG(fr.UserCreate, ', ') AS ForkliftDriverNames,
                MAX(fr.StampDateTime) AS LastForkliftActivityTime
            FROM ForkliftRaw fr
            WHERE fr.rn = 1
            GROUP BY fr.ToLocationCode
        )

        SELECT
            pl.PlantCode AS plant_code,
            pl.MainCode AS main_code,
            pl.MainName AS main_name,
            pl.SlotCode AS slot_code,
            pl.SlotName AS slot_name,
            pl.Code AS post_location_code,
            pl.LongName AS post_location_name,

            ISNULL(tc.TruckCount, 0) AS truck_count,
            tc.CarNo AS car_no,
            tc.TruckSeqNo AS truck_seq_no,
            tc.TruckStatus AS truck_status,
            tc.PackListStatus AS packlist_status,
            tc.CustomerName AS customer_name,
            tc.QueueTime AS queue_time,
            tc.PickingTime AS picking_time,
            tc.PostingTime AS posting_time,
            tc.FirstPostPallet AS first_post_pallet,
            tc.LastPostPallet AS last_post_pallet,
            ISNULL(tc.waiting_time, 0) AS waiting_time,

            ISNULL(fc.ForkliftCount, 0) AS forklift_count,
            ISNULL(fc.ForkliftDriverNames, '-') AS forklift_driver_names,
            fc.LastForkliftActivityTime AS last_forklift_activity_time,

            CASE
                WHEN ISNULL(tc.TruckCount, 0) = 0 THEN N'ว่าง'
                ELSE N'กำลังโหลด'
            END AS channel_status,

            CASE
                WHEN ISNULL(tc.TruckCount, 0) = 0 THEN N'empty'
                ELSE N'loading'
            END AS channel_status_code

        FROM [OBM_DWMS].[dbo].[PostLocations] pl
        LEFT JOIN TruckInChannel tc
            ON tc.PostLocationCode = pl.Code
        LEFT JOIN ForkliftInChannel fc
            ON fc.PostLocationCode = pl.Code
        WHERE pl.PlantCode = %s
        ORDER BY pl.MainCode, pl.SlotCode
    """
    return fetch_all_dicts(sql, [plant_code, plant_code, active_minutes, plant_code])


def get_post_locations_response_data(plant_code=PLANT_CODE):
    rows = get_post_locations_rows(plant_code=plant_code)

    return {
        "success": True,
        "plant_code": plant_code,
        "plant_name": PLANT_NAME,
        "yards": group_post_locations(rows),
    }
