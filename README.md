# AA Pulse — Anime Adventures Value & Demand Tracker

Веб-трекер стоимости и спроса персонажей из Roblox-игры **Anime Adventures** на стеке **Next.js (App Router)**, **Tailwind CSS**, **Recharts**, **Google Gemini AI** и **Supabase**.

## Возможности

1. **Живой CSV-парсер Google Таблицы (`src/lib/sheets-parser.ts`)**
   - Подключается к публичной таблице (`ID: 1KTVAqVw26TkwJF7GGJmKjkVEXCK5itqS1OZAIpqxuJ0`).
   - Автоматически определяет вкладки (`New Units`, `S Tier`, `A Tier`, `B Tier`, `C Tier`, `Info`) и выгружает их через CSV-экспорт (`gviz/tq?tqx=out:csv` с фолбэком на `export?format=csv`).
   - Извлекает имя персонажа (включая игровое и аниме-имя, флаг `SHINY`), `Value`, `Demand`, `Tier`/`Sub-Tier` (`SSS`, `SS`, `S+`, `A+`, `B`, `C-`), `Trend` и примечание (`Information`).

2. **Главная панель мониторинга (`/`)**
   - Живой поиск по имени персонажа, аниме-прототипу, тиру и описанию.
   - Фильтры по `Tier`, `Demand`, `Shiny` и сортировка.
   - Вкладки: **«Все персонажи»**, **«Топ роста (Rising)»**, **«Падают в цене (Dropping)»**, **«Новые юниты»**.
   - Переключение вида **Карточки / Таблица**.

3. **Страница персонажа (`/units/[slug]`)**
   - График истории изменения цены на базе **Recharts** (`7Д / 30Д / 90Д`).
   - Блок **«AI Аналитика рынка от Gemini»** через `POST /api/analyze-unit` (разбор цены, текущая мета, прогноз роста и торговый вердикт). Без `GEMINI_API_KEY` работает интеллектуальный локальный разбор; при указании ключа в `.env.local` автоматически используется модель Gemini.

4. **Калькулятор трейдов Win / Fair / Lose (`/calculator`)**
   - 2 стороны по **9 слотов** (`3×3`).
   - Подсчёт суммарного `Value`, среднего `Demand`, эквивалента в `Rerolls` (`1 RR ≈ 20 Value`), процента отклонения и предупреждений для коллекционных (`N/A`) и `Overpriced` юнитов.

## Быстрый старт

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Подключение Gemini API и Supabase (`.env.local`)

Скопируйте `.env.example` в `.env.local` и заполните переменные:

```env
GOOGLE_SHEET_ID=1KTVAqVw26TkwJF7GGJmKjkVEXCK5itqS1OZAIpqxuJ0
GEMINI_API_KEY=ваш_ключ_gemini
GEMINI_MODEL=gemini-2.5-flash

NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
SYNC_SECRET_TOKEN=опциональный_токен_синхронизации
```

### Настройка базы Supabase и автообновления цен

1. Создайте проект в [Supabase](https://supabase.com).
2. Откройте **SQL Editor** и выполните скрипт из [`supabase/schema.sql`](supabase/schema.sql).
3. Для ручной синхронизации вызовите `POST /api/sync-supabase` или запустите `node scripts/sync-market.mjs`.
4. Для ежечасного автообновления через GitHub Actions (`.github/workflows/market-sync.yml`) добавьте в **Settings → Secrets and variables → Actions** либо `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, либо `SYNC_ENDPOINT_URL` (+ опционально `SYNC_SECRET_TOKEN`).
