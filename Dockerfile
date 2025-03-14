# Используем официальный образ Node.js
FROM node:18

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json перед установкой зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --unsafe-perm

# Устанавливаем Playwright с зависимостями и даём права на выполнение
RUN chmod -R 777 /root/.cache/ms-playwright && npx playwright install --with-deps

# Копируем все файлы проекта в контейнер
COPY . .

# Открываем порт, который будет использовать сервер
EXPOSE 3000

# Запуск сервера при старте контейнера
CMD ["npm", "start"]
