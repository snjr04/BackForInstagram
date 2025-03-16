# Используем официальный образ Node.js
FROM node:16

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Устанавливаем Playwright и его зависимости
RUN npx playwright install --with-deps

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "server.js"]