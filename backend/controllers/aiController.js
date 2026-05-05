const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];



async function callWithFallback(prompt) {
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      console.log(`  Trying model: ${modelName}`);
      const model  = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text   = await result.response.text();
      console.log(`${modelName} succeeded`);
      return text;
    } catch (error) {
      lastError    = error;
      const msg    = (error.message || '').toLowerCase();
      const reason = msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')
        ? 'rate limited'
        : msg.includes('404') || msg.includes('not found') || msg.includes('not supported')
          ? 'unavailable'
          : 'error';
      console.warn(`${modelName} ${reason}: ${error.message}`);
    }
  }

  throw new Error(`All Gemini models failed. Last: ${lastError?.message}`);
}

exports.generateQuestions = async (req, res) => {
  try {
    const { text, extracted } = req.body;

    const prompt = `
You are an interview assistant.
Candidate Skills: ${extracted?.skills?.join(", ") || ""}
Keywords: ${extracted?.keywords?.join(", ") || ""}

Resume:
${text.slice(0, 1500)}

Task:
- Generate 1 TECHNICAL question (from skills/projects)
- Generate 1 BEHAVIOURAL question(from experience/achievements)
Rules:
- Do NOT include any introduction or explanation
- Do NOT include phrases like "Here are the questions"
- Output ONLY the questions
- Keep them concise and professional

Format:
Technical:
1.
Behavioural:
1.
`;

    const result = await callWithFallback(prompt);
    const output = result; 
    
    // 🔥 ADD THIS BLOCK HERE
const lines = output.split("\n").map(l => l.trim()).filter(Boolean);

let technical = [];
let behavioural = [];
let current = "technical";


lines.forEach(line => {
  if (line.toLowerCase().includes("behavioural")) {
    current = "behavioural";
  } else if (line.match(/^\d+\./)) {
    if (current === "technical") technical.push(line);
    else behavioural.push(line);
  }
});

if (!technical.length && !behavioural.length) {
  return res.json({
    questions: [
      "Explain one project you worked on.",
      "Tell me about a challenge you faced."
    ]
  });
}

// 🔥 REPLACE OLD RESPONSE WITH THIS
res.json({
  questions: [technical[0], behavioural[0]].filter(Boolean)
});

  } catch (error) {
    console.log("GEMINI ERROR:", error.message);
    res.status(500).json({ error: "Gemini failed" });
  }
};

exports.analyzeAnswer = async (req, res) => {
  try {
    const videoPath = req.file?.path;
    const { question, index, transcript } = req.body;

    console.log("Video:", videoPath);
    console.log("Question:", question);
    console.log("Index:", index);
    console.log("Transcript:", transcript);

    // 🔥 If no speech detected
    if (!transcript) {
      return res.json({
        confidence: "Low",
        naturalness: "Unknown",
        clarity: "No speech detected",
        feedback: "Please speak clearly",
      });
    }

    // 🔥 AI Prompt
    const prompt = `
You are an human-like interview evaluator.
The goal is NOT to judge grammar strictly.

Evaluate the candidate based on:

1. Does the answer make logical sense?
2. Did the candidate understand the question?
3. Is the explanation natural (like normal human speaking)?
4. Confidence level (based on flow, not grammar perfection)

⚠️ Important Rules:
- Ignore minor grammar mistakes
- Do NOT penalize broken English
- Focus on clarity of ideas and thought process
- Value natural speaking over perfect sentences

Question:
${question}

Candidate Answer:
${transcript}


Return ONLY valid JSON:
{
  "confidence": "...",
  "understanding": "...",
  "naturalness": "...",
  "clarity": "...",
  "feedback": "Explain in a friendly way, and very brief and concise"
}
`;

    const aiText = await callWithFallback(prompt);

    let result;

    try {
      // 🔥 Clean JSON (important)
      const cleaned = aiText.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.log("JSON parse failed, using fallback");

      result = {
        confidence: "Moderate",
        naturalness: "Somewhat natural",
        clarity: "Average",
        feedback: "Try to improve structure",
      };
    }

    // ✅ FINAL RESPONSE (ONLY ONCE)
    res.json({
      videoPath,
      question,
      index,
      analysis: result
    });
    
  } catch (err) {
    console.error("Analyze Error:", err.message);

    res.status(500).json({
      confidence: "Error",
      naturalness: "Error",
      clarity: "Error",
      feedback: "AI failed, try again",
    });
  }
};