const http = require("http");
const httpProxy = require("http-proxy");
const net = require("net");
const { PORT, HOST, USERNAME, PASSWORD } = require("./config");

const proxy = httpProxy.createProxyServer({});
const MAX_CONNECTIONS = 100; // Максимальное количество активных соединений
let activeConnections = 0; // Счётчик активных соединений

// Функция для проверки авторизации через Proxy-Authorization заголовок
const auth = (req) => {
  const authHeader = req.headers["proxy-authorization"];
  if (!authHeader) {
    console.log("Нет заголовка Proxy-Authorization");
    return false;
  }

  const base64Credentials = authHeader.split(" ")[1];
  if (!base64Credentials) return false;

  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "utf-8"
  );
  const [user, pass] = credentials.split(":");

  console.log(`Пытаемся авторизовать пользователя: ${user}`);
  return user === USERNAME && pass === PASSWORD;
};

// Основной HTTP сервер
const server = http.createServer((req, res) => {
  console.log(`Запрос: ${req.method} ${req.url}`);

  if (!auth(req)) {
    res.writeHead(407, { "Proxy-Authenticate": 'Basic realm="Proxy"' });
    return res.end("407 Proxy Authentication Required");
  }

  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    console.error("Ошибка проксирования:", err.message);
    res.writeHead(502);
    res.end("Ошибка соединения через прокси");
  });
});

// Обработка CONNECT-запросов для HTTPS
server.on("connect", (req, clientSocket, head) => {
  console.log(`CONNECT-запрос на ${req.url}`);

  if (!auth(req)) {
    console.log("Не прошли авторизацию. Отправляем 407.");
    clientSocket.write(
      'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Proxy"\r\n\r\n'
    );
    return clientSocket.destroy();
  }

  if (activeConnections >= MAX_CONNECTIONS) {
    console.log("Превышено количество активных соединений. Ожидаем...");
    clientSocket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
    return clientSocket.destroy();
  }

  activeConnections++;

  const { port, hostname } = new URL(`https://${req.url}`);
  console.log(`Попытка подключения к серверу: ${hostname}:${port}`);

  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  // Обработчики ошибок соединения с сервером
  serverSocket.on("error", (err) => {
    console.error("Ошибка при соединении с целевым сервером:", err.message);
    clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    clientSocket.destroy();
  });

  clientSocket.on("error", (err) => {
    console.error("Ошибка клиентского соединения:", err.message);
    serverSocket.destroy();
  });

  // Закрытие соединений
  const closeConnection = () => {
    console.log("Соединение закрыто");
    serverSocket.destroy();
    clientSocket.destroy();
    activeConnections--;
  };

  clientSocket.on("close", closeConnection);
  serverSocket.on("close", closeConnection);

  // Тайм-ауты
  const socketTimeout = 30000;
  clientSocket.setTimeout(socketTimeout, () => {
    console.log("Тайм-аут клиентского соединения");
    closeConnection();
  });

  serverSocket.setTimeout(socketTimeout, () => {
    console.log("Тайм-аут серверного соединения");
    closeConnection();
  });
});

// Обработка ошибок HTTP-сервера
server.on("error", (err) => {
  console.error("Ошибка HTTP-сервера:", err);
});

// Запуск HTTP/HTTPS-прокси с авторизацией
server.listen(PORT, HOST, () => {
  console.log(`HTTP/HTTPS-прокси с авторизацией работает на ${HOST}:${PORT}`);
});
