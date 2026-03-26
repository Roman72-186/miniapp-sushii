#!/bin/bash

# Упрощенный скрипт деплоя для Sushii Mini App
# Цель: обойти проблемы с таймаутами и файловыми блокировками

echo "=== Начинаем деплой на сервер sushi-house-39.ru ==="

# Проверяем подключение к серверу
echo "Проверяем подключение к серверу..."
if ! ssh root@sushi-house-39.ru "echo 'Соединение установлено'"; then
    echo "Ошибка: Не удалось подключиться к серверу"
    exit 1
fi

echo "Соединение с сервером установлено успешно"

# Очищаем старые данные на сервере
echo "Очищаем существующие данные на сервере..."
ssh root@sushi-house-39.ru "rm -rf /var/www/sushii/*"

# Копируем новые файлы
echo "Копируем новые файлы на сервер..."
scp -r build/* root@sushi-house-39.ru:/var/www/sushii/

# Проверяем успешность копирования
if [ $? -eq 0 ]; then
    echo "Файлы успешно скопированы"
else
    echo "Ошибка при копировании файлов"
    exit 1
fi

# Очищаем кэш продуктов на сервере
echo "Очищаем кэш продуктов на сервере..."
ssh root@sushi-house-39.ru "rm -rf /root/miniapp-sushii/data/products/*"

# Перезапускаем контейнеры
echo "Перезапускаем Docker контейнеры..."
ssh root@sushi-house-39.ru "cd /root/miniapp-sushii && docker-compose down && docker-compose up -d"

echo "=== Деплой завершен успешно ==="
echo "Проверьте работу приложения по адресу: https://sushi-house-39.ru"