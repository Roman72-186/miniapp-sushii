# Ловушка: npm пакет в devDependencies — не ставится в Docker prod

## Симптом
Сервер падает с `Cannot find module 'имя-пакета'` сразу при старте. 502 ошибка в nginx.

## Причина
Docker prod-образ использует `npm ci --omit=dev`. Если пакет в `package-lock.json` имеет `"dev": true` — он не устанавливается.

## Как проверить
```bash
grep -A5 '"node_modules/имя-пакета"' package-lock.json
# Если есть "dev": true — пакет не попадёт в прод
```

## Решение
1. Убрать пакет из `devDependencies` в `package.json`
2. Убедиться что он есть в `dependencies`
3. Запустить `npm install` — lock-файл обновится, `"dev": true` исчезнет
4. Закоммитить оба файла и задеплоить

## Ловушка внутри ловушки
`npm install пакет --save` **не убирает** `"dev": true` из lock-файла если пакет уже есть в devDependencies. Нужно сначала вручную убрать из `devDependencies` в `package.json`, потом `npm install`.
