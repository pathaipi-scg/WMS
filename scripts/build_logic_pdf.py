"""สร้าง LOGIC.pdf จาก LOGIC.md (รองรับฟอนต์ไทย)

วิธีรัน:  python scripts/build_logic_pdf.py

ขั้นตอน: Markdown -> HTML (มี CSS ฟอนต์ไทย) -> พิมพ์เป็น PDF ผ่าน Edge/Chrome headless
ต้องมี: pip install markdown  และ Microsoft Edge หรือ Google Chrome
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile

import markdown

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD_PATH = os.path.join(ROOT, "LOGIC.md")
PDF_PATH = os.path.join(ROOT, "LOGIC.pdf")

CSS = """
@page { size: A4; margin: 18mm 16mm; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: "Leelawadee UI", "Tahoma", "TH Sarabun New", "Segoe UI", sans-serif;
  font-size: 13px; line-height: 1.65; color: #1f2937; max-width: 100%;
}
h1 { font-size: 26px; border-bottom: 3px solid #2563eb; padding-bottom: 8px; color: #1e3a8a; }
h2 { font-size: 20px; margin-top: 28px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; color: #1e40af; }
h3 { font-size: 16px; margin-top: 20px; color: #1d4ed8; }
h2, h3 { page-break-after: avoid; }
blockquote { border-left: 4px solid #60a5fa; background: #eff6ff; margin: 12px 0; padding: 8px 14px; color: #1e3a8a; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; page-break-inside: avoid; }
th, td { border: 1px solid #cbd5e1; padding: 6px 9px; text-align: left; vertical-align: top; }
th { background: #4b5563; color: #fff; }
tr:nth-child(even) td { background: #f3f4f6; }
code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-family: "Consolas", monospace; font-size: 12px; color: #1e40af; }
pre { background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 8px; overflow-x: auto; page-break-inside: avoid; }
pre code { background: none; color: #e2e8f0; padding: 0; }
a { color: #2563eb; text-decoration: none; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
"""


def find_browser() -> str | None:
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    return next((p for p in candidates if os.path.exists(p)), None)


def main() -> int:
    with open(MD_PATH, encoding="utf-8") as f:
        md_text = f.read()

    html_body = markdown.markdown(
        md_text, extensions=["tables", "fenced_code", "toc", "sane_lists"]
    )
    html = (
        '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">'
        f"<style>{CSS}</style></head><body>{html_body}</body></html>"
    )

    tmp_html = os.path.join(tempfile.gettempdir(), "wms_logic.html")
    with open(tmp_html, "w", encoding="utf-8") as f:
        f.write(html)

    browser = find_browser()
    if not browser:
        print("ไม่พบ Edge/Chrome — เปิดไฟล์ HTML นี้แล้ว Print to PDF เองได้:", tmp_html)
        return 1

    if os.path.exists(PDF_PATH):
        os.remove(PDF_PATH)

    subprocess.run(
        [
            browser, "--headless", "--disable-gpu", "--no-pdf-header-footer",
            f"--print-to-pdf={PDF_PATH}", "file:///" + tmp_html.replace("\\", "/"),
        ],
        check=True,
        timeout=120,
    )

    if os.path.exists(PDF_PATH):
        size_kb = os.path.getsize(PDF_PATH) / 1024
        print(f"สร้างสำเร็จ: {PDF_PATH} ({size_kb:.0f} KB)")
        return 0
    print("สร้าง PDF ไม่สำเร็จ")
    return 1


if __name__ == "__main__":
    sys.exit(main())
