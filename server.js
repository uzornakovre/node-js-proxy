const http = require("http");
const httpProxy = require("http-proxy");

const { PORT, HOST } = require("./config");

const proxy = httpProxy.createProxyServer({ secure: false });

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    console.error("Ошибка:", err);
    res.writeHead(502);
    res.end("Ошибка прокси");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`HTTP-прокси работает на порту ${PORT}`);
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
