from ..constants import PLANT_NAME
from ..utils.date_ranges import get_date_range
from ..utils.db import fetch_all_dicts


def get_product_volume_data(preset: str = 'today', date_from: str = None, date_to: str = None):
    start_dt, end_dt = get_date_range(preset, date_from, date_to)
    params = [PLANT_NAME, start_dt, end_dt]

    rows = fetch_all_dicts("""
        SELECT
            CAST(PostingTime AS DATE) AS period_date,
            SUM(ISNULL(CPACTileSapAmount, 0) + ISNULL(CPACFittingSapAmount, 0))         AS cpac,
            SUM(ISNULL(PRESTIGETileSapAmount, 0) + ISNULL(PRESTIGEFittingSapAmount, 0)) AS prestige,
            SUM(ISNULL(NEUSTILETileSapAmount, 0) + ISNULL(NEUSTILEFittingSapAmount, 0)) AS neustile,
            SUM(ISNULL(DURAFittingSapAmount, 0))                                         AS dura,
            SUM(ISNULL(ACCESSORIESSapAmount, 0))                                         AS accessories
        FROM [OBM_DWMS].[dbo].[vwTimeStampDashbaord]
        WHERE PlantName = %s
          AND PostingTime >= %s
          AND PostingTime <= %s
          AND PostingTime IS NOT NULL
          AND PackListStatus = 'OPERATORCOMPLETED'
        GROUP BY CAST(PostingTime AS DATE)
        ORDER BY period_date ASC
    """, params)

    data = [
        {
            "period":      str(row["period_date"]),
            "cpac":        int(row["cpac"]),
            "prestige":    int(row["prestige"]),
            "neustile":    int(row["neustile"]),
            "dura":        int(row["dura"]),
            "accessories": int(row["accessories"]),
        }
        for row in rows
    ]

    return {
        "preset": preset,
        "data":   data,
    }
