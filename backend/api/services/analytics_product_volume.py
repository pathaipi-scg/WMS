from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts
from ..utils.sql_fragments import PACK_STATUS_OPERATOR_COMPLETED

# ชื่อ column แต่ละแบรนด์ — ใช้สร้าง key scgr_*/others_* ทั้งใน SQL และ Python
BRAND_COLS = [
    'cpac_tile', 'prestige_tile', 'neustile_tile',
    'cpac_fitting', 'prestige_fitting', 'neustile_fitting',
    'dura_fitting', 'accessories',
]


def get_product_volume_data(preset: str = 'today', date_from: str = None, date_to: str = None):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)

    # CTE จำแนก is_scgr ครั้งเดียวต่อแถว และแปลง ISNULL ไว้ในชั้นใน
    # ผลลัพธ์: is_scgr = 1 → งานโอน (CustomerName มี SCGR)
    #           is_scgr = 0 → งานขาย (รวม NULL CustomerName ถือเป็น non-SCGR)
    rows = fetch_all_dicts(f"""
        ;WITH base AS (
            SELECT
                CAST(PostingTime AS DATE)                                         AS period_date,
                CASE WHEN CHARINDEX('SCGR', CustomerName) > 0 THEN 1 ELSE 0 END AS is_scgr,
                ISNULL(CPACTileSapAmount, 0)        AS cpac_tile,
                ISNULL(PRESTIGETileSapAmount, 0)    AS prestige_tile,
                ISNULL(NEUSTILETileSapAmount, 0)    AS neustile_tile,
                ISNULL(CPACFittingSapAmount, 0)     AS cpac_fitting,
                ISNULL(PRESTIGEFittingSapAmount, 0) AS prestige_fitting,
                ISNULL(NEUSTILEFittingSapAmount, 0) AS neustile_fitting,
                ISNULL(DURAFittingSapAmount, 0)     AS dura_fitting,
                ISNULL(ACCESSORIESSapAmount, 0)     AS accessories
            FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
            WHERE PlantName = %s
              AND PostingTime >= %s
              AND PostingTime <= %s
              AND PostingTime IS NOT NULL
              AND PackListStatus = {PACK_STATUS_OPERATOR_COMPLETED}
        )
        SELECT
            period_date,
            SUM(CASE WHEN is_scgr = 1 THEN cpac_tile        ELSE 0 END) AS scgr_cpac_tile,
            SUM(CASE WHEN is_scgr = 1 THEN prestige_tile    ELSE 0 END) AS scgr_prestige_tile,
            SUM(CASE WHEN is_scgr = 1 THEN neustile_tile    ELSE 0 END) AS scgr_neustile_tile,
            SUM(CASE WHEN is_scgr = 1 THEN cpac_fitting     ELSE 0 END) AS scgr_cpac_fitting,
            SUM(CASE WHEN is_scgr = 1 THEN prestige_fitting ELSE 0 END) AS scgr_prestige_fitting,
            SUM(CASE WHEN is_scgr = 1 THEN neustile_fitting ELSE 0 END) AS scgr_neustile_fitting,
            SUM(CASE WHEN is_scgr = 1 THEN dura_fitting     ELSE 0 END) AS scgr_dura_fitting,
            SUM(CASE WHEN is_scgr = 1 THEN accessories      ELSE 0 END) AS scgr_accessories,
            SUM(CASE WHEN is_scgr = 0 THEN cpac_tile        ELSE 0 END) AS others_cpac_tile,
            SUM(CASE WHEN is_scgr = 0 THEN prestige_tile    ELSE 0 END) AS others_prestige_tile,
            SUM(CASE WHEN is_scgr = 0 THEN neustile_tile    ELSE 0 END) AS others_neustile_tile,
            SUM(CASE WHEN is_scgr = 0 THEN cpac_fitting     ELSE 0 END) AS others_cpac_fitting,
            SUM(CASE WHEN is_scgr = 0 THEN prestige_fitting ELSE 0 END) AS others_prestige_fitting,
            SUM(CASE WHEN is_scgr = 0 THEN neustile_fitting ELSE 0 END) AS others_neustile_fitting,
            SUM(CASE WHEN is_scgr = 0 THEN dura_fitting     ELSE 0 END) AS others_dura_fitting,
            SUM(CASE WHEN is_scgr = 0 THEN accessories      ELSE 0 END) AS others_accessories
        FROM base
        GROUP BY period_date
        ORDER BY period_date ASC
    """, [PLANT_NAME, start_dt, end_dt])

    data = [
        {
            "period": str(row["period_date"]),
            **{f"scgr_{col}":   int(row[f"scgr_{col}"] or 0) for col in BRAND_COLS},
            **{f"others_{col}": int(row[f"others_{col}"] or 0) for col in BRAND_COLS},
        }
        for row in rows
    ]

    return {"preset": preset, "data": data}
