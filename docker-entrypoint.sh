#!/bin/sh
# Стартует контейнер под root, чтобы поправить владельца тома app-data
# (уже существующие данные на VPS созданы root'ом до перехода на non-root
# юзера) — chown идемпотентен и быстр, дальше процесс запускается уже под
# непривилегированным node через su-exec (drop privileges).
set -e

chown -R node:node /app/data

exec su-exec node "$@"
