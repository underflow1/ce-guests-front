# Промпт для рефакторинга WebSocket событий

## Общая информация

Необходимо переработать все WebSocket события для отправки полных данных недели вместо отдельных записей. Это обеспечит консистентность состояния между всеми клиентами и упростит логику на фронтенде.

## Требования

### 1. Структура WebSocket сообщений

Все события должны иметь единую структуру:

```json
{
  "type": "тип_события",
  "data": {
    "entries": [...],  // Все записи недели (как в GET /entries)
    "reference_dates": {
      "previous_workday": "2026-01-28",
      "next_workday": "2026-01-30"
    },
    "calendar_structure": [
      {
        "date": "2026-01-26",
        "weekday": "Monday",
        "is_workday": true
      },
      // ... остальные дни недели
    ]
  },
  "change": {
    // Детали изменения (для тостов на фронтенде)
  }
}
```

**Важно:** Поле `data` должно содержать те же данные, что возвращает GET `/entries`. Рекомендуется использовать одну и ту же функцию для формирования ответа, чтобы избежать дублирования кода.

### 2. Соответствие роутов и WebSocket событий

Каждый роут должен отправлять соответствующее WebSocket событие:

| Роут | Метод | WebSocket событие | Условие |
|------|-------|-------------------|---------|
| `/entries` | POST | `entry_created` | Всегда |
| `/entries/{id}` | PUT | `entry_updated` | Если изменяются только `name` или `responsible` (НЕ `datetime`, НЕ `is_completed`) |
| `/entries/{id}` | PUT | `entry_moved` | Если изменяется `datetime` (дата или время) |
| `/entries/{id}/completed` | PATCH | `entry_completed` | Если `is_completed: true` |
| `/entries/{id}/completed` | PATCH | `entry_uncompleted` | Если `is_completed: false` |
| `/entries/{id}` | DELETE | `entry_deleted` | Всегда (мягкое удаление) |
| `/entries/all` | DELETE | `entries_deleted_all` | Всегда |
| `/entries/future` | DELETE | `entries_deleted_future` | Всегда |

**Важно:** 
- Роут `/entries/{id}/completed` используется ТОЛЬКО для изменения `is_completed` (атомарная операция)
- Роут `/entries/{id}` (PUT) используется для изменения других полей (`name`, `responsible`, `datetime`)
- При PUT `/entries/{id}` нужно определить тип события на основе того, какие поля изменились

### 3. Типы событий

#### 3.1. `entry_created` - создание записи

**Роут:** POST `/entries`

**Когда отправляется:** После успешного создания новой записи

**Структура:**
```json
{
  "type": "entry_created",
  "data": {
    "entries": [...],
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "entry": {
      "id": "uuid",
      "name": "Имя",
      "responsible": "Ответственный",
      "datetime": "2026-01-29T10:00:00",
      "is_completed": false
    }
  }
}
```

#### 3.2. `entry_updated` - изменение через форму (ФИО, ответственный)

**Роут:** PUT `/entries/{id}`

**Когда отправляется:** После обновления записи, когда изменяются только поля `name` или `responsible` (НЕ `datetime` и НЕ `is_completed`)

**Структура:**
```json
{
  "type": "entry_updated",
  "data": {
    "entries": [...],
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "entry": {
      "id": "uuid",
      "name": "Новое имя",
      "responsible": "Новый ответственный",
      "datetime": "2026-01-29T10:00:00",
      "is_completed": false
    }
  }
}
```

**Важно:** Это событие НЕ отправляется при изменении `datetime` (для этого есть `entry_moved`) или `is_completed` (для этого есть `entry_completed`/`entry_uncompleted`).

#### 3.3. `entry_completed` - установка галочки "пришел"

**Роут:** PATCH `/entries/{id}/completed`

**Когда отправляется:** После успешного обновления с `is_completed: true`

**Структура:**
```json
{
  "type": "entry_completed",
  "data": {
    "entries": [...],
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "entry": {
      "id": "uuid",
      "name": "Имя",
      "responsible": "Ответственный",
      "datetime": "2026-01-29T10:00:00",
      "is_completed": true
    }
  }
}
```

#### 3.4. `entry_uncompleted` - снятие галочки "пришел"

**Роут:** PATCH `/entries/{id}/completed`

**Когда отправляется:** После успешного обновления с `is_completed: false`

**Структура:**
```json
{
  "type": "entry_uncompleted",
  "data": {
    "entries": [...],
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "entry": {
      "id": "uuid",
      "name": "Имя",
      "responsible": "Ответственный",
      "datetime": "2026-01-29T10:00:00",
      "is_completed": false
    }
  }
}
```

#### 3.5. `entry_moved` - изменение времени через drag&drop

**Роут:** PUT `/entries/{id}`

**Когда отправляется:** После обновления записи, когда изменяется поле `datetime` (дата или время)

