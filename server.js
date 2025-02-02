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
    return false; // Авторизация не прошла
  }

  // Расшифровка базовых данных авторизации
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "utf-8"
  );
  const [user, pass] = credentials.split(":");

  console.log(`Пытаемся авторизовать пользователя: ${user}`);
  return user === USERNAME && pass === PASSWORD; // Сравнение с ожидаемыми значениями
};

// Обработка ошибок при проксировании
const handleRequestError = (err, res) => {
  console.error("Ошибка проксирования:", err);
  res.writeHead(502);
  res.end("Ошибка соединения через прокси");
};

// Обработка тайм-аутов для клиента и сервера
const handleTimeout = (socket, socketType) => {
  console.log(`Тайм-аут на ${socketType} сокете`);
  socket.end(); // Закрытие соединения при тайм-ауте
};

// Основной HTTP сервер
const server = http.createServer((req, res) => {
  console.log(`Запрос: ${req.method} ${req.url}`);

  // Если авторизация не пройдена
  if (!auth(req)) {
    res.writeHead(407, { "Proxy-Authenticate": 'Basic realm="Proxy"' });
    return res.end("407 Proxy Authentication Required");
  }

  // Прокси-запрос, проксируем на целевой сервер
  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    handleRequestError(err, res);
  });
});

// Обработка CONNECT-запросов для HTTPS
server.on("connect", (req, clientSocket, head) => {
  console.log(`CONNECT-запрос на ${req.url}`);

  // Проверка авторизации для CONNECT-запроса
  if (!auth(req)) {
    console.log("Не прошли авторизацию. Отправляем 407.");
    clientSocket.write(
      'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Proxy"\r\n\r\n'
    );
    return clientSocket.end(); // Закрываем соединение с клиентом
  }

  const { port, hostname } = new URL(`https://${req.url}`);
  console.log(`Попытка подключения к серверу: ${hostname}:${port}`);

  // Создание соединения с целевым сервером
  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    serverSocket.write(head);
    serverSocket.pipe(clientSocket); // Пайпинг данных между сервером и клиентом
    clientSocket.pipe(serverSocket);
  });

  // Обработка ошибок соединения с целевым сервером
  serverSocket.on("error", (err) => {
    console.error("Ошибка при соединении с целевым сервером:", err);
    clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    clientSocket.end();
  });

  // Обработка ошибок клиента
  clientSocket.on("error", (err) => {
    console.error("Ошибка клиента:", err);
    serverSocket.end();
  });

  // Закрытие соединения с клиентом
  clientSocket.on("close", () => {
    console.log("Клиентское соединение закрыто");
    serverSocket.end();
  });

  // Закрытие соединения с сервером
  serverSocket.on("close", () => {
    console.log("Серверное соединение закрыто");
    clientSocket.end();
  });

  // Тайм-ауты для сокетов
  clientSocket.setTimeout(30000); // Тайм-аут для клиентского сокета
  serverSocket.setTimeout(30000); // Тайм-аут для серверного сокета

  clientSocket.on("timeout", () => handleTimeout(clientSocket, "клиент"));
  serverSocket.on("timeout", () => handleTimeout(serverSocket, "сервер"));
});

// Ограничение на количество активных соединений
server.on("connect", (req, clientSocket, head) => {
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log("Превышено количество активных соединений. Ожидаем...");
    clientSocket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
    return clientSocket.end(); // Закрытие соединения с клиентом, если превышен лимит
  }

  activeConnections++;

  // Ваш основной код для обработки запросов (вышеописан)

  // Закрытие соединений и уменьшение счётчика активных соединений
  clientSocket.on("close", () => {
    activeConnections--;
  });
});

// Обработка ошибок HTTP-сервера
server.on("error", (err) => {
  console.error("Ошибка HTTP-сервера:", err);
});

// Тайм-аут для самого сервера
server.setTimeout(30000, () => {
  console.log("Тайм-аут сервера");
  server.close();
});

// Запуск HTTP/HTTPS-прокси с авторизацией
server.listen(PORT, HOST, () => {
  console.log(`HTTP/HTTPS-прокси с авторизацией работает на ${HOST}:${PORT}`);
});
