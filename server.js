const http = require("http");
const httpProxy = require("http-proxy");

const { PORT, HOST, USERNAME, PASSWORD } = require("./config");

const proxy = httpProxy.createProxyServer({});

const auth = (req) => {
  const authHeader = req.headers["proxy-authorization"];
  if (!authHeader) return false;

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "utf-8"
  );
  const [user, pass] = credentials.split(":");

  return user === USERNAME && pass === PASSWORD;
};

const server = http.createServer((req, res) => {
  console.log(`Запрос: ${req.method} ${req.url}`);

  if (!auth(req)) {
    res.writeHead(407, { "Proxy-Authenticate": 'Basic realm="Proxy"' });
    return res.end("407 Proxy Authentication Required");
  }

  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    console.error("Ошибка проксирования:", err);
    res.writeHead(502);
    res.end("Ошибка соединения через прокси");
  });
});

server.on("connect", (req, clientSocket, head) => {
  console.log(`CONNECT-запрос на ${req.url}`);

  if (!auth(req)) {
    clientSocket.write(
      'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Proxy"\r\n\r\n'
    );
    return clientSocket.end();
  }

  const { port, hostname } = new URL(`https://${req.url}`);
  const serverSocket = require("net").connect(port || 443, hostname, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on("error", (err) => {
    console.error("Ошибка CONNECT:", err);
    clientSocket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`HTTP/HTTPS-прокси с авторизацией работает на ${HOST}:${PORT}`);
});
