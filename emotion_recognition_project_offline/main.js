window.onload = function () {
  const video = document.getElementById('video');
  const overlay = document.getElementById('overlay');
  const context = overlay.getContext('2d');
  const emotionDisplay = document.getElementById('emotion');
  let audioContext, analyser, dataArray;
  let currentDetectedEmotion = 'N/A';

  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models').catch(e => console.error('TinyFaceDetector model failed to load:', e)),
    faceapi.nets.faceExpressionNet.loadFromUri('./models').catch(e => console.error('Expression model failed to load:', e))
  ])
    .then(startVideo)
    .catch(err => {
      alert("Model load failed: " + err.message);
      console.error("Model loading error:", err);
    });

  function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        video.srcObject = stream;
        processAudio(stream);
      })
      .catch(err => {
        alert('Error accessing media: ' + err.message);
        console.error('Error accessing media:', err);
      });
  }

  video.addEventListener('play', () => {
    setInterval(async () => {
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
        .withFaceExpressions();

      context.clearRect(0, 0, overlay.width, overlay.height);
      let faceEmotion = 'neutral';

      if (detections) {
        const resized = faceapi.resizeResults(detections, {
          width: overlay.width,
          height: overlay.height
        });
        faceapi.draw.drawDetections(overlay, resized);
        const expressions = detections.expressions;
        faceEmotion = Object.keys(expressions).reduce((a, b) =>
          expressions[a] > expressions[b] ? a : b
        );
      }

      const voiceTone = analyzeVoiceTone();
      const combinedEmotion = combineModalities(faceEmotion, voiceTone);
      emotionDisplay.textContent = `Detected Emotion: ${combinedEmotion}`;
      currentDetectedEmotion = combinedEmotion;
      showSupportMessage(combinedEmotion);
    }, 1000);
  });

  function processAudio(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
  }

  function analyzeVoiceTone() {
    if (!analyser) return 'neutral';
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    if (avg > 100) return 'angry';
    if (avg > 60) return 'happy';
    return 'calm';
  }

  function combineModalities(face, voice) {
    if (face === voice) return face;
    if (face === 'angry' || voice === 'angry') return 'angry';
    if (face === 'happy' || voice === 'happy') return 'happy';
    return 'neutral';
  }

  function showSupportMessage(emotion) {
    const supportDiv = document.getElementById('supportMessage');
    let message = '';

    if (emotion === 'angry') {
      message = "It’s okay to feel angry. Try taking a deep breath, count to ten, or step outside for a break. 💨🚶‍♀️";
    } else if (emotion === 'sad' || emotion === 'depressed') {
      message = "You're not alone. Talk to a friend, listen to calming music, or write in a journal. 💙📖🎵";
    } else if (emotion === 'calm') {
      message = "You seem calm. Stay centered and enjoy the moment. 🧘‍♂️";
    } else if (emotion === 'happy') {
      message = "You're glowing! Keep spreading that joy. 😊✨";
    } else {
      message = '';
    }

    supportDiv.textContent = message;
  }

  window.checkAccuracy = function () {
    const actual = document.getElementById('actualEmotion').value;
    const detected = currentDetectedEmotion;
    const result = actual === detected
      ? "✔️ Match"
      : `✖️ Mismatch (Detected: ${detected})`;
    document.getElementById('accuracyResult').textContent = `Accuracy Check: ${result}`;
  };
};
