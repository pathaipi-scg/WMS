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
