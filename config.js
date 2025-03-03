require("dotenv").config();

const {
  PORT = 8080,
  PORT_NA,
  HOST = "0.0.0.0",
  PRIVKEY_PATH,
  CERT_PATH,
  CHAIN_PATH,
  USERNAME,
  PASSWORD,
  USER_LIST,
} = process.env;

module.exports = {
  PORT,
  PORT_NA,
  HOST,
  PRIVKEY_PATH,
  CERT_PATH,
  CHAIN_PATH,
  USERNAME,
  PASSWORD,
  USER_LIST
};
