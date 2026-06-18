"""Shared connection helper for the notification/prediction log database ([WMS]).

Both notification_logger and prediction_logger write to DATABASES['log']
via pyodbc. Keep the connection-string construction in one place.
"""

from __future__ import annotations

import pyodbc


def get_log_db_connection() -> pyodbc.Connection:
    """Open a pyodbc connection to the log database (DATABASES['log'])."""
    from django.conf import settings

    db = settings.DATABASES["log"]
    opts = db.get("OPTIONS", {})
    conn_str = (
        f"DRIVER={{{opts.get('driver', 'ODBC Driver 17 for SQL Server')}}};"
        f"SERVER={db['HOST']},{db['PORT']};"
        f"DATABASE={db['NAME']};"
        f"UID={db['USER']};"
        f"PWD={db['PASSWORD']};"
        f"TrustServerCertificate={opts.get('TrustServerCertificate', 'yes')};"
    )
    return pyodbc.connect(conn_str, timeout=5)
