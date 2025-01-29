require("dotenv").config();

const {
  PORT = 8080,
  HOST = "0.0.0.0",
  PRIVKEY_PATH,
  CERT_PATH,
  CHAIN_PATH,
} = process.env;

module.exports = {
  PORT,
  HOST,
  PRIVKEY_PATH,
  CERT_PATH,
  CHAIN_PATH,
};
