export async function loadAudio(src: string) {
	const blob = await fetch(src).then((res) => res.blob())

	const audio = new Audio()
	audio.src = URL.createObjectURL(blob)
	audio.crossOrigin = 'anonymous'
	audio.preload = 'auto'

	const duration = await new Promise<number>((resolve) => {
		audio.addEventListener('loadedmetadata', () => {
			resolve(audio.duration)
		})
	})

	audio.load()

	await new Promise<void>((resolve, reject) => {
		audio.addEventListener('canplaythrough', () => {
			resolve()
		})
		audio.addEventListener('error', () => {
			reject()
		})
	})

	return {
		audio,
		blob,
		duration,
	}
}

export async function decode(audioData: ArrayBuffer, sampleRate: number): Promise<AudioBuffer> {
	const audioCtx = new AudioContext({ sampleRate })
	const decode = audioCtx.decodeAudioData(audioData)
	return decode.finally(() => audioCtx.close())
}
