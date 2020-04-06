// set up basic variables for app
let rec = null
let audioStream = null

const yodaeText = document.getElementById('yodae-text')

const recordButton = document.getElementById('recordButton')
const transcribeButton = document.getElementById('transcribeButton')
// recordButton.addEventListener('click', startRecording)
recordButton.addEventListener('mousedown', startRecording)
window.addEventListener('mouseup', transcribeText)
// transcribeButton.addEventListener('click', transcribeText)

const soundClips = document.querySelector('.sound-clips')
const canvas = document.querySelector('.visualizer')

let state = null;

// RECORD
function startRecording() {
    state = "recording";
    console.log("startRecording");
    
    yodaeText.innerHTML = "Please speak now."

    let constraints = { audio: true, video: false }

    recordButton.disabled = true
    transcribeButton.disabled = false

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function(stream) {
            const audioContext = new window.AudioContext()
            audioStream = stream
            const input = audioContext.createMediaStreamSource(
                stream
            )
            rec = new Recorder(input, { numChannels: 1 })
            rec.record()
        })
        .catch(function(err) {
            recordButton.disabled = false
            transcribeButton.disabled = true
        })
}

// TRANSCRIBE
function transcribeText() {
    
    if (state == "recording") {
        console.log("transcribeText")
        transcribeButton.disabled = true
        recordButton.disabled = false
        rec.stop()
        audioStream.getAudioTracks()[0].stop()
        rec.exportWAV(uploadSoundData)
    }
}

// UPLOAD SOUND
function uploadSoundData(blob) {
    let filename = new Date().toISOString()

    // == PLAYER
    const clipContainer = document.querySelector('article')
    const audio = document.createElement('audio')
    const clipLabel = document.querySelector('article>p')
    audio.setAttribute('controls', '')
    clipLabel.textContent = 'fileName'
    clipContainer.appendChild(audio)
    //
    const audioURL = window.URL.createObjectURL(blob)
    audio.src = audioURL
    // =====

    let xhr = new XMLHttpRequest()
    xhr.onload = function(e) {
        if (this.readyState === 4) {
            console.log(e.target.responseText);
            yodaeText.innerHTML = JSON.parse(e.target.responseText).transcript;
            document.getElementById(
                'output'
            ).innerHTML = `<br><br><strong>Result: </strong>${e.target.responseText}`
        }
    }
    let formData = new FormData()
    formData.append('audio_data', blob, filename)
    xhr.open(
        'POST',
        'https://speech-doodle-api.herokuapp.com/upload_sound',
        true
    )
    xhr.send(formData)
}

// visualiser setup - create web audio api context and canvas