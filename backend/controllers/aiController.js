const { GoogleGenerativeAI } = require("@google/generative-ai");

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
- Generate 4 TECHNICAL questions (from skills/projects)
- Generate 2 BEHAVIOURAL questions

Format:
Technical:
1.
2.
3.
4.

Behavioural:
1.
2.
`;

    const result = await callWithFallback(prompt);;
    // const response = await result.response;
    const output = result; 
    // const output = response.text();

    res.json({ questions: output });

  } catch (error) {
    console.log("GEMINI ERROR:", error.message);
    res.status(500).json({ error: "Gemini failed" });
  }
};