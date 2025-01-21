import dotenv from "dotenv";
dotenv.config();

const { PORT = 8080 } = process.env;

export default {
  PORT,
};
