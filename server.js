const express = require("express");
const app = express();

const { PORT, HOST } = require("./config");

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.listen(PORT, HOST, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
