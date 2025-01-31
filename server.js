const http = require("http");
const httpProxy = require("http-proxy");
const net = require("net");
const { PORT, HOST, USERNAME, PASSWORD } = require("./config");

const proxy = httpProxy.createProxyServer({});

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

// Обработка ошибок для всех запросов
const handleRequestError = (err, res) => {
  console.error("Ошибка проксирования:", err);
  res.writeHead(502);
  res.end("Ошибка соединения через прокси");
};

// Основной HTTP сервер
const server = http.createServer((req, res) => {
  console.log(`Запрос: ${req.method} ${req.url}`);

  // Если авторизация не пройдена
  if (!auth(req)) {
    res.writeHead(407, { "Proxy-Authenticate": 'Basic realm="Proxy"' });
    return res.end("407 Proxy Authentication Required");
  }

  // Прокси-запрос
  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    handleRequestError(err, res);
  });
});

// Обработка CONNECT-запросов
server.on("connect", (req, clientSocket, head) => {
  console.log(`CONNECT-запрос на ${req.url}`);

  if (!auth(req)) {
    console.log("Не прошли авторизацию. Отправляем 407.");
    clientSocket.write(
      'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Proxy"\r\n\r\n'
    );
    return clientSocket.end(); // Завершаем соединение с клиентом
  }

  const { port, hostname } = new URL(`https://${req.url}`);
  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on("error", (err) => {
    console.error("Ошибка при соединении с целевым сервером:", err);
    clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    clientSocket.end();
  });

  clientSocket.on("error", (err) => {
    console.error("Ошибка клиента:", err);
    serverSocket.end();
  });

  clientSocket.on("close", () => {
    console.log("Клиентское соединение закрыто");
    serverSocket.end();
  });

  serverSocket.on("close", () => {
    console.log("Серверное соединение закрыто");
    clientSocket.end();
  });
});

// Обработка ошибок HTTP-сервера
server.on("error", (err) => {
  console.error("Ошибка HTTP-сервера:", err);
});

// Тайм-ауты для сервера и сокетов
server.setTimeout(30000, () => {
  console.log("Тайм-аут сервера");
  server.close();
});

server.listen(PORT, HOST, () => {
  console.log(`HTTP/HTTPS-прокси с авторизацией работает на ${HOST}:${PORT}`);
});
