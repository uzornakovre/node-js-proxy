const net = require("net");
const http = require("http");

const { PORT, HOST } = require("./config");

// HTTP-прокси для обычных запросов (GET, POST и т. д.)
const server = http.createServer((req, res) => {
  res.writeHead(400);
  res.end("Этот прокси поддерживает только CONNECT-запросы.");
});

// HTTPS-прокси через метод CONNECT (TLS-туннелирование)
server.on("connect", (req, clientSocket, head) => {
  const { port, hostname } = new URL(`https://${req.url}`);

  console.log(`Создание туннеля: ${hostname}:${port}`);

  const serverSocket = net.connect(port || 443, hostname, () => {
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
  console.log(`HTTPS-прокси (CONNECT) запущен на порту ${PORT}`);
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
