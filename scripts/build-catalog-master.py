"""
build-catalog-master.py
Собирает единый справочник товаров из:
  - JSON-каталогов в public/
  - Товары.csv (выгрузка из Frontpad)
  - imageMap.js (пути к картинкам)

Результат: data/catalog-master.csv
"""

import sys
import json
import re
import os
import csv

sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 1. Список JSON-каталогов ──────────────────────────────────────────────────

CATALOGS = [
    ("rolls",        "Роллы",                       r"public\холодные роллы\rolls.json"),
    ("zaproll",      "Запечённые роллы",             r"public\запеченные роллы\zaproll.json"),
    ("set",          "Сеты",                         r"public\сеты\set.json"),
    ("gunkan",       "Суши и гунканы",               r"public\гунканы\gunkan.json"),
    ("sauces",       "Добавки и соусы",              r"public\добавки\sauces.json"),
    ("rolls-sub",    "Роллы (подписка)",             r"public\подписка роллы\rolls-sub.json"),
    ("sets-sub",     "Сеты (подписка)",              r"public\подписка сеты\sets-sub.json"),
    ("zaproll-sub",  "Запечённые (подписка)",        r"public\подписка запеченные\zaproll-sub.json"),
    ("rolls-490",    "Роллы по подписке **",         r"public\подписка 490\rolls-490.json"),
    ("sets-490",     "Сеты по подписке **",          r"public\подписка 490\sets-490.json"),
]

# ── 2. Загрузка JSON-каталогов ────────────────────────────────────────────────

def load_catalogs():
    """Возвращает список dict: {catalog_id, catalog_name, name, price, sku, description}"""
    rows = []
    for cat_id, cat_name, rel_path in CATALOGS:
        path = os.path.join(BASE, rel_path)
        if not os.path.exists(path):
            print(f"  [!] Файл не найден: {rel_path}")
            continue
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        items = data.get('items', [])
        for item in items:
            rows.append({
                'catalog_id':   cat_id,
                'catalog_name': cat_name,
                'name':         item.get('name', ''),
                'price':        item.get('price', ''),
                'sku':          str(item.get('sku', '')),
                'description':  item.get('description', ''),
            })
        print(f"  ✓ {cat_name}: {len(items)} товаров")
    return rows

# ── 3. Загрузка CSV (Frontpad) ────────────────────────────────────────────────

def load_csv():
    """Возвращает dict: sku -> {csv_category, csv_name, csv_price, csv_sku}"""
    csv_path = os.path.join(BASE, 'Товары.csv')
    by_sku = {}
    by_name = {}
    with open(csv_path, encoding='cp1251') as f:
        reader = csv.reader(f, delimiter=';')
        next(reader)  # заголовок
        for row in reader:
            if len(row) < 4:
                continue
            cat, name, price, sku = row[0].strip(), row[1].strip(), row[2].strip(), row[3].strip()
            entry = {'csv_category': cat, 'csv_name': name, 'csv_price': price, 'csv_sku': sku}
            by_sku[sku] = entry
            by_name[name.lower()] = entry
    print(f"  ✓ CSV загружен: {len(by_sku)} артикулов")
    return by_sku, by_name

# ── 4. Загрузка imageMap.js ───────────────────────────────────────────────────

def load_image_map():
    """Парсит IMAGE_MAP из imageMap.js, возвращает dict нормализованный_ключ -> путь"""
    imap_path = os.path.join(BASE, r'src\config\imageMap.js')
    with open(imap_path, encoding='utf-8') as f:
        content = f.read()

    # Вырезаем блок IMAGE_MAP = { ... }
    match = re.search(r'const IMAGE_MAP\s*=\s*\{(.+?)\};', content, re.DOTALL)
    if not match:
        print("  [!] Не удалось распарсить IMAGE_MAP")
        return {}

    block = match.group(1)
    # Парсим строки вида  'ключ': 'значение',
    pairs = re.findall(r"'([^']+)'\s*:\s*'([^']+)'", block)
    raw = {k: v for k, v in pairs}
    # Нормализуем ключи так же, как это делает getProductImage (э→е, ё→е и т.д.)
    result = {}
    for k, v in raw.items():
        nk = _normalize_key(k)
        result[nk] = v
    print(f"  ✓ imageMap загружен: {len(result)} записей (ключи нормализованы)")
    return result

def _normalize_key(name):
    """Нормализация для ключей imageMap (те же правила что в normalizeName JS)"""
    n = name.lower()
    n = n.replace('ё', 'е').replace('э', 'е')
    n = re.sub(r'\s*\*+\s*$', '', n)
    n = n.replace('-', ' ')
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def normalize(name):
    """Та же нормализация что в imageMap.js"""
    n = name.lower()
    n = n.replace('ё', 'е').replace('э', 'е')
    n = re.sub(r'\s*\*+\s*$', '', n)   # убираем * в конце
    n = n.replace('-', ' ')
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def get_image(name, image_map):
    norm = normalize(name)
    if norm in image_map:
        return image_map[norm]
    keys = list(image_map.keys())
    for k in keys:
        if norm in k or k in norm:
            return image_map[k]
    return ''

