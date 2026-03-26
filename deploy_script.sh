#!/bin/bash
# Этот скрипт выполняет деплой приложения на сервер
# и очищает кэш продуктов

# Перейти в директорию проекта
cd /root/miniapp-sushii

# Получить последние изменения из репозитория
echo "Получение последних изменений из репозитория..."
git pull origin main

# Пересобрать и запустить Docker контейнеры
echo "Пересборка и запуск контейнеров..."
docker-compose up -d --build

# Очистить кэш продуктов
echo "Очистка кэша продуктов..."
rm -f /root/miniapp-sushii/data/products/подписка\ 490/rolls-490.json
rm -f /root/miniapp-sushii/data/products/подписка\ 490/sets-490.json

echo "Деплой успешно завершен!"