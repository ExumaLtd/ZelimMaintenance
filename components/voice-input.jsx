import { useState, useEffect, useRef } from 'react';
import { Mic, X, Check } from 'lucide-react';

export default function VoiceInput({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [useElevenLabs] = useState(true); // keep enabled; fallback is per-attempt only

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const transcriptRef = useRef('');
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

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
        mediaRecorderRef.current.stop();
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

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const detectLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(detectLevel);
        };

        detectLevel();
      } catch (error) {
        console.error('Audio analysis failed:', error);
        // Fallback to random animation
        const animate = () => {
          setAudioLevel(50 + Math.random() * 50);
          animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
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
    console.log('🎤 Starting recording...');
    transcriptRef.current = '';
    audioChunksRef.current = [];

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
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
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
    }
  };

  const stopAndAccept = async () => {
    console.log('✅ Stop and accept clicked');
    setIsListening(false);

    // Stop browser recognition ONLY when not using ElevenLabs (backup-only mode)
    if (!useElevenLabs && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    if (useElevenLabs && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('⏹️ Stopping ElevenLabs recording...');

      mediaRecorderRef.current.onstop = async () => {
        console.log('📊 Recording stopped, processing audio...');
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        console.log('Audio blob size:', audioBlob.size, 'bytes');

        if (audioBlob.size === 0) {
          console.error('❌ Audio blob is empty, using browser transcript');
          const formatted = formatTranscript(transcriptRef.current);
          if (formatted && onTranscript) onTranscript(formatted + ' ');
          cleanupStreams();
          return;
        }

        try {
          console.log('🌐 Sending to ElevenLabs API...');
          const response = await fetch('/api/transcribe-elevenlabs', {
            method: 'POST',
            body: audioBlob,
          });

          console.log('📡 API response status:', response.status);
          const data = await response.json();
          console.log('📝 ElevenLabs response:', data);

          // Fallback applies to this attempt only
          if (data.fallback || !data.text) {
            console.log('⚠️ ElevenLabs failed, using browser transcript (this attempt only)');
            const formatted = formatTranscript(transcriptRef.current);
            if (formatted && onTranscript) onTranscript(formatted + ' ');
          } else if (data.text && onTranscript) {
            console.log('✨ Transcription successful:', data.text);
            const formatted = formatTranscript(data.text);
            onTranscript(formatted + ' ');
          }
        } catch (error) {
          console.error('❌ ElevenLabs error, using browser transcript (this attempt only):', error);
          const formatted = formatTranscript(transcriptRef.current);
          if (formatted && onTranscript) onTranscript(formatted + ' ');
        }

        cleanupStreams();
      };

      mediaRecorderRef.current.stop();
    } else {
      console.log('🗣️ Using browser transcript');
      setTimeout(() => {
        console.log('Browser transcript:', transcriptRef.current);
        const formatted = formatTranscript(transcriptRef.current);
        if (formatted && onTranscript) onTranscript(formatted + ' ');
        transcriptRef.current = '';
        cleanupStreams();
      }, 300);
    }
  };

  const stopAndCancel = () => {
    console.log('❌ Cancelled');
    setIsListening(false);
    transcriptRef.current = '';
    audioChunksRef.current = [];

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    cleanupStreams();
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
  };

  if (!isSupported) return null;

  const normalizedLevel = Math.min(100, (audioLevel / 128) * 100);

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
            <span className="wave-bar" style={{ height: `${Math.max(20, normalizedLevel * 0.3)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(25, normalizedLevel * 0.4)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(30, normalizedLevel * 0.5)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(35, normalizedLevel * 0.6)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(30, normalizedLevel * 0.5)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(40, normalizedLevel * 0.7)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(35, normalizedLevel * 0.6)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(30, normalizedLevel * 0.5)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(25, normalizedLevel * 0.4)}%` }} />
            <span className="wave-bar" style={{ height: `${Math.max(20, normalizedLevel * 0.3)}%` }} />
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
