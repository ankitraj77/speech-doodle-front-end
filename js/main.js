// set up basic variables for app
let rec = null
let audioStream = null

// This will store sketches
let sketchObj
let doodle // will store one image at a time

const yodaeText = document.getElementById('yodae-text')
let nouns = document.querySelector('.nouns')

const recordButton = document.getElementById('recordButton')
const transcribeButton = document.getElementById('transcribeButton')

// Record audio while RECORD button is pressed
// TOUCHSTART AND TOUCHEND events for smartphones
// MOUSEDOWN AND MOUSEUP events for desktops
recordButton.addEventListener('touchstart', startRecording, false)
recordButton.addEventListener('touchend', transcribeText, false)
recordButton.addEventListener('mousedown', startRecording, false)
recordButton.addEventListener('mouseup', transcribeText, false)

// recordButton.addEventListener('mousedown', startRecording)
// window.addEventListener('mouseup', transcribeText)
// transcribeButton.addEventListener('click', transcribeText)

const waveCanvas = document.querySelector('.visualizer')

const soundClips = document.querySelector('.sound-clips')

let state = null

// RECORD
function startRecording() {
	state = 'recording'
	console.log('startRecording')

	yodaeText.innerHTML = 'Please speak now.'

	let constraints = { audio: true, video: false }

	transcribeButton.disabled = false

	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(function (stream) {
			const audioContext = new window.AudioContext()
			audioStream = stream
			const input = audioContext.createMediaStreamSource(stream)
			rec = new Recorder(input, { numChannels: 1 })
			rec.record()
			// VISUALIZE WAVEFORM
			waveCanvas.classList.remove('hide')
			waveCanvas.classList.add('show')
			visualize(stream)
		})
		.catch(function (err) {
			recordButton.disabled = false
			transcribeButton.disabled = true
		})
}

// TRANSCRIBE
function transcribeText() {
	if (state == 'recording') {
		console.log('transcribeText')
		transcribeButton.disabled = true
		recordButton.disabled = false
		rec.stop()
		audioStream.getAudioTracks()[0].stop()
		rec.exportWAV(uploadSoundData)

		// HIDE WAVECANVAS
		waveCanvas.classList.remove('show')
		waveCanvas.classList.add('hide')

		// PROCESSESING
		recordButton.disabled = true
		yodaeText.innerHTML = 'Thinking...'
	}
}

// UPLOAD SOUND
function uploadSoundData(blob) {
	let filename = new Date().toISOString()

	//
	// const audioURL = window.URL.createObjectURL(blob)
	// =====

	let xhr = new XMLHttpRequest()
	xhr.onload = function (e) {
		if (this.readyState === 4) {
			let data = JSON.parse(e.target.response)
			console.log(data)

			// PRINT NOUNS
			nouns.innerHTML = data.things

			// ASSIGN SKETCH DATA TO sketchObj
			sketchObj = data.doodles
			if (data.doodles.length > 0) doodle = sketchObj[0].drawing // to intitiate p5 animation

			// PROCESSED - DONE
			recordButton.disabled = false
			yodaeText.innerHTML = 'Done! ' + data.transcript
		}
	}
	let formData = new FormData()
	formData.append('audio_data', blob, filename)
	xhr.open('POST', 'https://speech-doodle-api.herokuapp.com/upload_sound', true)
	xhr.send(formData)
}

// ======================== P5 Canvas ANIMATION

let index = 0
let strokeIndex = 0
let prevx, prevy
let imageCount = 0

// p5 setup
function setup() {
	let canvas = createCanvas(255, 255)
	canvas.parent('sketchContainer')
	background(255)
}
// assign one image at a time
function newSketchObj() {
	if (imageCount < sketchObj.length) {
		background(255)
		doodle = undefined
		doodle = sketchObj[imageCount].drawing
		// console.log(doodle)
		imageCount++
	} else {
		imageCount = 0
	}
}
function draw() {
	if (doodle) {
		for (let i = 0; i < doodle.length; i++) {
			// console.log(doodle)
			let x = doodle[strokeIndex][0][index]
			let y = doodle[strokeIndex][1][index]
			stroke(0)
			// console.log(x)

			strokeWeight(3)
			if (prevx !== undefined) {
				line(prevx, prevy, x, y)
			}
			index++
			if (index === doodle[strokeIndex][0].length) {
				strokeIndex++
				prevx = undefined
				prevy = undefined
				index = 0
				if (strokeIndex === doodle.length) {
					// doodle = undefined
					strokeIndex = 0
					// setTimeout(newSketchObj, 100)
					newSketchObj()
				}
			} else {
				prevx = x
				prevy = y
			}
		}
	}
}

// ======================== SOUND WAVE VISUALIZER
let audioCtx
const canvasCtx = waveCanvas.getContext('2d')
function visualize(stream) {
	if (!audioCtx) {
		audioCtx = new AudioContext()
	}

	const source = audioCtx.createMediaStreamSource(stream)

	const analyser = audioCtx.createAnalyser()
	analyser.fftSize = 2048
	const bufferLength = analyser.frequencyBinCount
	const dataArray = new Uint8Array(bufferLength)

	source.connect(analyser)
	//analyser.connect(audioCtx.destination);

	drawWave()

	function drawWave() {
		WIDTH = waveCanvas.width
		HEIGHT = waveCanvas.height

		requestAnimationFrame(drawWave)

		analyser.getByteTimeDomainData(dataArray)

		canvasCtx.fillStyle = 'rgb(200, 200, 200)'
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

		canvasCtx.lineWidth = 2
		canvasCtx.strokeStyle = 'rgb(0, 0, 0)'

		canvasCtx.beginPath()

		let sliceWidth = (WIDTH * 1.0) / bufferLength
		let x = 0

		for (let i = 0; i < bufferLength; i++) {
			let v = dataArray[i] / 128.0
			let y = (v * HEIGHT) / 2

			if (i === 0) {
				canvasCtx.moveTo(x, y)
			} else {
				canvasCtx.lineTo(x, y)
			}

			x += sliceWidth
		}

		canvasCtx.lineTo(waveCanvas.width, waveCanvas.height / 2)
		canvasCtx.stroke()
	}
}
