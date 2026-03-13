#!/bin/bash
set -e

echo "=== Miniapp Sushii — VPS Deploy ==="

# 1. Клонировать репозиторий (если первый раз)
# git clone <repo> miniapp-sushii && cd miniapp-sushii

# 2. Создать .env из примера и заполнить переменные
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Создан .env — заполните переменные перед запуском!"
  exit 1
fi

# 3. Создать директорию для certbot webroot
mkdir -p nginx/webroot

# 4. Собрать и запустить
docker-compose up -d --build

echo "=== Готово! ==="
echo "Приложение: http://localhost"
echo "API:        http://localhost/api/export-contacts"
echo ""
echo "Для SSL (при наличии домена):"
echo "  docker-compose run certbot certonly --webroot -w /var/www/certbot -d yourdomain.com"
echo "  # Затем добавьте HTTPS server block в nginx/default.conf и перезапустите nginx"
