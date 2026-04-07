---
tags: [debugging, docker, dns, infrastructure]
date: 2026-04-07
---

# Docker DNS — починка если fetch failed

**Симптом:** Приложение в Docker-контейнере не может обратиться к внешним API (Frontpad, YooKassa, Telegram). Ошибка вида `fetch failed` или `ENOTFOUND`.

## Причина

Docker-контейнер использует внутренний DNS-резолвер, который иногда не может разрешить внешние домены. Особенно после обновления Docker или изменения сетевых настроек VPS.

## Диагностика

```bash
# Войти в контейнер
docker exec -it miniapp-sushii-app-1 sh

# Проверить DNS
nslookup api.yookassa.ru
ping api.frontpad.ru
```

## Решение 1: Явно указать DNS в docker-compose.yml

```yaml
services:
  app:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

## Решение 2: Перезапустить Docker-сеть

```bash
docker compose down
docker network prune
docker compose up -d
```

## Решение 3: Настроить DNS на VPS

```bash
# /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}

systemctl restart docker
```

## Связанные заметки
- [[деплой и инфраструктура]]
