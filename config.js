require("dotenv").config();

const { PORT = 8080, HOST = "0.0.0.0" } = process.env;

module.exports = {
  PORT,
  HOST,
};
