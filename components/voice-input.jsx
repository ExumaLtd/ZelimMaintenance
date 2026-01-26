import { useState, useEffect, useRef } from 'react';
import { Mic, X, Check } from 'lucide-react';

// Configuration constants
const WAVEFORM_UPDATE_INTERVAL = 33; // ~30fps
const SILENCE_THRESHOLD = 250; // ms
const RECORDING_STOP_TIMEOUT = 2000; // ms
const NOISE_FLOOR = 0.012;
const SPEAKING_THRESHOLD = 0.06;
const BAR_COUNT = 10;
const CENTER_WEIGHTS = [0.35, 0.5, 0.7, 0.9, 1, 1, 0.9, 0.7, 0.5, 0.35];
const MIN_BAR_HEIGHT_PX = 3;
const MAX_BAR_HEIGHT_PX = 18;

const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args) => {
  if (DEBUG) console.log(...args);
};

// Smart formatting for voice transcripts
const smartFormatTranscript = (newText) => {
  const trimmedNew = newText.trim();
  if (!trimmedNew) return '';
  
  // Capitalize first letter
  const capitalized = trimmedNew.charAt(0).toUpperCase() + trimmedNew.slice(1);
  
  // Add period at end if missing
  const withPeriod = !/[.!?]$/.test(capitalized) ? capitalized + '.' : capitalized;
  
  // Always add space before
  return ' ' + withPeriod;
};

