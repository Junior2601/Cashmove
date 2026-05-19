const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const errorHandler = require("./middlewares/error.middleware");
const { startExpirationJob } = require('./jobs/expireTransactions');

const app = express();

// Démarrer le cron job pour l'expiration des transactions
startExpirationJob(2);

// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(errorHandler);
app.use("/api", routes);


// Route test
app.get("/", (req, res) => {
  res.send("API is running...");
});

module.exports = app;