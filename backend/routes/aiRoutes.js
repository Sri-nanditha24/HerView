const express = require("express");
const router = express.Router();

const { generateQuestions } = require("../controllers/aiController");

// POST /api/ai/questions
router.post("/questions", generateQuestions);

module.exports = router;