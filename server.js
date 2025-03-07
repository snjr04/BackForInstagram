const express = require("express");
const { chromium } = require("playwright");
const cors = require("cors");

const PORT = 30000;

const app = express();
app.use(express.json());
app.use(cors());

function validateCredentials(username, password) {
    if (!username || !password) {
        return { valid: false, message: "Логин и пароль обязательны!" };
    }

    if (password.length < 6) {
        return { valid: false, message: "Пароль должен быть минимум 6 символов." };
    }

    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
        return { valid: false, message: "Логин должен содержать только буквы, цифры и точки/подчеркивания." };
    }

    return { valid: true };
}

app.post("/check", async (req, res) => {
    console.log("Новый POST-запрос на /check", req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
        console.log("Ошибка: пустые поля!");
        return res.status(400).json({ error: "Заполните все поля!" });
    }

    const validation = validateCredentials(username, password);
    if (!validation.valid) {
        console.log("Ошибка валидации:", validation.message);
        return res.status(400).json({ error: validation.message });
    }

    console.log(`Начинаем проверку логина для пользователя: ${username}`);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        await page.goto("https://www.instagram.com/accounts/login/");
        console.log("Загружена страница авторизации...");

        await page.waitForSelector("input[name='username']", { timeout: 5000 });

        await page.fill("input[name='username']", username);
        await page.fill("input[name='password']", password);
        await page.click("button[type='submit']");

        // Ожидание изменения URL
        let loginSuccess = false;
        for (let i = 0; i < 10; i++) {  // Ждём до 10 секунд
            await page.waitForTimeout(1000);
            const currentUrl = page.url();
            console.log("Текущий URL:", currentUrl);

            if (currentUrl !== "https://www.instagram.com/accounts/login/") {
                loginSuccess = true;
                break;
            }
        }

        if (loginSuccess) {
            console.log(`Пользователь ${username} успешно вошел в аккаунт.`);
            await browser.close();
            return res.json({ success: true, message: "Успешный вход в Instagram" });
        } else {
            console.log("Ошибка входа: URL не изменился.");
            await browser.close();
            return res.status(401).json({ success: false, message: "Неверный логин или пароль" });
        }

    } catch (error) {
        console.error("Ошибка при входе в Instagram:", error);
        await browser.close();
        return res.status(500).json({ error: "Ошибка сервера" });
    }
});

app.get("/", (req, res) => {
    console.log("Новый GET-запрос на /");
    res.send("Сервер работает!");
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
