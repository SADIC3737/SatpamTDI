"""
fetch_timesheet.py — Generic Timesheet Fetcher
PT TwinK Digital Indonesia

Usage:
    python fetch_timesheet.py --year 2026 --month 5
    python fetch_timesheet.py --year 2026 --month 5 --out ../data/may2026_data.json

Output: JSON file di folder data/ (default: data/{month_slug}_data.json)
"""

import argparse
import calendar
import datetime
import json
import os
import sys
from collections import defaultdict

# ── KONFIGURASI (baca dari config.json) ─────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_cfg        = json.load(open(os.path.join(BASE_DIR, 'config.json'), encoding='utf-8'))
SPREADSHEET_ID = _cfg['google_sheets']['spreadsheet_id']
KEY_FILE       = _cfg['google_sheets']['service_account_key']
SHEET_RANGE    = _cfg['google_sheets']['range']
DATA_DIR       = os.path.join(BASE_DIR, _cfg['output']['data_dir'])

# ── HARI LIBUR NASIONAL INDONESIA (lengkap, tambahkan setiap tahun) ──────────
# Format: "YYYY-MM-DD": "Nama Libur"
INDONESIA_HOLIDAYS = {
    # 2026 — RESMI (sumber: Pak Bos Setiawan, 9 Mei 2026)
    "2026-01-01": "Tahun Baru 2026 Masehi",
    "2026-01-16": "Isra Mi'raj Nabi Muhammad SAW",
    "2026-02-16": "Cuti Bersama Tahun Baru Imlek 2577 Kongzili",
    "2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
    "2026-03-18": "Cuti Bersama Hari Suci Nyepi (Tahun Baru Saka 1948)",
    "2026-03-19": "Hari Suci Nyepi (Tahun Baru Saka 1948)",
    "2026-03-20": "Cuti Bersama Idul Fitri 1447 Hijriah",
    "2026-03-21": "Hari Raya Idul Fitri 1447 Hijriah",
    "2026-03-22": "Hari Raya Idul Fitri 1447 Hijriah (hari ke-2)",
    "2026-03-23": "Cuti Bersama Idul Fitri 1447 Hijriah",
    "2026-03-24": "Cuti Bersama Idul Fitri 1447 Hijriah",
    "2026-04-03": "Wafat Yesus Kristus",
    "2026-04-05": "Hari Kebangkitan Yesus Kristus (Paskah)",
    "2026-05-01": "Hari Buruh Internasional",
    "2026-05-14": "Kenaikan Yesus Kristus",
    "2026-05-15": "Cuti Bersama Kenaikan Yesus Kristus",
    "2026-05-27": "Idul Adha 1447 Hijriah",
    "2026-05-28": "Cuti Bersama Idul Adha 1447 Hijriah",
    "2026-05-31": "Hari Raya Waisak 2570 BE",
    "2026-06-01": "Hari Lahir Pancasila",
    "2026-06-16": "Tahun Baru Islam 1448 Hijriah",
    "2026-08-17": "Hari Kemerdekaan Republik Indonesia",
    "2026-08-25": "Maulid Nabi Muhammad SAW",
    "2026-12-24": "Cuti Bersama Hari Raya Natal",
    "2026-12-25": "Hari Raya Natal",
    # 2025 (untuk referensi)
    "2025-01-01": "Tahun Baru Masehi",
    "2025-01-29": "Tahun Baru Imlek 2576",
    "2025-03-29": "Hari Raya Nyepi Saka 1947",
    "2025-03-31": "Hari Raya Idulfitri 1446 H",
    "2025-04-01": "Cuti Bersama Idulfitri",
    "2025-04-18": "Jumat Agung",
    "2025-05-01": "Hari Buruh Internasional",
    "2025-05-12": "Hari Raya Waisak",
    "2025-05-29": "Kenaikan Isa Almasih",
    "2025-06-01": "Hari Lahir Pancasila",
    "2025-06-06": "Iduladha 1446 H",
    "2025-06-27": "Tahun Baru Islam 1447 H",
    "2025-08-17": "Hari Kemerdekaan RI",
    "2025-09-05": "Maulid Nabi Muhammad SAW",
    "2025-12-25": "Hari Raya Natal",
    "2025-12-26": "Cuti Bersama Natal",
}

MONTH_NAMES = {
    1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',
    7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'
}

def parse_args():
    p = argparse.ArgumentParser(description='Fetch timesheet data from Google Sheets')
    p.add_argument('--year',  type=int, required=True, help='Tahun (contoh: 2026)')
    p.add_argument('--month', type=int, required=True, help='Bulan 1-12 (contoh: 5 untuk Mei)')
    p.add_argument('--out',   type=str, default=None,  help='Path output JSON (opsional)')
    return p.parse_args()

