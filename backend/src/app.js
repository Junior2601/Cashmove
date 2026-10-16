const express = require("express");
const cors = require("cors");
const compression = require('compression');
const path = require('path');
const routes = require("./routes");
const errorHandler = require("./middlewares/error.middleware");
const { startExpirationJob } = require('./jobs/expireTransactions');
const { startAnnouncementJob } = require('./jobs/announcements');

const app = express();

// Démarrer le cron job pour l'expiration des transactions
startExpirationJob();
startAnnouncementJob();
require('./utils/profitScheduler');

// Middlewares globaux
app.use(compression());
// credentials : le cookie de session client (mc_refresh, SameSite=Lax) doit passer
// entre movecash.site et api.movecash.site
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api", routes);
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Fallback : toutes les requêtes non traitées
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
app.use(errorHandler);


// Route test
// app.get("/", (req, res) => {
//   res.send("API is running...");
// });

module.exports = app;