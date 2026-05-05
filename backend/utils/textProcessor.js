const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔥 Models fallback list
const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

// 🔥 Fallback function
async function callWithFallback(prompt) {
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      console.log(`Trying model: ${modelName}`);

      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      console.log(`✅ Success with ${modelName}`);
      return text;

    } catch (err) {
      console.log(`❌ Failed with ${modelName}:`, err.message);
      lastError = err;
    }
  }

  throw lastError;
}

// 🔥 Main extraction function
exports.extractImportantData = async (text) => {
  const prompt = `
You are an expert resume analyzer.

Extract the following from the resume:

1. Skills (technical skills, programming languages, tools)
2. Projects (project names or descriptions)
3. Keywords (important concepts, domains, technologies)

⚠️ Rules:
- Return ONLY valid JSON
- No explanation
- No extra text

Return format:
{
  "skills": ["skill1", "skill2"],
  "projects": ["project1", "project2"],
  "keywords": ["keyword1", "keyword2"]
}

Resume:
${text}
`;

  try {
    const aiText = await callWithFallback(prompt);

    // ✅ Safe JSON parsing
    let extracted;
    try {
      extracted = JSON.parse(aiText);
    } catch (err) {
      console.log("⚠️ JSON parse failed, using fallback structure");

      extracted = {
        skills: [],
        projects: [],
        keywords: [],
      };
    }

    return extracted;

  } catch (error) {
    console.error("❌ Extraction Error:", error.message);

    return {
      skills: [],
      projects: [],
      keywords: [],
    };
  }
};