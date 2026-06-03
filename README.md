# QCA - Quality Control Application

Google Apps Script веб-додаток для контролю якості складання продукції. Чек-листи зберігаються в Google Sheets, файли звітів у Google Drive.

## Запуск з нуля

### 1. Встановити `clasp`

```bash
npm install -g @google/clasp
clasp login
```

Потрібно увімкнути Apps Script API: https://script.google.com/home/usersettings

### 2. Підготувати Google-ресурси

Створити в Google Drive:

- **Storage spreadsheet** з вкладками `users` та i18n (структура: `key | en | ua | …`). Приклад значень i18n див. [i18n_dictionary.txt](i18n_dictionary.txt). Приклад таблиці: https://docs.google.com/spreadsheets/d/1meuPPPFczk8Niv3pq1lkNReJhsqZ1xHK0hXPcbVuZ4w/edit?usp=sharing
- **Logs spreadsheet** з вкладкою `logs`. Приклад: https://docs.google.com/spreadsheets/d/1zi1uVzIBIIafNJE_tLNdnOVZl3fmkW33IKwi-mUa7TM/edit?usp=sharing
- **Report template** приклад: https://docs.google.com/spreadsheets/d/14Gk2RGYfbTI-PMxel9I5CQeO50DkQLQHsHaKOCrPhvE
- **Reports root folder** - папка для згенерованих звітів.

### 3. Прив'язати локальну копію до Apps Script проєкту

Або клонувати існуючий ([.clasp.json](.clasp.json) уже містить `scriptId`):

```bash
clasp clone <scriptId>
```

Або створити новий: `clasp create --type webapp --rootDir ./src/`.

### 4. Налаштувати Script Properties

В Apps Script > Project Settings > Script Properties додати:

```
appId
productVersions
defaultLang             # напр. "ua"
storageSpreadsheetId
logsSpreadsheetId
usersSheetName          # напр. "users"
i18nSheetName           # напр. "i18n"
reportTemplateId
reportsRootFolderId
logLevel                # info | warn | error
```

Для тестового середовища (коли `TESTING_FLAG = true` у [Config.js](src/Config.js)) додатково:

```
TEST_storageSpreadsheetId
TEST_logsSpreadsheetId
TEST_reportTemplateId
TEST_reportsRootFolderId
```

### 5. Завантажити код і задеплоїти

```bash
clasp push
```

В Apps Script: **Deploy > New deployment > Web app** (Execute as: User accessing, Access: за потреби). Відкрити отриманий URL.

### 6. Додати першого користувача

У `storageSpreadsheetId` > вкладка `users` додати рядок з email, `is_active = 1` і вашим `appId` у колонці `apps`.

### 7. Налаштувати тригери за розкладом

Функції з префіксом `EXEC_` запускаються по графіку через time-driven тригери GAS. Вони **не** заливаються через `clasp`, тому додавати їх треба вручну:

Apps Script > **Triggers** (іконка годинника) > **Add Trigger**:

| Функція | Призначення | Рекомендований інтервал |
|---|---|---|
| `EXEC_warmUpCache` | Прогріває кеш (i18n, користувачі, активні звіти, папки), щоб запити користувачів потрапляли в кеш | кожні 10–30 хв |

## Процес розробки

- **Код** - редагується локально у `src/` це root для clasp.
- **Бекенд** - `.js` файли (виконуються як GAS).
- **HTML-шаблони** - `src/templates/*.html`.
- **Клієнтський JS** - `src/frontend/*.js.html`, додається через `include()` з [Main.js](src/Main.js).
- **i18n** - бажано додавати ключ одночасно у i18n-таблицю та у [i18n_dictionary.txt](i18n_dictionary.txt) (синхронізовані вручну).

### Тести

GAS-функції з префіксом `TEST_` запускаються вручну в редакторі Apps Script або через `clasp run <FunctionName>`. Перед запуском поставити `TESTING_FLAG = true` у [Config.js](src/Config.js), щоб не зачепити продакшен-дані.

### Логи

```bash
clasp logs           # стрім логів виконання
```

Структуровані логи додатку - у `logsSpreadsheetId` (вкладка `logs`); аудит дій користувача - у вкладці `logs` кожного файлу звіту.

## Деплой змін

1. `clasp push` - заливає `src/` в Apps Script.
2. Перевірити на **dev**-URL (`/dev` - завжди останній збережений код).
3. Apps Script > **Deploy > Manage deployments > Edit > New version > Deploy** - оновлює прод-URL (`/exec`).

`/dev` vs `/exec` визначається `currentDeploymentMode` у [Config.js](src/Config.js).
