from ..constants import PLANT_NAME
from ..utils.date_ranges import get_today_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import ACTIVE_PACK_STATUSES, EFFECTIVE_DATE_CASE

_TRUCK_QUEUES_SQL = f"""
    SELECT
        TruckSeqNo AS sequence,
        TruckSeqNo AS truckSeqNo,
        CarNo AS licensePlate,
        CASE
            WHEN LTRIM(RTRIM(PickListType)) = 'SmartQ' THEN N'SmartQ'
            WHEN LTRIM(RTRIM(PickListType)) = 'Walk-in' AND ISNULL(PrepareForward, 'N') = 'N' THEN N'Walk in'
            WHEN LTRIM(RTRIM(PickListType)) = 'Walk-in' AND PrepareForward = 'Y' THEN N'ล่วงหน้า'
            ELSE N'-'
        END AS queueType,
        LTRIM(RTRIM(PickListType)) AS rawPickListType,
        ISNULL(PrepareForward, 'N') AS rawPrepareForward,
        CarType AS rawCarType,
        CustomerName AS customer_name,
        PostLocationName AS post_location_name,
        CASE
            WHEN OperatorCarConfirm IS NULL THEN 0
            ELSE DATEDIFF(MINUTE, CAST(OperatorCarConfirm AS DATETIME), GETDATE())
        END AS waitingTime,
        ISNULL(CPACTileSapAmount, 0) AS cpac,
        ISNULL(PRESTIGETileSapAmount, 0) AS prestige,
        ISNULL(NEUSTILETileSapAmount, 0) AS neustile,
        ISNULL(CPACFittingSapAmount, 0)
        + ISNULL(PRESTIGEFittingSapAmount, 0)
        + ISNULL(NEUSTILEFittingSapAmount, 0)
        + ISNULL(DURAFittingSapAmount, 0) AS fitting,
        ISNULL(ACCESSORIESSapAmount, 0) AS accessories,
        ISNULL(CPACTileSapAmount, 0) AS CPACTileSapAmount,
        ISNULL(PRESTIGETileSapAmount, 0) AS PRESTIGETileSapAmount,
        ISNULL(NEUSTILETileSapAmount, 0) AS NEUSTILETileSapAmount,
        ISNULL(CPACFittingSapAmount, 0) AS CPACFittingSapAmount,
        ISNULL(PRESTIGEFittingSapAmount, 0) AS PRESTIGEFittingSapAmount,
        ISNULL(NEUSTILEFittingSapAmount, 0) AS NEUSTILEFittingSapAmount,
        ISNULL(DURAFittingSapAmount, 0) AS DURAFittingSapAmount,
        ISNULL(ACCESSORIESSapAmount, 0) AS ACCESSORIESSapAmount,
        PackListNo AS packListNo,
        (
            SELECT ISNULL(COUNT(*), 0)
            FROM [OBM_DWMS].[dbo].[ForkPostPallets] fpp
            WHERE fpp.PackListNo = vtd.PackListNo
        ) AS loadedPalletCount,
        (
            SELECT ISNULL(SUM(opm.NPallet), 0)
            FROM [OBM_DWMS].[dbo].[OperatorPackMatLists] opm
            WHERE opm.PackListNo = vtd.PackListNo
            AND opm.PackSize <> 1
        ) + (
            SELECT ISNULL(COUNT(*), 0)
            FROM [OBM_DWMS].[dbo].[CheckerRemainPallets] crp
            WHERE crp.PackListNo = vtd.PackListNo
        ) AS totalPalletCount,
        TruckStatus AS rawTruckStatus,
        CASE
            WHEN TruckStatus = 'Loading' THEN N'กำลังโหลด'
            WHEN TruckStatus = 'Waiting' THEN N'รอคิว'
            ELSE TruckStatus
        END AS status,
        OperatorCarConfirm AS arrivalDate,
        CarConfirm AS callDate,
        FirstPostPallet AS startDate,
        CASE
            WHEN PackListStatus = 'CHECKERCOMPLETED' THEN LastPostPallet
            ELSE NULL
        END AS completedDate,
        CASE
            WHEN PackListStatus = 'OPERATORCOMPLETED' THEN PostingTime
            ELSE NULL
        END AS exitDate,
        PackListStatus AS packListStatus,
        OperatorCarConfirm AS operatorCarConfirm,
        CarConfirm AS carConfirm,
        FirstPostPallet AS firstPallet,
        LastPostPallet AS lastPostPallet,
        PostingTime AS postingTime,

        CASE
            WHEN ISNULL(CPACTileSapAmount, 0) = 0
            AND ISNULL(PRESTIGETileSapAmount, 0) = 0
            AND ISNULL(NEUSTILETileSapAmount, 0) = 0
                THEN N'ไม่มีรับ'
            WHEN CPACTileSapAmount IS NOT NULL
            AND PRESTIGETileSapAmount IS NOT NULL
            AND NEUSTILETileSapAmount IS NOT NULL
            AND TileStart IS NULL
            AND TileEnd IS NULL
                THEN N'ยังไม่เริ่ม'
            WHEN CPACTileSapAmount IS NOT NULL
            AND PRESTIGETileSapAmount IS NOT NULL
            AND NEUSTILETileSapAmount IS NOT NULL
            AND TileStart IS NOT NULL
            AND TileEnd IS NULL
                THEN N'เริ่มจัด'
            WHEN CPACTileSapAmount IS NOT NULL
            AND PRESTIGETileSapAmount IS NOT NULL
            AND NEUSTILETileSapAmount IS NOT NULL
            AND TileStart IS NOT NULL
            AND TileEnd IS NOT NULL
                THEN N'เสร็จแล้ว'
            ELSE N'ไม่มีรับ'
        END AS tileStatus,

        CASE
            WHEN ISNULL(CPACFittingSapAmount, 0) = 0
            AND ISNULL(PRESTIGEFittingSapAmount, 0) = 0
            AND ISNULL(NEUSTILEFittingSapAmount, 0) = 0
            AND ISNULL(DURAFittingSapAmount, 0) = 0
                THEN N'ไม่มีรับ'
            WHEN CPACFittingSapAmount IS NOT NULL
            AND PRESTIGEFittingSapAmount IS NOT NULL
            AND NEUSTILEFittingSapAmount IS NOT NULL
            AND DURAFittingSapAmount IS NOT NULL
            AND FittingStart IS NULL
            AND FittingEnd IS NULL
                THEN N'ยังไม่เริ่ม'
            WHEN CPACFittingSapAmount IS NOT NULL
            AND PRESTIGEFittingSapAmount IS NOT NULL
            AND NEUSTILEFittingSapAmount IS NOT NULL
            AND DURAFittingSapAmount IS NOT NULL
            AND FittingStart IS NOT NULL
            AND FittingEnd IS NULL
                THEN N'เริ่มจัด'
            WHEN CPACFittingSapAmount IS NOT NULL
            AND PRESTIGEFittingSapAmount IS NOT NULL
            AND NEUSTILEFittingSapAmount IS NOT NULL
            AND DURAFittingSapAmount IS NOT NULL
            AND FittingStart IS NOT NULL
            AND FittingEnd IS NOT NULL
                THEN N'เสร็จแล้ว'
            ELSE N'ไม่มีรับ'
        END AS fittingStatus,

        CASE
            WHEN ISNULL(ACCESSORIESSapAmount, 0) = 0
                THEN N'ไม่มีรับ'
            WHEN AccStart IS NULL AND AccEnd IS NULL
                THEN N'ยังไม่เริ่ม'
            WHEN AccStart IS NOT NULL AND AccEnd IS NULL
                THEN N'เริ่มจัด'
            WHEN AccStart IS NOT NULL AND AccEnd IS NOT NULL
                THEN N'เสร็จแล้ว'
            ELSE N'ไม่มีรับ'
        END AS accStatus

    FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord] vtd
    WHERE PlantName = %s
    AND PackListStatus IN (
            {ACTIVE_PACK_STATUSES}
    )
    AND ({EFFECTIVE_DATE_CASE}) >= %s
    AND ({EFFECTIVE_DATE_CASE}) <= %s
    ORDER BY TruckSeqNo DESC;
"""


def get_truck_queues_data():
    start_dt, end_dt = get_today_range()
    return fetch_all_dicts(_TRUCK_QUEUES_SQL, [PLANT_NAME, start_dt, end_dt])
