const jwt = require("jsonwebtoken");

// Vérifier token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Token manquant",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { id, role }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token invalide",
    });
  }
};

// Vérifier rôle
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé",
      });
    }
    next();
  };
};


// Le token optionnel - lit le user si token présent, continue sans bloquer si absent
const optionalToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      // Token invalide ignoré, req.user reste undefined
    }
  }

  next(); // toujours continuer
};


module.exports = {
  verifyToken,
  authorizeRoles,
  optionalToken,
};