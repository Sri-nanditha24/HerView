const pdfParse = require("pdf-parse");
const fs = require("fs");
const { extractImportantData } = require("../utils/textProcessor");

exports.uploadResume = async (req, res) => {
  try {
    console.log("File received:", req.file);

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    let rawText = pdfData.text;

    // CLEANING
    const cleanText = rawText
      .replace(/\r\n/g, "\n")       // fix line breaks
      .replace(/\n+/g, "\n")       // remove extra newlines
      .replace(/\s+/g, " ")        // remove extra spaces
      .trim();
    const extractedData = extractImportantData(cleanText);
    res.json({ text: cleanText, extractedData });

  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};