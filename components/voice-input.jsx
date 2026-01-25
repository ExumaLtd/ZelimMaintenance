import { useState, useEffect, useRef } from 'react';
import { Mic, X, Check } from 'lucide-react';

export default function VoiceInput({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [useElevenLabs] = useState(true); // keep enabled; browser is backup-only mode (not run alongside)

  // ✅ Added: history for waveform bars (shows last N volume samples)
  const BAR_COUNT = 10;
  const [levelHistory, setLevelHistory] = useState(Array(BAR_COUNT).fill(0));
  const levelHistoryRef = useRef(Array(BAR_COUNT).fill(0));
  const lastLevelUpdateRef = useRef(0);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const transcriptRef = useRef('');
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Guards to prevent double start/stop
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    // Detect mobile
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-GB';

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
            console.log('Browser captured:', finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.requestData(); } catch (e) {}
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Real audio level detection for waveform
  useEffect(() => {
    if (isListening && streamRef.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(streamRef.current);

        analyser.fftSize = 256;
        microphone.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.fftSize);

        const detectLevel = () => {
          analyser.getByteTimeDomainData(dataArray);

          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128; // -1..1
            sumSquares += v * v;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          // Scale RMS to a useful UI range (tweak multiplier to taste)
          const level = Math.min(100, rms * 220);
          setAudioLevel(level);

          // ✅ Update history at ~25fps (prevents excessive re-renders)
          const now = performance.now();
          if (now - lastLevelUpdateRef.current > 40) {
            lastLevelUpdateRef.current = now;
            const nextHistory = [...levelHistoryRef.current.slice(1), level];
            levelHistoryRef.current = nextHistory;
            setLevelHistory(nextHistory);
          }

          animationFrameRef.current = requestAnimationFrame(detectLevel);
        };

        detectLevel();
      } catch (error) {
        console.error('Audio analysis failed:', error);
        // Fallback to random animation
        const animate = () => {
          const level = 50 + Math.random() * 50;
          setAudioLevel(level);

          const now = performance.now();
          if (now - lastLevelUpdateRef.current > 40) {
            lastLevelUpdateRef.current = now;
            const nextHistory = [...levelHistoryRef.current.slice(1), level];
            levelHistoryRef.current = nextHistory;
            setLevelHistory(nextHistory);
          }

          animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
      // ✅ Reset history when not listening (so it doesn't look "stuck")
      const reset = Array(BAR_COUNT).fill(0);
      levelHistoryRef.current = reset;
      setLevelHistory(reset);
    }
  }, [isListening]);

  const capitalizeFirst = (text) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const formatTranscript = (text) => {
    let formatted = capitalizeFirst(text.trim());
    if (formatted && !/[.!?]$/.test(formatted)) {
      formatted += '.';
    }
    return formatted;
  };

  const startRecording = async () => {
    // Prevent double-start
    if (disabled || isListening || isStartingRef.current) return;
    isStartingRef.current = true;

    console.log('🎤 Starting recording...');
    transcriptRef.current = '';
    audioChunksRef.current = [];

    // Reset waveform history at the start
    const reset = Array(BAR_COUNT).fill(0);
    levelHistoryRef.current = reset;
    setLevelHistory(reset);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Start browser recognition ONLY when not using ElevenLabs (backup-only mode)
      if (!useElevenLabs && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log('✅ Browser recognition started');
        } catch (e) {
          console.log('Browser recognition already running or failed:', e);
        }
      }

      if (useElevenLabs) {
        // Choose a supported mimeType to avoid “corrupted webm” issues
        const preferredTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
        ];
        const chosenType = preferredTypes.find((t) => window.MediaRecorder?.isTypeSupported?.(t));

        const mediaRecorder = chosenType
          ? new MediaRecorder(stream, { mimeType: chosenType })
          : new MediaRecorder(stream);

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(100);
        setIsListening(true);
        console.log('Started ElevenLabs recording');
      } else {
        setIsListening(true);
        console.log('Started browser-only recording');
      }
    } catch (error) {
      console.error('Failed to access microphone:', error);
      alert('Could not access microphone. Please allow microphone permissions.');
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopAndAccept = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    console.log('✅ Stop and accept clicked');
    setIsListening(false);

    // Stop browser recognition ONLY when not using ElevenLabs (backup-only mode)
    if (!useElevenLabs && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const recorder = mediaRecorderRef.current;

    if (useElevenLabs && recorder && recorder.state === 'recording') {
      console.log('⏹️ Stopping ElevenLabs recording...');

      // Safety timeout so UI never gets stuck
      const stopSafety = setTimeout(() => {
        console.warn('⚠️ Recorder stop timeout — forcing cleanup');
        cleanupStreams();
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        transcriptRef.current = '';
        isStoppingRef.current = false;
      }, 2000);

      recorder.onstop = async () => {
        clearTimeout(stopSafety);

        console.log('📊 Recording stopped, processing audio...');
        const mime = recorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        console.log('Audio blob size:', audioBlob.size, 'bytes');

        if (audioBlob.size === 0) {
          console.error('❌ Audio blob is empty, using browser transcript');
          const formatted = formatTranscript(transcriptRef.current);
          if (formatted && onTranscript) onTranscript(formatted + ' ');
          audioChunksRef.current = [];
          transcriptRef.current = '';
          cleanupStreams();
          mediaRecorderRef.current = null;
          isStoppingRef.current = false;
          return;
        }

        try {
          console.log('🌐 Sending to ElevenLabs API...');
          const response = await fetch('/api/transcribe-elevenlabs', {
            method: 'POST',
            headers: { 'x-audio-mime': audioBlob.type },
            body: audioBlob,
          });

          console.log('📡 API response status:', response.status);
          const data = await response.json();
          console.log('📝 ElevenLabs response:', data);

          if (data.fallback || !data.text) {
            console.log('⚠️ ElevenLabs failed (backup-only mode: no browser transcript for this attempt)');
            // If you ever want: show UI toast here. For now, do nothing extra.
          } else if (data.text && onTranscript) {
            console.log('✨ Transcription successful:', data.text);
            const formatted = formatTranscript(data.text);
            onTranscript(formatted + ' ');
          }
        } catch (error) {
          console.error('❌ ElevenLabs error (backup-only mode):', error);
        }

        // Reset + cleanup
        audioChunksRef.current = [];
        transcriptRef.current = '';
        cleanupStreams();
        mediaRecorderRef.current = null;
        isStoppingRef.current = false;
      };

      // Flush buffered audio before stopping
      try { recorder.requestData(); } catch (e) {}
      recorder.stop();
    } else {
      console.log('🗣️ Using browser transcript');
      setTimeout(() => {
        console.log('Browser transcript:', transcriptRef.current);
        const formatted = formatTranscript(transcriptRef.current);
        if (formatted && onTranscript) onTranscript(formatted + ' ');
        transcriptRef.current = '';
        cleanupStreams();
        isStoppingRef.current = false;
      }, 300);
    }
  };

  const stopAndCancel = () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    console.log('❌ Cancelled');
    setIsListening(false);
    transcriptRef.current = '';
    audioChunksRef.current = [];

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try { recorder.requestData(); } catch (e) {}
      try { recorder.stop(); } catch (e) {}
    }

    cleanupStreams();
    mediaRecorderRef.current = null;
    isStoppingRef.current = false;
  };

  const cleanupStreams = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  if (!isSupported) return null;

  return (
    <>
      {!isListening ? (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="voice-mic-icon"
          aria-label="Start voice dictation"
        >
          <Mic size={18} strokeWidth={1.5} />
          {!isMobile && <span className="voice-tooltip-popup">Dictate</span>}
        </button>
      ) : (
        <div className="voice-recording-state">
          <button
            type="button"
            onClick={stopAndCancel}
            className="voice-icon-btn"
            aria-label="Cancel recording"
          >
            <X size={18} strokeWidth={1.5} />
            {!isMobile && <span className="voice-tooltip-popup tooltip-white">Cancel</span>}
          </button>

          <div className="voice-waveform-bars">
            {levelHistory.map((lvl, idx) => (
              <span
                key={idx}
                className="wave-bar"
                style={{ height: `${Math.max(8, Math.min(100, lvl))}%` }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={stopAndAccept}
            className="voice-icon-btn"
            aria-label="Accept recording"
          >
            <Check size={18} strokeWidth={1.5} />
            {!isMobile && <span className="voice-tooltip-popup tooltip-white">Submit</span>}
          </button>
        </div>
      )}
    </>
  );
}