def get_month_meta(year, month):
    """Hitung hari kerja, libur, sabtu, minggu untuk bulan/tahun tertentu."""
    num_days = calendar.monthrange(year, month)[1]
    holiday_dates = {}
    for date_str, name in INDONESIA_HOLIDAYS.items():
        dt = datetime.date.fromisoformat(date_str)
        if dt.year == year and dt.month == month:
            holiday_dates[dt.day] = name

    saturdays, sundays, working_days = [], [], []
    for day in range(1, num_days + 1):
        dt = datetime.date(year, month, day)
        if day in holiday_dates and dt.weekday() < 5:
            continue  # libur weekday
        if dt.weekday() == 5:
            saturdays.append(day)
        elif dt.weekday() == 6:
            sundays.append(day)
        else:
            working_days.append(day)

    return working_days, saturdays, sundays, holiday_dates

def fetch_from_sheets(year, month):
    """Ambil data dari Google Sheets via Service Account."""
    try:
        import google.auth
        from googleapiclient.discovery import build
    except ImportError:
        print("ERROR: Install library dulu: pip install google-auth google-api-python-client")
        sys.exit(1)

    creds, _ = google.auth.load_credentials_from_file(
        KEY_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
    service = build('sheets', 'v4', credentials=creds)
    result  = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID, range=SHEET_RANGE).execute()
    rows    = result.get('values', [])
    headers = rows[0]
    data    = rows[1:]

    records = []
    for row in data:
        if len(row) < 7:
            continue
        name     = row[1].strip() if len(row) > 1 else ''
        date_str = row[2].strip() if len(row) > 2 else ''
        category = row[3].strip() if len(row) > 3 else ''
        project  = row[4].strip() if len(row) > 4 else ''
        task     = row[5].strip() if len(row) > 5 else ''
        time_str = row[6].strip() if len(row) > 6 else '0'
        notes    = row[7].strip() if len(row) > 7 else ''

        if not date_str or not name:
            continue
        parts = date_str.split('/')
        if len(parts) != 3:
            continue
        try:
            m, d, y = int(parts[0]), int(parts[1]), int(parts[2])
        except ValueError:
            continue

        if y == year and m == month:
            try:
                time_val = float(time_str)
            except ValueError:
                time_val = 0.0
            records.append({
                'date': date_str, 'day': d, 'name': name,
                'project': project, 'task': task, 'time': time_val,
                'category': category, 'notes': notes,
                'date_iso': f"{y}-{m:02d}-{d:02d}"
            })

    return records

def build_output(year, month, records, working_days, saturdays, sundays, holiday_dates):
    month_name = MONTH_NAMES[month]
    staff_data = defaultdict(lambda: {
        'total_hours': 0.0,
        'daily': defaultdict(float),
        'projects': defaultdict(float),
        'tasks': []
    })
    for rec in records:
        n = rec['name']
        staff_data[n]['total_hours']       += rec['time']
        staff_data[n]['daily'][rec['day']] += rec['time']
        staff_data[n]['projects'][rec['project']] += rec['time']
        staff_data[n]['tasks'].append(rec)

    return {
        'month':         f"{month_name} {year}",
        'year':          year,
        'month_num':     month,
        'working_days':  len(working_days),
        'expected_hours':len(working_days) * 8,
        'holidays':      {str(k): v for k, v in holiday_dates.items()},
        'saturdays':     saturdays,
        'sundays':       sundays,
        'staff': {
            name: {
                'total_hours': info['total_hours'],
                'utilization': (info['total_hours'] / (len(working_days) * 8) * 100) if working_days else 0,
                'daily':    {str(k): v for k, v in info['daily'].items()},
                'projects': dict(info['projects']),
                'tasks':    info['tasks']
            }
            for name, info in staff_data.items()
        }
    }

def main():
    args = parse_args()
    year, month = args.year, args.month
    month_slug  = f"{MONTH_NAMES[month].lower()}{year}"

    print(f"\nFetching timesheet: {MONTH_NAMES[month]} {year}")
    working_days, saturdays, sundays, holiday_dates = get_month_meta(year, month)
    print(f"  Hari kerja   : {len(working_days)}")
    print(f"  Hari libur   : {list(holiday_dates.values())}")
    print(f"  Target jam   : {len(working_days) * 8} jam/orang")

    records = fetch_from_sheets(year, month)
    print(f"  Records ditemukan: {len(records)}")

    output  = build_output(year, month, records, working_days, saturdays, sundays, holiday_dates)

    out_path = args.out or os.path.join(DATA_DIR, f"{month_slug}_data.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nData saved -> {out_path}")
    print(f"Staff: {list(output['staff'].keys())}")
    return out_path

if __name__ == '__main__':
    main()
