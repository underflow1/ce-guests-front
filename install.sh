#!/bin/bash

# Цвета для вывода (определяем ДО set -euo pipefail)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

set -euo pipefail

# Заголовок
clear
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════════════════════════════╗"
echo "  ║     Установка CE Guests Frontend                                ║"
echo "  ╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Функции для вывода
section() {
    # Пустая функция - разделители убраны
    :
}

step() {
    # Показываем спиннер перед операцией
    # После выполнения операции нужно вызвать step_done()
    step_progress "$1"
}

step_done() {
    # Заменяем спиннер на ✓ после выполнения операции
    step_progress_stop
}

STEP_PROGRESS_MSG=""

step_progress() {
    # Показываем шаг с крутящимся спиннером перед текстом
    local msg="$1"
    STEP_PROGRESS_MSG="$msg"
    local pid_file="/tmp/install_progress_$$.pid"
    local spinner_chars="|/-\\"
    local spinner_idx=0
    
    # Запускаем спиннер в фоне
    (
        while [ -f "$pid_file" ]; do
            local spinner_char="${spinner_chars:$spinner_idx:1}"
            # Используем \033[K для очистки до конца строки
            echo -ne "\r\033[K${spinner_char} ${BOLD}${msg}${NC}"
            spinner_idx=$(( (spinner_idx + 1) % 4 ))
            sleep 0.1
        done
    ) &
    echo $! > "$pid_file"
}

step_progress_stop() {
    # Останавливаем спиннер и заменяем на ✓ в той же строке
    local pid_file="/tmp/install_progress_$$.pid"
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        kill "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
        rm -f "$pid_file"
        # Небольшая задержка чтобы убедиться что спиннер остановлен
        sleep 0.15
        local msg="${STEP_PROGRESS_MSG}"
        # Очищаем строку перед выводом ✓
        echo -ne "\r\033[K${GREEN}✓${NC} ${BOLD}${msg}${NC}\n"
        STEP_PROGRESS_MSG=""
    fi
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} ${BOLD}Ошибка:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

info() {
    echo -e "  ${GREEN}→${NC} $1"
}

# ============================================================================
# ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ
# ============================================================================

NODE_VERSION="lts/*"
NVM_VERSION="v0.40.0"

# ============================================================================
# ПРОВЕРКИ
# ============================================================================

# Проверка окружения

# Проверка запуска через sudo
if [ "$EUID" -ne 0 ]; then
    error "Скрипт должен быть запущен через sudo"
    exit 1
fi

# Определение пользователя, от имени которого запущен sudo
if [ -z "${SUDO_USER:-}" ]; then
    error "Не удалось определить пользователя. Запустите: sudo -u USER $0"
    exit 1
fi

REAL_USER="$SUDO_USER"
REAL_HOME=$(eval echo ~$REAL_USER)

info "Пользователь: $REAL_USER"
info "Домашняя директория: $REAL_HOME"

# Проверка системы
if [ ! -f /etc/debian_version ]; then
    error "Скрипт работает только на Debian/Ubuntu"
    exit 1
fi

DISTRO=$(lsb_release -si 2>/dev/null || echo "Debian")
info "Система: $DISTRO"

# Определяем путь к репозиторию - директория где запущен скрипт
REPO_PATH="$(cd "$(dirname "$0")" && pwd)"

# Проверяем что мы в правильной директории (должен быть package.json)
if [ ! -f "$REPO_PATH/package.json" ]; then
    error "Файл package.json не найден. Запустите скрипт из директории проекта."
    exit 1
fi

success "Проверки пройдены"

# ============================================================================
# ИНТЕРАКТИВНЫЙ ВВОД
# ============================================================================

# Настройка параметров

exec 3<&0

echo -ne "${BOLD}${YELLOW}Введите домен сайта: ${NC}" >&2
read -r SITE_NAME <&3
SITE_NAME=${SITE_NAME:-""}
if [ -z "$SITE_NAME" ]; then
    error "Домен не может быть пустым"
    exit 1
fi

# Используем только TCP порт
echo -ne "${BOLD}${YELLOW}Введите порт бэкенда: ${NC}" >&2
read -r BACKEND_PORT <&3
BACKEND_PORT=${BACKEND_PORT:-8002}

BACKEND_HOST="127.0.0.1"
BACKEND_URL="http://$BACKEND_HOST:$BACKEND_PORT"
BACKEND_PROXY_PASS="http://$BACKEND_HOST:$BACKEND_PORT"

