// extract important keywords and sections

exports.extractImportantData = (text) => {
  const lowerText = text.toLowerCase();

  let extracted = {
    skills: [],
    projects: [],
    keywords: [],
  };

  // 🔹 Skill keywords (you can expand later)
  const skillList = [
    "react",
    "node",
    "javascript",
    "python",
    "java",
    "mongodb",
    "machine learning",
    "ai",
    "html",
    "css",
  ];

  skillList.forEach((skill) => {
    if (lowerText.includes(skill)) {
      extracted.skills.push(skill);
    }
  });

  // 🔹 Detect projects (simple logic)
  if (lowerText.includes("project")) {
    extracted.projects.push("Project experience found");
  }

  // 🔹 General keywords
  if (lowerText.includes("api")) extracted.keywords.push("API");
  if (lowerText.includes("database")) extracted.keywords.push("Database");
  if (lowerText.includes("frontend")) extracted.keywords.push("Frontend");
  if (lowerText.includes("backend")) extracted.keywords.push("Backend");

  return extracted;
};