const express = require("express");
const router = express.Router();

const { generateQuestions,analyzeAnswer } = require("../controllers/aiController");
const upload = require("../middleware/upload");
// POST /api/ai/questions
router.post("/questions", generateQuestions);
router.post("/analyze", upload.single("video"), analyzeAnswer);
module.exports = router;