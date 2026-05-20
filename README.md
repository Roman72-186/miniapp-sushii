# miniapp-sushii

Standalone веб-приложение для суши-ресторана: React SPA + Express API + SQLite в dev / PostgreSQL (Supabase) в production.

## Запуск

```bash
npm start
npm run build
node server.js
```

Дополнительно:

```bash
npm run catalog
npm run backup:db
npm test
```

## Структура проекта

Рабочий код:

- `src/` — фронтенд React SPA.
- `api/` — API-обработчики и общие backend-утилиты.
- `server.js` — Express entrypoint.
- `public/` — каталоги товаров, изображения и статическая статика.
- `config/` — конфигурация магазинов и служебные конфиги.
- `scripts/` — утилиты миграции, импорта и диагностики.
- `nginx/`, `Dockerfile`, `docker-compose.yml` — деплой.

Данные и overrides:

- `data/products/` — admin overrides для товаров.
- `data/catalog-master.csv` — итоговая сводка каталога.
- `data/*.json`, `data/*.csv` — аналитические и legacy-выгрузки.
- `data/sushii.db` — локальная SQLite база, теперь игнорируется git.

Документация и память проекта:

- `AGENTS.md`, `CLAUDE.md`, `logi.md` — локальные инструкции и рабочий контекст.
- `docs/` — человекочитаемая документация и референсы.
- `obsidian-vault/` — долговременная проектная память.

Локальные каталоги среды:

- `.agents/`, `.codex/` — локальные артефакты агентов, игнорируются git.
- `.claude/` — локальная конфигурация и навыки; часть файлов отслеживается в репозитории.

## Важные замечания

- Это больше не Telegram Mini App. Основная авторизация — JWT через телефон, OTP и пароль.
- `shop-v2.css` — основной override-слой дизайна магазина. Косметические правки магазина вносить туда.
- `Товары.csv` должен оставаться в корне: его читает `scripts/build-catalog-master.py`.
- `opencode.jsonc` должен оставаться в корне: на него завязан `config/protected-secrets.json`.

## Проверка после изменений

Основная быстрая проверка:

```bash
npm.cmd run build
```

Сборка может проходить с warnings по `no-unused-vars`; это текущий технический долг, а не блокер запуска.
