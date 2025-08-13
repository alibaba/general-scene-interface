export async function loadAudio(src: string, abortSignal?: AbortSignal) {
	const blob = await fetch(src, { signal: abortSignal }).then((res) => res.blob())

	const audio = new Audio()
	audio.src = URL.createObjectURL(blob)
	audio.crossOrigin = 'anonymous'
	audio.preload = 'auto'

	const duration = await new Promise<number>((resolve) => {
		audio.addEventListener('loadedmetadata', () => {
			resolve(audio.duration)
		})
	})

	if (abortSignal?.aborted) {
		const error = new Error('Audio loading aborted')
		error.name = 'AbortError'
		URL.revokeObjectURL(audio.src)
		throw error
	}

	audio.load()

	await new Promise<void>((resolve, reject) => {
		audio.addEventListener('canplaythrough', () => {
			resolve()
		})
		audio.addEventListener('error', (e) => {
			reject(e)
		})
	})

	if (abortSignal?.aborted) {
		const error = new Error('Audio loading aborted')
		error.name = 'AbortError'
		URL.revokeObjectURL(audio.src)
		throw error
	}

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
