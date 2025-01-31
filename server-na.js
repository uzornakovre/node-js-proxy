const http = require("http");
const httpProxy = require("http-proxy");

const { PORT_NA, HOST } = require("./config");

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  console.log(`Запрос: ${req.method} ${req.url}`);

  if (!req.url.startsWith("http")) {
    res.writeHead(400);
    return res.end("Ошибка: некорректный URL");
  }

  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    console.error("Ошибка проксирования:", err);
    res.writeHead(502);
    res.end("Ошибка соединения через прокси");
  });
});

server.on("connect", (req, clientSocket, head) => {
  console.log(`CONNECT-запрос на ${req.url}`);

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

server.listen(PORT_NA, HOST, () => {
  console.log(`HTTP/HTTPS-прокси работает на ${HOST}:${PORT_NA}`);
});

// const fs = require("fs");
// const https = require("https");
// const http = require("http");
// const httpProxy = require("http-proxy");

// const { PORT, HOST, PRIVKEY_PATH, CERT_PATH, CHAIN_PATH } = require("./config");

// const proxy = httpProxy.createProxyServer({});

// const options = {
//   key: fs.readFileSync(PRIVKEY_PATH),
//   cert: fs.readFileSync(CERT_PATH),
//   ca: fs.readFileSync(CHAIN_PATH),
// };

// const server = https.createServer(options, (req, res) => {
//   console.log(`${req.method} ${req.url}`);

//   proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
//     console.error("Ошибка:", err);
//     res.writeHead(502);
//     res.end("Прокси-сервер: ошибка соединения");
//   });
// });

// server.listen(PORT, HOST, () => {
//   console.log(`HTTPS-прокси запущен на порту ${PORT}`);
// });

// PRIVKEY_PATH='/etc/letsencrypt/live/uzornakovre.freemyip.com/privkey.pem'
// CERT_PATH='/etc/letsencrypt/live/uzornakovre.freemyip.com/cert.pem'
// CHAIN_PATH='/etc/letsencrypt/live/uzornakovre.freemyip.com/chain.pem'
