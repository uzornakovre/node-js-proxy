// const express = require("express");
// const app = express();

const { PORT, HOST } = require("./config");

const http = require("http");
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  proxy.web(req, res, { target: req.url, changeOrigin: true }, (err) => {
    console.error("Ошибка:", err);
    res.writeHead(502);
    res.end("Прокси-сервер: ошибка соединения");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`HTTP-прокси запущен на порту ${PORT}`);
});

// app.get("/ping", (req, res) => {
//   res.send("pong");
// });

// app.listen(PORT, HOST, () => {
//   console.log(`Сервер запущен на порту ${PORT}`);
// });

// const socks5 = require("socks5");

// const server = socks5.createServer((info, accept, deny) => {
//   const socket = accept(true);
//   if (socket) {
//     console.log("SOCKS5-соединение установлено:", info.dstAddr, info.dstPort);
//   }
// });

// server.listen(PORT, HOST, () => {
//   console.log(`SOCKS5-прокси-сервер запущен на порту ${PORT}`);
// });
