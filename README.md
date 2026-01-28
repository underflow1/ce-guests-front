# CE Guests Frontend

Фронтенд приложение для системы управления гостями.

## Установка

### Требования

- Debian/Ubuntu
- Права sudo

### Шаги установки

1. Клонируйте репозиторий:
```bash
git clone https://github.com/underflow1/ce-guests-front.git
cd ce-guests-front
```

2. Запустите скрипт установки:
```bash
sudo ./install.sh
```

Скрипт выполнит:
- Установку системных зависимостей (git, libatomic1)
- Установку nvm и Node.js LTS
- Настройку nginx
- Сборку проекта для production

Во время установки будет запрошен домен сайта и порт бэкенда.
