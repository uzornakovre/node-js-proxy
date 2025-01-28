const express = require("express");
const app = express();

const { PORT, HOST } = require("./config");

// app.get("/ping", (req, res) => {
//   res.send("pong");
// });

// app.listen(PORT, HOST, () => {
//   console.log(`Сервер запущен на порту ${PORT}`);
// });

const socks5 = require("socks5");

const server = socks5.createServer((info, accept, deny) => {
  const socket = accept(true);
  if (socket) {
    console.log("SOCKS5-соединение установлено:", info.dstAddr, info.dstPort);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`SOCKS5-прокси-сервер запущен на порту ${PORT}`);
});
