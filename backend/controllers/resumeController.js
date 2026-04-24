const pdfParse = require("pdf-parse");
const fs = require("fs");

exports.uploadResume = async (req, res) => {
  try {
    console.log("File received:", req.file);

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);

    res.json({ text: pdfData.text });

  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};