# ── 5. Проверка существования файла картинки ──────────────────────────────────

def image_exists(img_path):
    if not img_path:
        return 'нет записи'
    # img_path вида /new_roll/foo.jpg или /img/bar.PNG
    rel = img_path.lstrip('/').replace('/', os.sep)
    # Ищем сначала в public/, потом в build/
    for base_dir in ['public', 'build']:
        full = os.path.join(BASE, base_dir, rel)
        if os.path.exists(full):
            return 'OK'
    return 'файл не найден'

# ── 6. Сборка мастер-таблицы ─────────────────────────────────────────────────

def build_master():
    print("\n--- Загрузка каталогов ---")
    catalog_rows = load_catalogs()

    print("\n--- Загрузка CSV ---")
    csv_by_sku, csv_by_name = load_csv()

    print("\n--- Загрузка imageMap ---")
    image_map = load_image_map()

    print("\n--- Сборка мастер-таблицы ---")

    master = []
    for row in catalog_rows:
        sku  = row['sku']
        name = row['name']

        # Ищем в CSV по артикулу
        csv_entry = csv_by_sku.get(sku)
        # Если не нашли — пробуем по имени (для диагностики)
        if not csv_entry:
            csv_entry = csv_by_name.get(name.lower())

        # Картинка
        img_path = get_image(name, image_map)
        img_ok   = image_exists(img_path)

        # Статус совпадения
        if not csv_entry:
            match_status = '⚠ нет в CSV'
        elif csv_entry['csv_sku'] != sku:
            match_status = '⚠ артикул расходится'
        else:
            match_status = 'OK'

        master.append({
            'catalog_id':    row['catalog_id'],
            'catalog_name':  row['catalog_name'],
            'name':          name,
            'sku':           sku,
            'price':         row['price'],
            'description':   row['description'],
            'image_path':    img_path,
            'image_status':  img_ok,
            'csv_sku':       csv_entry['csv_sku']       if csv_entry else '',
            'csv_name':      csv_entry['csv_name']      if csv_entry else '',
            'csv_price':     csv_entry['csv_price']     if csv_entry else '',
            'csv_category':  csv_entry['csv_category']  if csv_entry else '',
            'match_status':  match_status,
        })

    return master

# ── 7. Вывод отчёта и запись CSV ─────────────────────────────────────────────

def write_output(master):
    out_path = os.path.join(BASE, 'data', 'catalog-master.csv')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    fieldnames = [
        'catalog_id', 'catalog_name', 'name', 'sku', 'price', 'description',
        'image_path', 'image_status',
        'csv_sku', 'csv_name', 'csv_price', 'csv_category',
        'match_status',
    ]

    with open(out_path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
        w.writeheader()
        w.writerows(master)

    print(f"\n✅ Записан: {out_path}")
    print(f"   Строк: {len(master)}")

def print_summary(master):
    total = len(master)
    no_img   = [r for r in master if not r['image_path']]
    img_miss = [r for r in master if r['image_status'] == 'файл не найден']
    no_csv   = [r for r in master if r['match_status'] == '⚠ нет в CSV']
    sku_diff = [r for r in master if r['match_status'] == '⚠ артикул расходится']
    ok       = [r for r in master if r['match_status'] == 'OK']

    print(f"\n{'='*55}")
    print(f"  ИТОГО товаров во всех JSON-каталогах : {total}")
    print(f"  Совпали с CSV по артикулу            : {len(ok)}")
    print(f"  Нет в CSV                            : {len(no_csv)}")
    print(f"  Артикул расходится                   : {len(sku_diff)}")
    print(f"  Нет записи в imageMap                : {len(no_img)}")
    print(f"  Файл картинки не найден              : {len(img_miss)}")
    print(f"{'='*55}")

    if no_csv:
        print(f"\n⚠  Товары в JSON, которых НЕТ в CSV ({len(no_csv)}):")
        for r in no_csv:
            print(f"     [{r['catalog_id']}] {r['name']}  (sku={r['sku']})")

    if sku_diff:
        print(f"\n⚠  Артикул расходится ({len(sku_diff)}):")
        for r in sku_diff:
            print(f"     [{r['catalog_id']}] {r['name']}: JSON sku={r['sku']} / CSV sku={r['csv_sku']}")

    if no_img:
        print(f"\n⚠  Нет картинки в imageMap ({len(no_img)}):")
        seen = set()
        for r in no_img:
            n = normalize(r['name'])
            if n not in seen:
                seen.add(n)
                print(f"     [{r['catalog_id']}] {r['name']}")

    if img_miss:
        print(f"\n⚠  Файл картинки не существует ({len(img_miss)}):")
        for r in img_miss:
            print(f"     [{r['catalog_id']}] {r['name']} -> {r['image_path']}")

if __name__ == '__main__':
    master = build_master()
    print_summary(master)
    write_output(master)
