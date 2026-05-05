import { useState, useRef } from "react";
import API from "../api";

export default function Home() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef({});
  const isRecordingRef = useRef(false);

  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState({});
  const [analysis, setAnalysis] = useState({});

  // 📁 File upload
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // 📤 Upload + get questions
  const handleUpload = async () => {
    if (!file) return alert("Select file");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      setLoading(true);

      const res = await API.post("/resume/upload", formData);
      setText(res.data.text);

      const res2 = await API.post("/ai/questions", {
        text: res.data.text,
      });

      setQuestions(res2.data.questions || []);
    } catch (err) {
      console.log(err);
      setQuestions(["AI failed"]);
    } finally {
      setLoading(false);
    }
  };

  // 🎥 Recording + Speech
  const startRecording = async (index, questionText) => {
    if (isRecordingRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const currentIndex = index;

    setTranscript((prev) => ({
      ...prev,
      [index]: "",
    }));

    setIsRecording(true);
    isRecordingRef.current = true;

    // 🎙 Speech Recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-IN";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {

        const lastResult = event.results[event.results.length-1];
        const text = lastResult[0].transcript;
        transcriptRef.current[currentIndex] += " "+text;

        setTranscript((prev) => ({
          ...prev,
          [currentIndex]: transcriptRef.current[currentIndex],
        }));
      };

      // 🔥 FIXED BUG 3: Proper restart using ref
      recognition.onend = () => {
        console.log("Recognition ended");
        if (isRecordingRef.current) {
          try{
          console.log("Restarting recognition");
          recognition.start();
          }
          catch(e){
            console.log("Restart failed, retrying...");
            setTimeout(()=> recognition.start(),300);
          }
        }
      };
      recognition.onerror = (event) => {
    if (isRecordingRef.current) {
    recognition.stop();
    setTimeout(() => recognition.start(), 300);
  }
};

      recognition.start();
      recognitionRef.current = recognition;
    }

    // 🎥 Live preview
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    const recorder = new MediaRecorder(stream);
    let chunks = [];

    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });

      const videoURL = URL.createObjectURL(blob);
      document.getElementById(`video-${index}`).src = videoURL;

      // 🔥 Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // 🔥 Stop recording flag first
      setIsRecording(false);
      isRecordingRef.current = false;

      let finalTranscript = transcriptRef.current[index];

      if (!finalTranscript || finalTranscript.trim().length < 5) {
        finalTranscript = "User spoke but speech was unclear";
      }

      console.log("Final Transcript:", finalTranscript);

      // wait for finalization
      setTimeout(async () => {
        const formData = new FormData();
        formData.append("video", blob);
        formData.append("question", questionText);
        formData.append("index", index);
        formData.append("transcript", finalTranscript);

        try {
          const res = await API.post("/ai/analyze", formData);

          setAnalysis((prev) => ({
            ...prev,
            [index]: res.data.analysis,
          }));
        } catch (err) {
          console.log(err);
        }
      }, 1000);

      // stop camera
      stream.getTracks().forEach((track) => track.stop());

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setMediaRecorder(null);
    };

    recorder.start();
    setMediaRecorder(recorder);

    // auto stop after 2 mins
    setTimeout(() => {
      recorder.stop();
    }, 120000);
  };

  // 🎨 UI
  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "auto" }}>
      <h1 style={{ textAlign: "center" }}>Herview 🎤</h1>

      {/* Upload */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <input type="file" onChange={handleFileChange} />
        <br /><br />
        <button onClick={handleUpload}>
          {loading ? "Processing..." : "Upload Resume"}
        </button>
      </div>

      {/* Resume */}
      {text && (
        <div style={{ marginTop: "40px" }}>
          <h3>📄 Resume Text</h3>
          <div style={{ background: "#eee", padding: "10px" }}>
            {text}
          </div>
        </div>
      )}

      {/* Live Video */}
      {questions.length > 0 && (
        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <video ref={videoRef} autoPlay muted width="300" />
        </div>
      )}

      {/* Questions */}
      {questions.map((q, index) => (
        <div key={index} style={{ marginTop: "20px" }}>
          <p>{q}</p>

          <button onClick={() => startRecording(index, q)}>
            Record
          </button>

          {isRecording && (
            <button
              onClick={() => mediaRecorder?.stop()}
              style={{ marginLeft: "10px" }}
            >
              Stop
            </button>
          )}

          {transcript[index] && <p>📝 {transcript[index]}</p>}

          {analysis[index] && (
            <div>
              <p>Confidence: {analysis[index].confidence}</p>
              <p>Naturalness: {analysis[index].naturalness}</p>
              <p>Clarity: {analysis[index].clarity}</p>
              <p>Feedback: {analysis[index].feedback}</p>
            </div>
          )}

          <video id={`video-${index}`} controls width="300" />
        </div>
      ))}
    </div>
  );
}