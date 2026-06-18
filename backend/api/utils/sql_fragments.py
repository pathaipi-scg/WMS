# Reusable SQL fragments shared across service queries.
# These are hardcoded Python constants — never interpolate user input here.

EFFECTIVE_DATE_CASE = """
        CASE
            WHEN PickListType = 'Walk-in' THEN PickDate
            WHEN PickListType = 'SmartQ' AND OperatorCarConfirm IS NULL THEN QueueTime
            WHEN PickListType = 'SmartQ' AND OperatorCarConfirm IS NOT NULL THEN OperatorCarConfirm
        END"""

# Variant used in post_locations where the view is aliased as "v".
EFFECTIVE_DATE_CASE_V = """
                    CASE
                        WHEN v.OperatorCarConfirm IS NOT NULL THEN v.OperatorCarConfirm
                        WHEN v.PickListType = 'Walk-in' THEN v.PickDate
                        WHEN v.PickListType = 'SmartQ' THEN v.QueueTime
                        ELSE NULL
                    END"""

ACTIVE_PACK_STATUSES = """'CHECKERASSIGN',
                    'CHECKERCOMPENSATE',
                    'CHECKERCOMPLETED',
                    'WAITCHECKER'"""

PACK_STATUS_OPERATOR_COMPLETED = "'OPERATORCOMPLETED'"
PACK_STATUS_CHECKER_COMPLETED = "'CHECKERCOMPLETED'"

# Maps PickListType/PrepareForward → Thai queue-type display label.
# Mirrors _resolve_pick_list_label / _PICK_LIST_ENCODE in services/prediction.py.
# (Note: analytics_queue_distribution uses a deliberately different ELSE → N'อื่นๆ'.)
QUEUE_TYPE_CASE = """CASE
            WHEN LTRIM(RTRIM(PickListType)) = 'SmartQ' THEN N'SmartQ'
            WHEN LTRIM(RTRIM(PickListType)) = 'Walk-in' AND ISNULL(PrepareForward, 'N') = 'N' THEN N'Walk in'
            WHEN LTRIM(RTRIM(PickListType)) = 'Walk-in' AND PrepareForward = 'Y' THEN N'ล่วงหน้า'
            ELSE N'-'
        END"""

# Maps CarType id → Thai truck-type label.
# Mirrors _CAR_TYPE_LABEL in services/prediction.py — keep both in sync.
TRUCK_TYPE_CASE = """
    CASE CarType
        WHEN 4            THEN N'4 ล้อ'
        WHEN 1000000008   THEN N'4 ล้อ'
        WHEN 6            THEN N'6 ล้อ'
        WHEN 1000000003   THEN N'6 ล้อ'
        WHEN 10           THEN N'10 ล้อ'
        WHEN 1000000000   THEN N'10 ล้อ'
        WHEN 1000000004   THEN N'10 ล้อ'
        WHEN 18           THEN N'เทรเลอร์'
        WHEN 22           THEN N'เทรเลอร์'
        WHEN 1000000001   THEN N'เทรเลอร์'
        WHEN 1000000002   THEN N'เทรเลอร์'
        WHEN 1000000005   THEN N'เทรเลอร์'
        WHEN 1000000006   THEN N'เทรเลอร์'
        WHEN 1000000007   THEN N'เทรเลอร์'
        WHEN 1000000009   THEN N'เทรเลอร์'
        ELSE              N'อื่นๆ'
    END
"""
