const jwt = require("jsonwebtoken");

const SECRET = () =>
  process.env.VANTAGE_JWT_SECRET || process.env.JWT_SECRET;

function vantageAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, SECRET(), { algorithms: ["HS256"] });
    req.user = {
      username: payload.sub || payload.username,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { vantageAuth };
