# PsyWebNote — Backend Server

## Архитектура

```
server/
├── index.js      — Express сервер (middleware, CORS, rate-limit)
├── db.js         — SQLite база данных (схема, prepared statements)
├── routes.js     — Все API эндпоинты (auth, CRUD, batch)
├── package.json  — Зависимости сервера
├── data/         — Директория с SQLite файлом (создаётся автоматически)
│   └── psywebnote.db
└── README.md
```

## Быстрый старт

### 1. Установка зависимостей

```bash
cd server
npm install
```

> **Примечание:** `better-sqlite3` требует компилятора C++ (node-gyp).
> На macOS: `xcode-select --install`
> На Ubuntu: `sudo apt-get install build-essential python3`
> На Windows: `npm install --global windows-build-tools`

### 2. Настройка окружения

Скопируйте `.env` из корня проекта или создайте `server/.env`:

```env
JWT_SECRET=your-strong-secret-key-here
JWT_REFRESH_SECRET=your-strong-refresh-secret-here
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
```

**⚠️ ОБЯЗАТЕЛЬНО измените JWT_SECRET и JWT_REFRESH_SECRET в продакшене!**

### 3. Запуск

```bash
# Development (с автоперезагрузкой)
npm run dev

# Production
npm start
```

### 4. Подключение фронтенда

В корневом `.env` раскомментируйте:

```env
VITE_API_URL=http://localhost:3001/api
```

Перезапустите Vite dev server:

```bash
npm run dev
```

## API Эндпоинты

### Аутентификация

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация `{email, password, name}` |
| POST | `/api/auth/login` | Вход `{email, password}` |
| POST | `/api/auth/refresh` | Обновление access token (cookie) |
| POST | `/api/auth/logout` | Выход (требует Bearer token) |

### Профиль (требуется авторизация)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/profile` | Получить профиль |
| PUT | `/api/profile` | Обновить профиль |

### Клиенты (требуется авторизация)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/clients` | Все клиенты |
| POST | `/api/clients` | Создать клиента |
| GET | `/api/clients/:id` | Получить клиента |
| PUT | `/api/clients/:id` | Обновить клиента |
| DELETE | `/api/clients/:id` | Удалить клиента |

### Сессии (требуется авторизация)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/sessions` | Все сессии (`?clientId=xxx`) |
| POST | `/api/sessions` | Создать сессию |
| GET | `/api/sessions/:id` | Получить сессию |
| PUT | `/api/sessions/:id` | Обновить сессию |
| DELETE | `/api/sessions/:id` | Удалить сессию |

### Встречи (требуется авторизация)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/appointments` | Все встречи (`?from=&to=`) |
| POST | `/api/appointments` | Создать встречу |
| PUT | `/api/appointments/:id` | Обновить встречу |
| DELETE | `/api/appointments/:id` | Удалить встречу |

### Прочее

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/batch` | Массовая вставка данных |
| GET | `/api/stats` | Статистика (`?from=&to=`) |
| GET | `/api/health` | Проверка здоровья сервера |

## Безопасность

### Реализовано

- ✅ **bcrypt** (12 раундов) для хеширования паролей
- ✅ **JWT** access tokens (15 мин) + refresh tokens (7 дней, httpOnly cookie)
- ✅ **Ротация refresh tokens** при каждом обновлении
- ✅ **Rate limiting**: auth — 10 запросов/15 мин, API — 300/15 мин
- ✅ **Helmet** — security headers (HSTS, XSS protection, etc.)
- ✅ **CORS** — настраиваемый whitelist
- ✅ **Параметризованные запросы** — защита от SQL injection
- ✅ **Изоляция данных** — каждый запрос фильтруется по `user_id`
- ✅ **Валидация входных данных** на каждом эндпоинте
- ✅ **Лимит размера запроса** — 5MB (для аватаров в base64)
- ✅ **Graceful shutdown** — корректное закрытие БД и соединений

### Рекомендации для продакшена

1. Используйте **HTTPS** (через nginx reverse proxy или облачный LB)
2. Смените JWT_SECRET на случайную строку ≥ 64 символа
3. Включите `NODE_ENV=production`
4. Настройте `CORS_ORIGINS` на конкретные домены
5. Добавьте мониторинг (PM2, Prometheus)
6. Настройте бэкапы SQLite файла
7. Рассмотрите PostgreSQL для масштабирования

## Деплой

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app

# Install build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm ci --production

# Copy server code
COPY server/ ./server/

# Copy pre-built frontend
COPY dist/ ./dist/

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "server/index.js"]
```

### PM2

```bash
pm2 start server/index.js --name psywebnote -i max
```

### Systemd

```ini
[Unit]
Description=PsyWebNote API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/psywebnote
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
