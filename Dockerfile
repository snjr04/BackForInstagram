# Базовый образ
FROM mcr.microsoft.com/playwright:v1.51.0

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package.json package-lock.json ./

# Устанавливаем зависимости без пост-инсталляции
RUN npm install --omit=dev --unsafe-perm

# Копируем остальной код проекта
COPY . .

# Устанавливаем Playwright вручную
RUN npx playwright install --with-deps

# Открываем порт
EXPOSE 3000

# Запускаем сервер
CMD ["node", "server.js"]
