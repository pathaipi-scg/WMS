timeout /t 1 /nobreak >nul
d:
cd d:\wms\backend
 venv\Scripts\activate
 python -m daphne -b 0.0.0.0 -p 3005 backend.asgi:application