export default function VoiceInput({ onTranscript, onError, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [useElevenLabs] = useState(true); // keep enabled; browser is backup-only mode

  const [levelHistory, setLevelHistory] = useState(Array(BAR_COUNT).fill(0));
  const levelHistoryRef = useRef(Array(BAR_COUNT).fill(0));
  const lastLevelUpdateRef = useRef(0);

  // Speaking detection (controls idle animation)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);
  const silenceSinceRef = useRef(0);

  // Smoothing for "ChatGPT feel"
  const smoothedRef = useRef(0);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const transcriptRef = useRef('');
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const stopSafetyRef = useRef(null);

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
            log('Browser captured:', finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
        };
      }
    }

    return () => {
      // Clear any pending timeout
      if (stopSafetyRef.current) {
        clearTimeout(stopSafetyRef.current);
      }

      if (recognitionRef.current) {
        try {
          // Check state before stopping to avoid errors
          if (recognitionRef.current.state !== 'inactive') {
            recognitionRef.current.stop();
          }
        } catch (e) {
          if (DEBUG) console.log('Recognition cleanup error:', e);
        }
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

  // Real audio level detection for waveform (ChatGPT-style)
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

          // RMS amplitude 0..~0.3 for speech typically
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128; // -1..1
            sumSquares += v * v;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          // Smooth it for a "ChatGPT" feel (less jitter, more bounce)
          const SMOOTHING = 0.82;
          smoothedRef.current = smoothedRef.current * SMOOTHING + rms * (1 - SMOOTHING);

          // Noise floor clamp (prevents tiny mic noise constantly moving bars)
          const cleaned = Math.max(0, smoothedRef.current - NOISE_FLOOR);

          // Map to 0..1 with a bit of curve (speech pops nicer)
          const boosted = Math.min(1, Math.pow(cleaned * 6.5, 0.85));

          // For any other UI/telemetry you might want
          setAudioLevel(boosted * 100);

          // Speaking vs idle (adds idle animation when quiet)
          const now = performance.now();
          const speakingNow = boosted > SPEAKING_THRESHOLD;

          if (speakingNow) {
            silenceSinceRef.current = 0;
            if (!speakingRef.current) {
              speakingRef.current = true;
              setIsSpeaking(true);
            }
          } else {
            if (!silenceSinceRef.current) silenceSinceRef.current = now;
            // wait a beat before dropping into idle (feels nicer)
            if (speakingRef.current && now - silenceSinceRef.current > SILENCE_THRESHOLD) {
              speakingRef.current = false;
              setIsSpeaking(false);
            }
          }

          // Update history at ~30fps (nice "trail")
          if (now - lastLevelUpdateRef.current > WAVEFORM_UPDATE_INTERVAL) {
            lastLevelUpdateRef.current = now;

            const prev = levelHistoryRef.current;
            // Slight decay so bars fall naturally
            const DECAY = 0.92;
            const decayed = prev.map(v => v * DECAY);

            const nextHistory = [...decayed.slice(1), boosted];
            levelHistoryRef.current = nextHistory;
            setLevelHistory(nextHistory);
          }

          animationFrameRef.current = requestAnimationFrame(detectLevel);
        };

        detectLevel();
      } catch (error) {
        console.error('Audio analysis failed:', error);

        // Fallback animation (still shows trail)
        const animate = () => {
          const now = performance.now();
          const fake = Math.random() * 0.6;

          setAudioLevel(fake * 100);

          if (now - lastLevelUpdateRef.current > WAVEFORM_UPDATE_INTERVAL) {
            lastLevelUpdateRef.current = now;
            const prev = levelHistoryRef.current;
            const DECAY = 0.92;
            const decayed = prev.map(v => v * DECAY);
            const nextHistory = [...decayed.slice(1), fake];
            levelHistoryRef.current = nextHistory;
            setLevelHistory(nextHistory);
          }

          if (!speakingRef.current) {
            speakingRef.current = true;
            setIsSpeaking(true);
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

      // Reset waveform
      const reset = Array(BAR_COUNT).fill(0);
      levelHistoryRef.current = reset;
      setLevelHistory(reset);

      speakingRef.current = false;
      setIsSpeaking(false);
      silenceSinceRef.current = 0;
      smoothedRef.current = 0;
    }
  }, [isListening]);

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

  const startRecording = async () => {
    if (disabled || isListening || isStartingRef.current) return;
    isStartingRef.current = true;

    log('🎤 Starting recording...');
    transcriptRef.current = '';
    audioChunksRef.current = [];

    // Reset waveform
    const reset = Array(BAR_COUNT).fill(0);
    levelHistoryRef.current = reset;
    setLevelHistory(reset);
    speakingRef.current = false;
    setIsSpeaking(false);
    silenceSinceRef.current = 0;
    smoothedRef.current = 0;

    try {
      // ✅ Request basic audio first (instant permission prompt)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      // Then apply constraints if supported (won't delay permission)
      const track = stream.getAudioTracks()[0];
      if (track.applyConstraints) {
        try {
          await track.applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          });
        } catch (e) {
          log('Could not apply audio constraints:', e);
          // Continue anyway with basic audio
        }
      }

      streamRef.current = stream;

      // Start browser recognition ONLY when not using ElevenLabs (backup-only mode)
      if (!useElevenLabs && recognitionRef.current) {
        try {
          if (recognitionRef.current.state === 'inactive') {
            recognitionRef.current.start();
            log('✅ Browser recognition started');
          }
        } catch (e) {
          if (DEBUG) console.log('Browser recognition error:', e);
        }
      }

      if (useElevenLabs) {
        const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm'];
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
        log('Started ElevenLabs recording');
      } else {
        setIsListening(true);
        log('Started browser-only recording');
      }
    } catch (error) {
      console.error('Failed to access microphone:', error);
      
      // Reset guards on error
      isStartingRef.current = false;
      setIsListening(false);
      
      // Use error callback if provided, otherwise fallback to alert
      if (onError) {
        onError('Could not access microphone. Please allow microphone permissions.');
      } else {
        alert('Could not access microphone. Please allow microphone permissions.');
      }
    } finally {
      // Ensure guard is always reset
      isStartingRef.current = false;
    }
  };

  const stopAndAccept = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    log('✅ Stop and accept clicked');
    setIsListening(false);

    if (!useElevenLabs && recognitionRef.current) {
      try {
        if (recognitionRef.current.state !== 'inactive') {
          recognitionRef.current.stop();
        }
      } catch (e) {
        if (DEBUG) console.log('Recognition stop error:', e);
      }
    }

    const recorder = mediaRecorderRef.current;

    if (useElevenLabs && recorder && recorder.state === 'recording') {
      log('⏹️ Stopping ElevenLabs recording...');

      stopSafetyRef.current = setTimeout(() => {
        console.warn('⚠️ Recorder stop timeout — forcing cleanup');
        cleanupStreams();
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        transcriptRef.current = '';
        isStoppingRef.current = false;
        stopSafetyRef.current = null;
      }, RECORDING_STOP_TIMEOUT);

      recorder.onstop = async () => {
        if (stopSafetyRef.current) {
          clearTimeout(stopSafetyRef.current);
          stopSafetyRef.current = null;
        }

        console.log('📊 Recording stopped, processing audio...');
        const mime = recorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        
        console.log('🔍 Audio blob size:', audioBlob.size, 'bytes');
        console.log('🔍 Audio blob type:', audioBlob.type);
        console.log('🔍 Audio chunks count:', audioChunksRef.current.length);
        console.log('🔍 Recorder MIME type:', recorder?.mimeType);

        if (audioBlob.size === 0) {
          console.error('❌ Audio blob is empty');
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

          if (!data.fallback && data.text && onTranscript) {
            log('✨ Transcription successful:', data.text);
            const formatted = smartFormatTranscript(data.text);
            onTranscript(formatted);
          }
        } catch (error) {
          console.error('❌ ElevenLabs error:', error);
          
          // Fallback to browser transcript if available
          const browserTranscript = transcriptRef.current.trim();
          if (browserTranscript && onTranscript) {
            log('📝 Using browser fallback transcript');
            const formatted = smartFormatTranscript(browserTranscript);
            onTranscript(formatted);
          }
        }

        audioChunksRef.current = [];
        transcriptRef.current = '';
        cleanupStreams();
        mediaRecorderRef.current = null;
        isStoppingRef.current = false;
      };

      try { recorder.requestData(); } catch (e) {}
      recorder.stop();
    } else {
      log('🗣️ Using browser transcript');
      setTimeout(() => {
        const browserTranscript = transcriptRef.current.trim();
        if (browserTranscript && onTranscript) {
          const formatted = smartFormatTranscript(browserTranscript);
          onTranscript(formatted);
        }
        transcriptRef.current = '';
        cleanupStreams();
        isStoppingRef.current = false;
      }, 300);
    }
  };

  const stopAndCancel = () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    log('❌ Cancelled');
    setIsListening(false);
    transcriptRef.current = '';
    audioChunksRef.current = [];

    // Clear safety timeout if exists
    if (stopSafetyRef.current) {
      clearTimeout(stopSafetyRef.current);
      stopSafetyRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        if (recognitionRef.current.state !== 'inactive') {
          recognitionRef.current.stop();
        }
      } catch (e) {
        if (DEBUG) console.log('Recognition cancel error:', e);
      }
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

  if (!isSupported) return null;

  const getBarHeightPx = (lvl, idx) => {
    const w = CENTER_WEIGHTS[idx] || 1;
    const h = MIN_BAR_HEIGHT_PX + (MAX_BAR_HEIGHT_PX - MIN_BAR_HEIGHT_PX) * Math.min(1, lvl * 1.25) * w;
    return Math.max(MIN_BAR_HEIGHT_PX, Math.min(MAX_BAR_HEIGHT_PX, h));
  };

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
            {!isMobile && <span className="voice-tooltip-popup">Cancel</span>}
          </button>

          <div className={`voice-waveform-bars ${isSpeaking ? 'speaking' : 'idle'}`}>
            {levelHistory.map((lvl, idx) => (
              <span
                key={idx}
                className="wave-bar"
                style={{ height: `${getBarHeightPx(lvl, idx)}px` }}
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
            {!isMobile && <span className="voice-tooltip-popup">Submit</span>}
          </button>
        </div>
      )}
    </>
  );
}