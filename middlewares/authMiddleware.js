const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token no encontrado o formato incorrecto" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
            username: decoded.username, // Incluye username si está en el token
        };

        next(); // Continúa con la siguiente función
    } catch (error) {
        console.error("Error en autenticación:", error.message);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expirado" });
        } else if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Token no válido" });
        }

        return res.status(500).json({ message: "Error en la autenticación" });
    }
};

module.exports = authMiddleware;