success "Домен: $SITE_NAME"
success "Бэкенд: $BACKEND_PROXY_PASS"

# ============================================================================
# УСТАНОВКА СИСТЕМНЫХ ЗАВИСИМОСТЕЙ
# ============================================================================

step "Проверка системных зависимостей"

MISSING_PACKAGES=()

if ! command -v git &> /dev/null; then
    MISSING_PACKAGES+=("git")
fi

if ! dpkg -l | grep -q "^ii.*libatomic1"; then
    MISSING_PACKAGES+=("libatomic1")
fi

step_progress_stop  # Останавливаем спиннер проверки

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    step_progress "Установка недостающих пакетов: ${MISSING_PACKAGES[*]}"
    apt-get update -qq > /dev/null 2>&1
    apt-get install -y "${MISSING_PACKAGES[@]}" > /dev/null 2>&1
    step_progress_stop
fi

# ============================================================================
# УСТАНОВКА NVM
# ============================================================================

NVM_DIR="$REAL_HOME/.nvm"

if [ -d "$NVM_DIR" ]; then
    step "NVM уже установлен"
    step_done
else
    step_progress "Установка NVM"
    sudo -u "$REAL_USER" bash -c "git clone https://github.com/nvm-sh/nvm.git $NVM_DIR" > /dev/null 2>&1
    cd "$NVM_DIR"
    sudo -u "$REAL_USER" git checkout "$NVM_VERSION" > /dev/null 2>&1
    cd - > /dev/null
    step_progress_stop
fi

# Загрузка nvm в окружение
export NVM_DIR="$NVM_DIR"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# ============================================================================
# УСТАНОВКА NODE.JS
# ============================================================================

step_progress "Установка Node.js LTS"
sudo -u "$REAL_USER" bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION" > /dev/null 2>&1
sudo -u "$REAL_USER" bash -c "source $NVM_DIR/nvm.sh && nvm use $NODE_VERSION" > /dev/null 2>&1
sudo -u "$REAL_USER" bash -c "source $NVM_DIR/nvm.sh && nvm alias default $NODE_VERSION" > /dev/null 2>&1
step_progress_stop

# ============================================================================
# СОЗДАНИЕ ДИРЕКТОРИИ ДЛЯ БИЛДА
# ============================================================================

BUILD_DIR="/var/www/$SITE_NAME"
step "Создание директории для билда: $BUILD_DIR"

if [ ! -d "$BUILD_DIR" ]; then
    mkdir -p "$BUILD_DIR"
    chown "$REAL_USER:www-data" "$BUILD_DIR"
    chmod 755 "$BUILD_DIR"
    step_done
else
    step_progress_stop
    warn "Директория уже существует"
fi

# ============================================================================
# НАСТРОЙКА SUDOERS
# ============================================================================

SUDOERS_FILE="/etc/sudoers.d/ce-guests-front-chown"
SUDOERS_RULE="$REAL_USER ALL=(ALL) NOPASSWD: /usr/bin/chown -R $REAL_USER\\:www-data $BUILD_DIR"

step "Настройка sudoers"

if [ -f "$SUDOERS_FILE" ]; then
    step_progress_stop
    warn "Файл sudoers уже существует, перезаписываем"
    step_progress "Настройка sudoers"
fi

echo "$SUDOERS_RULE" > "$SUDOERS_FILE"
chown root:root "$SUDOERS_FILE"
chmod 0440 "$SUDOERS_FILE"

if visudo -c -f "$SUDOERS_FILE" > /dev/null 2>&1; then
    step_done
else
    step_progress_stop
    error "Ошибка в синтаксисе sudoers файла"
    rm -f "$SUDOERS_FILE"
    exit 1
fi

# ============================================================================
# СОЗДАНИЕ .env.production
# ============================================================================

step "Создание .env.production"

ENV_FILE="$REPO_PATH/.env.production"
ENV_EXAMPLE="$REPO_PATH/.env.production.example"

if [ ! -f "$ENV_EXAMPLE" ]; then
    error "Файл .env.production.example не найден"
    exit 1
fi

cat > "$ENV_FILE" <<EOF
# Production environment variables
# Сгенерировано скриптом установки

# Домен сайта
VITE_SITE_DOMAIN=$SITE_NAME

# Путь для деплоя фронтенда
BUILD_OUT_DIR=$BUILD_DIR

