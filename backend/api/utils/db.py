from django.db import connection


def fetch_scalar(sql, params=None, default=0):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        row = cursor.fetchone()

    return row[0] if row and row[0] is not None else default


def fetch_all_dicts(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()

    return [dict(zip(columns, row)) for row in rows]