**Структура:**
```json
{
  "type": "entry_moved",
  "data": {
    "entries": [...],
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "entry": {
      "id": "uuid",
      "name": "Имя",
      "responsible": "Ответственный",
      "datetime": "2026-01-30T14:00:00",
      "is_completed": false
    }
  }
}
```

**Важно:** Это событие отправляется ТОЛЬКО когда изменяется `datetime`. Если изменяются другие поля вместе с `datetime`, нужно определить приоритет или отправлять несколько событий.

#### 3.6. `entry_deleted` - удаление записи

**Роут:** DELETE `/entries/{id}`

**Когда отправляется:** После успешного удаления записи (мягкое удаление)

**Структура:**
```json
{
  "type": "entry_deleted",
  "data": {
    "entries": [...],  // Без удаленной записи
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "entry": {
      "id": "uuid",
      "name": "Имя",
      "responsible": "Ответственный",
      "datetime": "2026-01-29T10:00:00",
      "is_completed": false
    }
  }
}
```

#### 3.7. `entries_deleted_all` - удаление всех записей

**Роут:** DELETE `/entries/all`

**Когда отправляется:** После успешного удаления всех записей

**Структура:**
```json
{
  "type": "entries_deleted_all",
  "data": {
    "entries": [],
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "deleted_count": 42
  }
}
```

#### 3.8. `entries_deleted_future` - удаление будущих записей

**Роут:** DELETE `/entries/future`

**Когда отправляется:** После успешного удаления будущих записей

**Структура:**
```json
{
  "type": "entries_deleted_future",
  "data": {
    "entries": [...],  // Только записи до сегодня
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "deleted_count": 15
  }
}
```

#### 3.9. `entry_restored` - восстановление записи (на будущее)

**Роут:** (будет определен в будущем)

**Когда отправляется:** После восстановления удаленной записи (функционал пока не реализован, но структура должна быть готова)

**Структура:**
```json
{
  "type": "entry_restored",
  "data": {
    "entries": [...],
    "reference_dates": {...},
    "calendar_structure": [...]
  },
  "change": {
    "entry": {
      "id": "uuid",
      "name": "Имя",
      "responsible": "Ответственный",
      "datetime": "2026-01-29T10:00:00",
      "is_completed": false
    }
  }
}
```

**Важно:** Это событие пока не нужно реализовывать, но структура должна быть готова для будущего функционала.

### 4. Логика определения типа события

При обновлении записи через PUT `/entries/{id}` нужно определить тип события:

1. Если изменяется только `datetime` → `entry_moved`
2. Если изменяется только `is_completed` → `entry_completed` или `entry_uncompleted` (в зависимости от значения)
3. Если изменяются `name` или `responsible` (но не `datetime` и не `is_completed`) → `entry_updated`
4. Если изменяется несколько полей одновременно, нужно определить приоритет или отправить несколько событий

**Рекомендация:** При изменении `datetime` всегда отправлять `entry_moved`, даже если изменяются и другие поля. При изменении `is_completed` всегда отправлять `entry_completed`/`entry_uncompleted`, даже если изменяются и другие поля.

### 5. Рефакторинг кода

**Важно:** Использовать одну и ту же функцию для формирования структуры `data` (как в GET `/entries`), чтобы избежать дублирования кода и обеспечить консистентность.

### 6. Обратная совместимость

Старые события (`entry_completed` как отдельное событие) должны быть удалены или заменены на новые. Фронтенд будет обновлен для работы с новой структурой.

## Примеры реализации

### Python (FastAPI) пример:

```python
async def get_entries_data(today: Optional[str] = None) -> dict:
    """Единая функция для получения данных недели"""
    # Логика получения entries, reference_dates, calendar_structure
    # Та же логика, что в GET /entries
    return {
        "entries": entries,
        "reference_dates": reference_dates,
        "calendar_structure": calendar_structure
    }

async def send_websocket_event(
    websocket_manager,
    event_type: str,
    change_data: dict
):
    """Отправка WebSocket события"""
    data = await get_entries_data()
    message = {
        "type": event_type,
        "data": data,
        "change": change_data
    }
    await websocket_manager.broadcast(message)
```

## Чеклист реализации

- [ ] Создать единую функцию для получения данных недели (как в GET `/entries`)
- [ ] Обновить все WebSocket события для использования новой структуры
- [ ] Реализовать логику определения типа события при обновлении записи
- [ ] Обновить `entry_created` событие
- [ ] Обновить `entry_updated` событие (только для name/responsible)
- [ ] Реализовать `entry_completed` событие
- [ ] Реализовать `entry_uncompleted` событие
- [ ] Реализовать `entry_moved` событие
- [ ] Обновить `entry_deleted` событие
- [ ] Обновить `entries_deleted_all` событие
- [ ] Обновить `entries_deleted_future` событие
- [ ] Подготовить структуру для `entry_restored` (не реализовывать)
- [ ] Удалить устаревшие события (если есть)
- [ ] Протестировать все события
