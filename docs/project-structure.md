# Структура проекта

## Runtime

- `src/` — клиентский React-код.
- `api/` — backend handlers и shared `_lib`.
- `server.js` — HTTP entrypoint.
- `public/` — JSON-каталоги, изображения, админ-статика.

## Infrastructure

- `Dockerfile`, `docker-compose.yml`, `nginx/` — контейнеризация и reverse proxy.
- `config/` — конфиги магазинов и защита секретов.
- `scripts/` — миграции, выгрузки, служебные проверки.

## Data

- `data/products/` — runtime overrides от админки.
- `data/catalog-master.csv` — агрегированная сводка каталога.
- `data/*.json`, `data/*.csv` — аналитические или legacy-выгрузки.
- `data/sushii.db` — локальная dev-база, в git не хранится.

## Docs

- `docs/` — документация и референсные файлы.
- `obsidian-vault/` — внутренняя база знаний и история сессий.
- `AGENTS.md`, `CLAUDE.md`, `logi.md` — инструкции и рабочий контекст для агентов.

## Root-level exceptions

- `Товары.csv` остаётся в корне, потому что его напрямую читает `scripts/build-catalog-master.py`.
- `opencode.jsonc` остаётся в корне, потому что путь зафиксирован в `config/protected-secrets.json`.
- `miniapp-sushii.code-workspace` остаётся в корне как workspace-файл редактора.

## Игнорируемые локальные артефакты

- `.agents/`
- `.codex/`
- `data/sushii.db`
- `data/users/`
- `data/gifts/`
