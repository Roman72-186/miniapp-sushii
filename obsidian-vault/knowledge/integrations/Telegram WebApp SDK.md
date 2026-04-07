---
tags: [integration, telegram, webapp]
date: 2026-04-07
---

# Telegram WebApp SDK

Мини-апп запускается внутри Telegram через кнопку в боте.
SDK доступен как `window.Telegram.WebApp`.

## Идентификация пользователя

→ Подробнее: [[авторизация — три источника идентификации]]

Приоритет:
1. JWT-токен в `localStorage['web_token']` (веб-вход)
2. `window.Telegram.WebApp.initDataUnsafe.user.id` (Telegram)
3. `?telegram_id=` в URL (fallback)

## Используемые возможности SDK

| Возможность | Где используется |
|------------|----------------|
| `WebApp.ready()` | При загрузке приложения |
| `WebApp.expand()` | Разворачивает на полный экран |
| `WebApp.initDataUnsafe.user` | Данные пользователя (id, first_name) |
| `WebApp.colorScheme` | Тёмная/светлая тема |
| `WebApp.MainButton` | Кнопка внизу экрана (где используется) |
| `WebApp.close()` | Закрыть мини-апп |

## Запрет зума

В `index.html` установлено `user-scalable=no` в viewport — запрет масштабирования пальцами (добавлено 2026-04, коммит `5bf7812`).

## Блокировка скролла страницы

При открытой корзине (`CartPanel`) или форме заказа (`CheckoutForm`) скролл страницы заблокирован — `document.body.style.overflow = 'hidden'`. Исправлено в коммите `fda4290`.

## Важно: no-cache для Telegram WebView

В `server.js` SPA-fallback всегда отдаёт `index.html` с заголовками:
```
Cache-Control: no-cache, no-store, must-revalidate
```

Иначе Telegram кэширует старую версию и обновления не доходят.

## Связанные заметки
- [[авторизация — три источника идентификации]]
- [[архитектура приложения]]
