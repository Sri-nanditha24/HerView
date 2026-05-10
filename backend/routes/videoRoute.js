const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");

const router = express.Router();
//const upload = multer({ dest: "uploads/" });
const path = require("path");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + ".jpg");
  },
});
const upload = multer({ storage });
// temporary memory store
let frameData = {};

router.post("/frame-analysis", upload.single("frame"), (req, res) => {
  const filePath = req.file.path;
  const index = req.body.index;

  exec(`python analyze_frame.py ${filePath}`, (err, stdout) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error");
    }

    const result = JSON.parse(stdout);

    if (!frameData[index]) frameData[index] = [];
    frameData[index].push(result.status);
    console.log("FrameData:",frameData);
    res.json(result);
  });
});

module.exports = { router, frameData };