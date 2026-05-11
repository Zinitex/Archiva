require("dotenv").config();
const app = require("./src/app");
const sequelize = require("./src/config/database");

require("./src/models");

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
    console.log("Models synchronized");

    app.listen(PORT, () => {
      console.log(`Archiva running on http://localhost:${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
