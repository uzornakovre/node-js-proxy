const http = require("http");
const httpProxy = require("http-proxy");
const net = require("net");
const { PORT, HOST, USERNAME, PASSWORD } = require("./config");

const proxy = httpProxy.createProxyServer({});
const MAX_CONNECTIONS = 100;
let activeConnections = 0;

// Функция проверки авторизации
const auth = (req) => {
  const authHeader = req.headers["proxy-authorization"];
  if (!authHeader) return false;
  const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString(
    "utf-8"
  );
  const [user, pass] = credentials.split(":");
  return user === USERNAME && pass === PASSWORD;
};

// Функция закрытия соединений
const closeSockets = (clientSocket, serverSocket) => {
  if (clientSocket && !clientSocket.destroyed) clientSocket.destroy();
  if (serverSocket && !serverSocket.destroyed) serverSocket.destroy();
};

// Создаем HTTP-сервер
const server = http.createServer((req, res) => {
  console.log(`Запрос: ${req.method} ${req.url}`);

  if (!auth(req)) {
    res.writeHead(407, { "Proxy-Authenticate": 'Basic realm="Proxy"' });
    return res.end("407 Proxy Authentication Required");
  }

  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    console.error("Ошибка проксирования:", err);
    if (!res.headersSent) res.writeHead(502);
    res.end("Ошибка соединения через прокси");
  });
});

// Обрабатываем CONNECT-запросы (HTTPS)
server.on("connect", (req, clientSocket, head) => {
  console.log(`CONNECT-запрос на ${req.url}`);

  if (!auth(req)) {
    clientSocket.write(
      'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Proxy"\r\n\r\n'
    );
    return clientSocket.end();
  }

  const [hostname, port] = req.url.split(":");
  const targetPort = parseInt(port, 10) || 443;
  const serverSocket = net.connect(targetPort, hostname, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    serverSocket.write(head);
    clientSocket.pipe(serverSocket);
    serverSocket.pipe(clientSocket);
  });

  // Закрываем соединения в случае ошибок
  serverSocket.on("error", (err) => {
    console.error("Ошибка сервера:", err);
    clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    closeSockets(clientSocket, serverSocket);
  });

  clientSocket.on("error", (err) => {
    console.error("Ошибка клиента:", err);
    closeSockets(clientSocket, serverSocket);
  });

  clientSocket.on("close", () => closeSockets(clientSocket, serverSocket));
  serverSocket.on("close", () => closeSockets(clientSocket, serverSocket));

  // Добавляем тайм-аут для закрытия неактивных соединений
  const timeout = setTimeout(() => {
    console.log("Принудительное закрытие соединений (тайм-аут)");
    closeSockets(clientSocket, serverSocket);
  }, 30000);

  timeout.unref(); // Не держит процесс в памяти
});

// Ограничиваем количество соединений
server.on("connection", (socket) => {
  if (activeConnections >= MAX_CONNECTIONS) {
    console.log("Превышено количество соединений, закрываем новое");
    return socket.destroy();
  }

  activeConnections++;
  socket.on("close", () => activeConnections--);
});

// Убираем общий тайм-аут сервера, чтобы он не закрывал активные соединения
// server.setTimeout(30000); <-- Больше не нужен

server.on("error", (err) => console.error("Ошибка сервера:", err));

server.listen(PORT, HOST, () => {
  console.log(`Прокси-сервер работает на ${HOST}:${PORT}`);
});
