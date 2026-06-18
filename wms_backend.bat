timeout /t 1 /nobreak >nul
d:
cd d:\wms\backend
 python -m daphne -b 0.0.0.0 -p 3004 backend.asgi:application



