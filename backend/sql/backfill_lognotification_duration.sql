/* ============================================================================
   Backfill: recompute Duration ของ WMS.dbo.LogNotification จาก timestamp จริง
   ใน OBM_DWMS.dbo.vwTimeStampDashbaord

   Duration = ROUND( (เวลาสิ้นสุด - NotiTime) / 60 )  หน่วยนาที, ต่ำสุด 0
   เวลาสิ้นสุด map ตาม DetailCode:
     1 รอเรียก   -> CarConfirm
     2 รอโหลด    -> FirstPostPallet
     3 โหลด       -> LastPostPallet
     4 รอปิดงาน  -> CheckerClose
     5 รอ Post    -> PostingTime
   ============================================================================ */

USE [WMS];
GO

/* ---------------------------------------------------------------------------
   STEP 1 — PREVIEW: ดูค่าก่อน/หลัง ก่อนแก้จริง (รันส่วนนี้ตรวจสอบก่อน)
   --------------------------------------------------------------------------- */
SELECT
    ln.PackListNo,
    ln.NotiStatus,
    ln.DetailCode,
    ln.NotiTime,
    r.ResolvedTime                              AS ResolvedTime,
    ln.Duration                                 AS Duration_เดิม,
    CASE
        WHEN DATEDIFF(SECOND, ln.NotiTime, r.ResolvedTime) < 0 THEN 0
        ELSE CAST(ROUND(DATEDIFF(SECOND, ln.NotiTime, r.ResolvedTime) / 60.0, 0) AS INT)
    END                                         AS Duration_ใหม่
FROM [WMS].[dbo].[LogNotification] ln
INNER JOIN [OBM_DWMS].[dbo].[vwTimeStampDashbaord] v
        ON v.PackListNo = ln.PackListNo
CROSS APPLY (VALUES (
    CASE ln.DetailCode
        WHEN 1 THEN v.CarConfirm
        WHEN 2 THEN v.FirstPostPallet
        WHEN 3 THEN v.LastPostPallet
        WHEN 4 THEN v.CheckerClose
        WHEN 5 THEN v.PostingTime
    END
)) AS r(ResolvedTime)
WHERE r.ResolvedTime IS NOT NULL
  AND ln.Duration <> CASE
        WHEN DATEDIFF(SECOND, ln.NotiTime, r.ResolvedTime) < 0 THEN 0
        ELSE CAST(ROUND(DATEDIFF(SECOND, ln.NotiTime, r.ResolvedTime) / 60.0, 0) AS INT)
    END
ORDER BY ln.NotiTime;
GO

/* ---------------------------------------------------------------------------
   STEP 2 — UPDATE จริง (รันหลังตรวจ preview แล้วพอใจ)
   ห่อด้วย transaction: ถ้าจำนวนแถวผิดปกติให้ ROLLBACK
   --------------------------------------------------------------------------- */
BEGIN TRANSACTION;

UPDATE ln
SET ln.Duration = CASE
        WHEN DATEDIFF(SECOND, ln.NotiTime, r.ResolvedTime) < 0 THEN 0
        ELSE CAST(ROUND(DATEDIFF(SECOND, ln.NotiTime, r.ResolvedTime) / 60.0, 0) AS INT)
    END
FROM [WMS].[dbo].[LogNotification] ln
INNER JOIN [OBM_DWMS].[dbo].[vwTimeStampDashbaord] v
        ON v.PackListNo = ln.PackListNo
CROSS APPLY (VALUES (
    CASE ln.DetailCode
        WHEN 1 THEN v.CarConfirm
        WHEN 2 THEN v.FirstPostPallet
        WHEN 3 THEN v.LastPostPallet
        WHEN 4 THEN v.CheckerClose
        WHEN 5 THEN v.PostingTime
    END
)) AS r(ResolvedTime)
WHERE r.ResolvedTime IS NOT NULL;

PRINT CONCAT('Rows updated: ', @@ROWCOUNT);

-- ตรวจจำนวนแถวแล้วเลือกอย่างใดอย่างหนึ่ง:
-- COMMIT TRANSACTION;
-- ROLLBACK TRANSACTION;
GO
