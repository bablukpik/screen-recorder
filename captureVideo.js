let preview = document.getElementById("preview");
let recording = document.getElementById("recording");
let startButton = document.getElementById("startButton");
let stopButton = document.getElementById("stopButton");
let downloadButton = document.getElementById("downloadButton");
let logElement = document.getElementById("log");

let recordingTimeMS = 5000;
let constraints = { audio: true };
let data = [];

// Logs
function log(msg) {
    logElement.innerHTML += msg + "\n";
}

// Delays
function wait(delayInMS) {
    return new Promise(resolve => setTimeout(resolve, delayInMS));
}

// Start Recording
function startRecording(stream, lengthInMS) {
    let recorder = new MediaRecorder(stream);

    recorder.ondataavailable = event => data.push(event.data); //chunks.push(event.data);
    recorder.start();
    log(recorder.state + " for " + (lengthInMS / 1000) + " seconds...");

    let stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve; // this will do nothing until the onstop method is called
        recorder.onerror = event => reject(event.name);
    });

    let recorded = wait(lengthInMS).then(
        () => recorder.state == "recording" && recorder.stop());

    return Promise.all([
            stopped,
            recorded
        ])
        .then(() => data);
}

// Stop Recording
function stop(stream) {
    stream.getTracks().forEach(track => track.stop());
}

// Getting an input stream and setting up the recorder
startButton.addEventListener("click", function() {
    navigator.mediaDevices.getUserMedia({
            // constraints
            video: true,
            audio: true
        }).then(stream => {
            preview.srcObject = stream;
            downloadButton.href = stream;
            preview.captureStream = preview.captureStream || preview.mozCaptureStream;
            return new Promise(resolve => preview.onplaying = resolve);
        }).then(() => startRecording(preview.captureStream(), recordingTimeMS))
        .then(recordedChunks => {
            let recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
            recording.src = URL.createObjectURL(recordedBlob);
            downloadButton.href = recording.src;
            downloadButton.download = "RecordedVideo.webm";

            log("Successfully recorded " + recordedBlob.size + " bytes of " +
                recordedBlob.type + " media.");
        })
        .catch(log);
}, false);
stopButton.addEventListener("click", function() {
    stop(preview.srcObject);
}, false);