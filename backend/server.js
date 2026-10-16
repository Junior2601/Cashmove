require("dotenv").config();
const http = require("http");
const app = require("./src/app.js");
const realtime = require("./src/realtime");

const PORT = process.env.PORT || 4000;

// Serveur HTTP partagé par l'API REST et Socket.IO (même domaine, cahier V2 · §8)
const server = http.createServer(app);
realtime.init(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
