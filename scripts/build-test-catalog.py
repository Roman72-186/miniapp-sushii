"""
build-test-catalog.py

Собирает тестовый каталог обычных товаров из Товары.csv.
Исключает подписочные категории и тарифы подписки.
Результат: public/test/catalog.json
"""

import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path


sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).resolve().parents[1]
INPUT = BASE / "Товары.csv"
OUTPUT = BASE / "public" / "test" / "catalog.json"

CATEGORY_MAP = {
    "Роллы": ("rolls", "Роллы", "Роллы", "🍣"),
    "Запеченные роллы": ("baked-rolls", "Запечённые роллы", "Запечённые", "🔥"),
    "Сеты": ("sets", "Сеты", "Сеты", "🍱"),
    "Акционные сеты": ("promo-sets", "Акционные сеты", "Акции", "⚡"),
    "Супы, поке, боулы": ("soups-poke-bowls", "Супы, поке, боулы", "Поке/супы", "🥣"),
    "Суши и гунканы": ("gunkan", "Суши и гунканы", "Гунканы", "🍣"),
    "Топинги и соуса": ("toppings-sauces", "Топпинги и соусы", "Соусы", "🥢"),
}

CATEGORY_ORDER = [
    "rolls",
    "baked-rolls",
    "sets",
    "promo-sets",
    "soups-poke-bowls",
    "gunkan",
    "toppings-sauces",
]


def parse_price(value):
    normalized = str(value or "")
    normalized = normalized.replace(" ", "").replace(",", ".")
    normalized = re.sub(r"[^\d.]", "", normalized)
    if not normalized:
        return 0
    return int(round(float(normalized)))


def clean_name(value):
    return re.sub(r"\s*\*+\s*$", "", str(value or "")).strip()


def is_regular_category(category):
    normalized = str(category or "").lower()
    if "подписк" in normalized:
        return False
    if normalized.strip() == "подписка":
        return False
    return category in CATEGORY_MAP


def main():
    with INPUT.open(encoding="cp1251", newline="") as file:
        rows = list(csv.DictReader(file, delimiter=";"))

    products = []
    skipped = Counter()

    for index, row in enumerate(rows):
        source_category = (row.get("Категория") or "").strip()
        if not is_regular_category(source_category):
            skipped[source_category or "Без категории"] += 1
            continue

        category_id = CATEGORY_MAP[source_category][0]
        sku = str(row.get("Артикул") or "").strip()
        name = str(row.get("Название") or "").strip()
        if not name:
            continue

        products.append(
            {
                "id": sku or f"{category_id}-{index}",
                "sku": sku,
                "name": name,
                "cleanName": clean_name(name),
                "price": parse_price(row.get("Цена")),
                "category": category_id,
                "sourceCategory": source_category,
            }
        )

    counts = Counter(product["category"] for product in products)
    categories = []
    for category_id in CATEGORY_ORDER:
        if counts[category_id] == 0:
            continue
        for source_category, mapped in CATEGORY_MAP.items():
            if mapped[0] == category_id:
                categories.append(
                    {
                        "id": mapped[0],
                        "name": mapped[1],
                        "tab": mapped[2],
                        "icon": mapped[3],
                        "count": counts[category_id],
                        "sourceCategory": source_category,
                    }
                )
                break

    output = {
        "source": "Товары.csv",
        "mode": "regular-no-subscription-no-discount",
        "total": len(products),
        "categories": categories,
        "products": products,
        "skippedCategories": dict(skipped),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Записан: {OUTPUT}")
    print(f"Товаров: {len(products)}")
    for category in categories:
        print(f"  {category['count']:>3} {category['name']}")


if __name__ == "__main__":
    main()
