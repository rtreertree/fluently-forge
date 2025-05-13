import { useRef, useState, useEffect, useCallback } from 'react';

export function useVoiceRecorder() {
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [timer, setTimer] = useState(0);
	const timerIntervalRef = useRef<number | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	// Visualization
	const analyserRef = useRef<AnalyserNode | null>(null);
	const dataArrayRef = useRef<Uint8Array | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const animationFrameIdRef = useRef<number | null>(null);
	const [isVisualizing, setIsVisualizing] = useState(false);
	const [currentVolume, setCurrentVolume] = useState(0);

	const getWaveform = useCallback((): Uint8Array | null => {
		if (analyserRef.current && dataArrayRef.current) {
			analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
			return dataArrayRef.current;
		}
		return null;
	}, []);

	const getCurrentVolume = useCallback(() => {
		if (analyserRef.current && dataArrayRef.current) {
			analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
			let sumSquares = 0;
			for (let i = 0; i < dataArrayRef.current.length; i++) {
				const value = dataArrayRef.current[i] - 128;
				sumSquares += value * value;
			}
			const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);
			return Math.min(rms / 128, 1);
		}
		return 0;
	}, []);

	useEffect(() => {
		if (!isVisualizing) {
			setCurrentVolume(0);
			if (animationFrameIdRef.current) {
				cancelAnimationFrame(animationFrameIdRef.current);
			}
			return;
		}
		let isMounted = true;
		const update = () => {
			if (isMounted) {
				setCurrentVolume(getCurrentVolume());
				animationFrameIdRef.current = requestAnimationFrame(update);
			}
		};
		animationFrameIdRef.current = requestAnimationFrame(update);
		return () => {
			isMounted = false;
			cancelAnimationFrame(animationFrameIdRef.current ?? 0);
		};
	}, [isVisualizing, getCurrentVolume]);

	const startTimer = () => {
		if (timerIntervalRef.current !== null) return;
		timerIntervalRef.current = window.setInterval(() => {
			setTimer(t => t + 1);
		}, 1000);
	};

	const stopTimer = () => {
		if (timerIntervalRef.current !== null) {
			clearInterval(timerIntervalRef.current);
			timerIntervalRef.current = null;
		}
	};

	useEffect(() => {
		return () => {
			if (audioUrl) URL.revokeObjectURL(audioUrl);
			stopTimer();
			mediaRecorderRef.current = null;
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
			cancelAnimationFrame(animationFrameIdRef.current ?? 0);
		};
	}, [audioUrl]);

	const start = useCallback(async () => {
		if (isRecording) return;
		setAudioUrl(null);
		setAudioBlob(null);
		setTimer(0);

		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const mediaRecorder = new window.MediaRecorder(stream);
		chunksRef.current = [];

		mediaRecorder.ondataavailable = (e: BlobEvent) => {
			if (e.data.size > 0) chunksRef.current.push(e.data);
		};

		mediaRecorder.onstop = () => {
			const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
			setAudioBlob(blob);
			setAudioUrl(URL.createObjectURL(blob));
			stream.getTracks().forEach((track) => track.stop());
			setIsRecording(false);
			setIsPaused(false);
			stopTimer();

			setIsVisualizing(false);
			setCurrentVolume(0);
			cancelAnimationFrame(animationFrameIdRef.current ?? 0);

			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
		};

		mediaRecorder.onpause = () => {
			setIsPaused(true);
			stopTimer();
			setIsVisualizing(false);
			setCurrentVolume(0);
			cancelAnimationFrame(animationFrameIdRef.current ?? 0);
		};

		mediaRecorder.onresume = () => {
			setIsPaused(false);
			startTimer();
			setIsVisualizing(true);
		};

		mediaRecorderRef.current = mediaRecorder;
		mediaRecorder.start();
		setIsRecording(true);
		setIsPaused(false);
		startTimer();

		const audioContext = new (window.AudioContext || window.webkitAudioContext)();

		audioContextRef.current = audioContext;
		const source = audioContext.createMediaStreamSource(stream);
		sourceRef.current = source;
		const analyser = audioContext.createAnalyser();
		analyser.fftSize = 2048;
		analyserRef.current = analyser;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		dataArrayRef.current = dataArray;
		source.connect(analyser);

		setIsVisualizing(true);
	}, [isRecording]);

	const pause = useCallback(() => {
		if (!isRecording || isPaused) return;
		if (mediaRecorderRef.current?.state === 'recording') {
			mediaRecorderRef.current.pause();
		}
	}, [isRecording, isPaused]);

	const resume = useCallback(() => {
		if (!isRecording || !isPaused) return;
		if (mediaRecorderRef.current?.state === 'paused') {
			mediaRecorderRef.current.resume();
		}
	}, [isRecording, isPaused]);

	const stop = useCallback(() => {
		if (!isRecording) return;
		if (
			mediaRecorderRef.current &&
			(mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')
		) {
			mediaRecorderRef.current.stop();
		}
	}, [isRecording]);

	const save = useCallback(() => {
		if (!audioBlob) return null;
		return audioBlob;
	}, [audioBlob]);

	return {
		audioUrl,
		audioBlob,
		isRecording,
		isPaused,
		timer,
		start,
		pause,
		resume,
		stop,
		save,
		getWaveform,
		isVisualizing,
		analyserRef,
		dataArrayRef,
		currentVolume,
	};
}