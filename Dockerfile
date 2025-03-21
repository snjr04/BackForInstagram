# Используем официальный образ Node.js
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы
COPY package*.json ./
RUN npm install

# Копируем исходный код
COPY . .

# Запускаем сервер
CMD ["node", "server.js"]