# Бэкенд хост и порт
BACKEND_HOST=$BACKEND_HOST
BACKEND_PORT=$BACKEND_PORT

# API базовый URL
VITE_API_BASE_URL=https://$SITE_NAME/api/v1

# Пользователь и группа для chown после сборки
DEPLOY_USER=$REAL_USER
DEPLOY_GROUP=www-data
EOF

chown "$REAL_USER:$REAL_USER" "$ENV_FILE"
step_done

# ============================================================================
# КОПИРОВАНИЕ И НАСТРОЙКА NGINX.CONF
# ============================================================================

step "Копирование и настройка nginx.conf"

NGINX_CONF="$REPO_PATH/nginx.conf"
NGINX_SITE_FILE="/etc/nginx/sites-enabled/$SITE_NAME"

if [ ! -f "$NGINX_CONF" ]; then
    step_progress_stop
    error "Файл nginx.conf не найден"
    exit 1
fi

# Проверяем существование файла в sites-enabled
if [ -f "$NGINX_SITE_FILE" ]; then
    step_progress_stop
    echo -ne "${YELLOW}Файл $NGINX_SITE_FILE уже существует. Перезаписать? [y/N]: ${NC}" >&2
    read -r OVERWRITE <&3
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        warn "Пропускаем копирование nginx конфига"
        step_done
    else
        step_progress "Копирование конфига в sites-enabled"
        cp "$NGINX_CONF" "$NGINX_SITE_FILE"
        # Заменяем плейсхолдеры в скопированном файле
        sed -i "s|SITE_DOMAIN|$SITE_NAME|g" "$NGINX_SITE_FILE"
        sed -i "s|SITE_PATH|$BUILD_DIR|g" "$NGINX_SITE_FILE"
        sed -i "s|BACKEND_HOST|$BACKEND_HOST|g" "$NGINX_SITE_FILE"
        sed -i "s|BACKEND_PORT|$BACKEND_PORT|g" "$NGINX_SITE_FILE"
        step_done
    fi
else
    cp "$NGINX_CONF" "$NGINX_SITE_FILE"
    # Заменяем плейсхолдеры в скопированном файле
    sed -i "s|SITE_DOMAIN|$SITE_NAME|g" "$NGINX_SITE_FILE"
    sed -i "s|SITE_PATH|$BUILD_DIR|g" "$NGINX_SITE_FILE"
    sed -i "s|BACKEND_HOST|$BACKEND_HOST|g" "$NGINX_SITE_FILE"
    sed -i "s|BACKEND_PORT|$BACKEND_PORT|g" "$NGINX_SITE_FILE"
    step_done
fi

step "Проверка синтаксиса nginx"
if nginx -t > /dev/null 2>&1; then
    step_done
else
    step_progress_stop
    error "Ошибка в синтаксисе nginx конфига"
    nginx -t
    exit 1
fi

# ============================================================================
# УСТАНОВКА NPM ЗАВИСИМОСТЕЙ
# ============================================================================

step_progress "Установка npm зависимостей"
cd "$REPO_PATH"
sudo -u "$REAL_USER" bash -c "source $NVM_DIR/nvm.sh && npm install" > /dev/null 2>&1
step_progress_stop

# ============================================================================
# СБОРКА ПРОЕКТА
# ============================================================================

step_progress "Сборка проекта для production"

# Загружаем переменные из .env.production перед сборкой
sudo -u "$REAL_USER" bash -c "
    source $NVM_DIR/nvm.sh
    cd $REPO_PATH
    set -a
    source .env.production
    set +a
    npm run build:prod
" > /dev/null 2>&1
step_progress_stop

# ============================================================================
# ПЕРЕЗАГРУЗКА NGINX
# ============================================================================

step "Перезагрузка nginx"
systemctl reload nginx > /dev/null 2>&1
step_done

# ============================================================================
# ЗАВЕРШЕНИЕ
# ============================================================================

echo ""

echo -e "${BOLD}${GREEN}✓ Установка завершена успешно!${NC}"
echo ""
echo -e "  ${BOLD}Домен:${NC} $SITE_NAME"
echo -e "  ${BOLD}Директория билда:${NC} $BUILD_DIR"
echo -e "  ${BOLD}Директория проекта:${NC} $REPO_PATH"
echo -e "  ${BOLD}Бэкенд:${NC} $BACKEND_PROXY_PASS"
echo ""
