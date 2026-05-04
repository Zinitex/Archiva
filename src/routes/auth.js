const router = require("express").Router();
const { register, login, me } = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);

router.get("/status", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    timestamp: new Date(),
    environment: process.env.NODE_ENV || "development",
    version: process.version,
  });
});

module.exports = router;
