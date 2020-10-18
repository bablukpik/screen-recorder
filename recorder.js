const start = document.getElementById('recordStart');
const pause = document.getElementById('recordPause');
const stop = document.getElementById('recordStop');
const play = document.getElementById('recordPlay');
const playback = document.getElementById('recordPlayback');
const save = document.getElementById('recordSave');

let userMediaStream, displayMediaStream, stream, recorder, streamChunks = [],
    blobData;
const userMediaConstraints = { video: false, audio: true };
const displayMediaConstraints = {
    video: {
        cursor: 'always' | 'motion' | 'never',
        displaySurface: 'application' | 'browser' | 'monitor' | 'window'
    },
    audio: false
};
const postToServerUrl = `./upload-video.php`;

// Mixes multiple tracks
function mixer(stream1, stream2) {
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();

    if (stream1.getAudioTracks().length > 0)
        ctx.createMediaStreamSource(stream1).connect(dest);

    if (stream2.getAudioTracks().length > 0)
        ctx.createMediaStreamSource(stream2).connect(dest);

    let tracks = dest.stream.getTracks();
    tracks = tracks.concat(stream1.getVideoTracks()).concat(stream2.getVideoTracks());

    return new MediaStream(tracks)
}

// Returns a filename based on timestamp
function getFilename() {
    const now = new Date();
    const timestamp = now.toISOString();
    return `my-recording-${timestamp}`;
}

// Start recording
start.addEventListener('click', async function() {
    streamChunks = [];

    try {
        if (navigator.mediaDevices["getDisplayMedia"] && navigator.mediaDevices["getUserMedia"]) {
            displayMediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaConstraints); // Screen Stream
            userMediaStream = await navigator.mediaDevices.getUserMedia(userMediaConstraints); // Audio-Video Stream
        } else if (navigator.mediaDevices["getUserMedia"]) {
            userMediaStream = await navigator.mediaDevices.getUserMedia(userMediaConstraints); // Audio-Video Stream
        } else {
            displayMediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaConstraints); // Screen Stream
        }
    } catch (e) {
        console.error("capture failure", e);
        return;
    }

    stream = (displayMediaStream && userMediaStream && mixer(userMediaStream, displayMediaStream)) || displayMediaStream || userMediaStream;
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorder.start();

    // Stop sharing
    stream.getVideoTracks()[0].onended = function() {
        console.log('Clicked on Stop Sharing');
        stopCapture();
    };

    // Chunks collection
    recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
            streamChunks.push(e.data);
        }
    };

    // Onstop
    recorder.onstop = function(e) {
        console.log("data available after MediaRecorder.stop() called.");

        blobData = new Blob(streamChunks, { type: 'video/webm' });
        postToServer(postToServerUrl, blobData)
        console.log("recorder stopped");
    }

    console.log("started recording");
    start.innerText = "Recording";

    start.disabled = true;
    pause.disabled = false;
    stop.disabled = false;
    play.disabled = true;
    save.disabled = true;
});

// Stop recording
function stopCapture() {
    console.log("Stopping recording");
    recorder.stop();

    stream.getTracks().forEach(track => track.stop());
    userMediaStream.getTracks().forEach(track => track.stop());
    displayMediaStream.getTracks().forEach(track => track.stop());

    start.disabled = false;
    pause.disabled = true;
    stop.disabled = true;
    play.disabled = false;
    save.disabled = false;

    start.innerText = "Record";
    pause.innerText = "Pause";
}
stop.addEventListener('click', stopCapture);

// Pause recording
pause.addEventListener('click', () => {
    if (recorder.state === 'paused') {
        recorder.resume();
        pause.innerText = "Pause"
    } else if (recorder.state === 'recording') {
        recorder.pause();
        pause.innerText = "Resume"

    } else {
        console.error(`recorder in unhandled state: ${recorder.state}`);
    }

    console.log(`recorder ${recorder.state === 'paused' ? "paused" : "recording"}`);
});

// Play the recording in a popup window
let isPlaying = false;
play.addEventListener('click', () => {
    playback.hidden = !playback.hidden;
    if (!isPlaying && !playback.hidden) {
        playback.src = window.URL.createObjectURL(new Blob(streamChunks, { type: 'video/webm' }));
        playback.play();
        play.innerText = "Hide";
    } else {
        play.innerText = "Play";
    }
});

// Media playback handlers
playback.addEventListener('play', () => { isPlaying = true });
playback.addEventListener('pause', () => { isPlaying = false });
playback.addEventListener('playing', () => { isPlaying = true });
playback.addEventListener('ended', () => { isPlaying = false });

// Save the recording
save.addEventListener('click', () => {
    blobData = new Blob(streamChunks, { type: 'video/webm' });
    const url = window.URL.createObjectURL(blobData);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${getFilename()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log(`${a.download} save option shown`);
    }, 100);
});

// Upload to server
const postToServer = function(url, recordedBlob) {
    console.log(recordedBlob);

    let formData = new FormData();
    formData.append('video', recordedBlob);

    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            console.log(request.responseText);
        }
    };
    request.open('POST', url, true);
    // request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.send(formData);
}