const http = require("http");
const httpProxy = require("http-proxy");
const net = require("net");
const { PORT, HOST, USERNAME, PASSWORD } = require("./config");

const proxy = httpProxy.createProxyServer({});
const MAX_CONNECTIONS = 100; // Максимальное количество активных соединений
let activeConnections = 0; // Счётчик активных соединений

// Функция проверки авторизации
const auth = (req) => {
  const authHeader = req.headers["proxy-authorization"];
  if (!authHeader) {
    console.log("Нет заголовка Proxy-Authorization");
    return false;
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "utf-8"
  );
  const [user, pass] = credentials.split(":");

  console.log(`Пытаемся авторизовать пользователя: ${user}`);
  return user === USERNAME && pass === PASSWORD;
};

// Обработка ошибок проксирования
const handleRequestError = (err, res) => {
  console.error("Ошибка проксирования:", err);
  if (!res.headersSent) {
    res.writeHead(502);
  }
  res.end("Ошибка соединения через прокси");
};

// Обработка тайм-аутов
const handleTimeout = (socket, socketType) => {
  console.log(`Тайм-аут на ${socketType} сокете`);
  socket.destroy(); // Закрываем соединение принудительно
};

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
  console.log(`Запрос: ${req.method} ${req.url}`);

  if (!auth(req)) {
    res.writeHead(407, { "Proxy-Authenticate": 'Basic realm="Proxy"' });
    return res.end("407 Proxy Authentication Required");
  }

  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    handleRequestError(err, res);
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
    return clientSocket.end();
  }

  const [hostname, port] = req.url.split(":");
  const targetPort = parseInt(port, 10) || 443;

  console.log(`Перенаправляем соединение на ${hostname}:${targetPort}`);

  const serverSocket = net.connect(targetPort, hostname, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    serverSocket.write(head);
    clientSocket.pipe(serverSocket);
    serverSocket.pipe(clientSocket);
  });

  // Обработка ошибок соединения
  const closeSockets = () => {
    if (!clientSocket.destroyed) clientSocket.destroy();
    if (!serverSocket.destroyed) serverSocket.destroy();
  };

  serverSocket.on("error", (err) => {
    console.error("Ошибка при соединении с целевым сервером:", err);
    clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    closeSockets();
  });

  clientSocket.on("error", (err) => {
    console.error("Ошибка клиента:", err);
    closeSockets();
  });

  clientSocket.on("close", () => {
    console.log("Клиентское соединение закрыто");
    closeSockets();
  });

  serverSocket.on("close", () => {
    console.log("Серверное соединение закрыто");
    closeSockets();
  });

  clientSocket.setTimeout(30000, () => handleTimeout(clientSocket, "клиент"));
  serverSocket.setTimeout(30000, () => handleTimeout(serverSocket, "сервер"));
});

// Ограничение количества активных соединений
server.on("connection", (socket) => {
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log("Превышено количество активных соединений. Отключаем новое.");
    socket.destroy();
  } else {
    activeConnections++;
    socket.on("close", () => {
      activeConnections--;
    });
  }
});

// Обработка ошибок HTTP-сервера
server.on("error", (err) => {
  console.error("Ошибка HTTP-сервера:", err);
});

// Тайм-аут для сервера
server.setTimeout(30000, () => {
  console.log("Тайм-аут сервера");
  server.close();
});

// Запуск прокси-сервера
server.listen(PORT, HOST, () => {
  console.log(`HTTP/HTTPS-прокси с авторизацией работает на ${HOST}:${PORT}`);
});
