#!/bin/bash
LOG=/root/migration-$(date +%Y%m%d-%H%M%S).log
CONTAINER=$(docker ps --format "{{.Names}}" | grep miniapp-sushii-app)

echo "=== Миграция SQLite -> PostgreSQL ===" | tee $LOG
echo "Контейнер: $CONTAINER" | tee -a $LOG
echo "Время: $(date)" | tee -a $LOG

docker cp /root/miniapp-sushii/scripts/migrate-sqlite-to-pg.js $CONTAINER:/app/scripts/ 2>&1 | tee -a $LOG
docker exec $CONTAINER node /app/scripts/migrate-sqlite-to-pg.js 2>&1 | tee -a $LOG

echo "=== Завершено: $(date) ===" | tee -a $LOG
crontab -l | grep -v run-migration | crontab -
