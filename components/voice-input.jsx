import { useState, useEffect, useRef } from 'react';
import { Mic, X, Check } from 'lucide-react';

export default function VoiceInput({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
const [useElevenLabs, setUseElevenLabs] = useState(false);
  
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const transcriptRef = useRef('');
  const streamRef = useRef(null);

  useEffect(() => {
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
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      const animate = () => {
        setAudioLevel(50 + Math.random() * 50);
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
    }
  }, [isListening]);

  const startRecording = async () => {
    console.log('🎤 Starting recording...');
    transcriptRef.current = '';
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Start browser recognition as backup
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log('✅ Browser recognition started as backup');
        } catch (e) {
          console.log('Browser recognition already running or failed:', e);
        }
      }
      
      if (useElevenLabs) {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          console.log('📦 Audio chunk received:', event.data.size);
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(100); // Collect data every 100ms
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

    // Stop browser recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (useElevenLabs && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('⏹️ Stopping ElevenLabs recording...');
      
      mediaRecorderRef.current.onstop = async () => {
        console.log('📊 Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        
        if (audioBlob.size === 0) {
          console.error('❌ Audio blob is empty, using browser transcript');
          if (transcriptRef.current && onTranscript) {
            onTranscript(transcriptRef.current.trim());
          }
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

          if (data.fallback || !data.text) {
            console.log('⚠️ ElevenLabs failed, using browser transcript');
            setUseElevenLabs(false);
            if (transcriptRef.current && onTranscript) {
              onTranscript(transcriptRef.current.trim());
            }
          } else if (data.text && onTranscript) {
            console.log('✨ Transcription successful:', data.text);
            onTranscript(data.text);
          }
        } catch (error) {
          console.error('❌ ElevenLabs error, using browser transcript:', error);
          setUseElevenLabs(false);
          if (transcriptRef.current && onTranscript) {
            onTranscript(transcriptRef.current.trim());
          }
        }

        cleanupStreams();
      };
      
      mediaRecorderRef.current.stop();
    } else {
      console.log('🗣️ Using browser transcript');
      setTimeout(() => {
        console.log('Browser transcript:', transcriptRef.current);
        if (transcriptRef.current && onTranscript) {
          onTranscript(transcriptRef.current.trim());
        }
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
      try {
        recognitionRef.current.stop();
      } catch (e) {}
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
  };

  if (!isSupported) {
    return null;
  }

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
          <Mic size={18} strokeWidth={2} />
          <span className="voice-tooltip-popup">Dictate</span>
        </button>
      ) : (
        <div className="voice-recording-state">
          <button
            type="button"
            onClick={stopAndCancel}
            className="voice-icon-btn"
            aria-label="Cancel recording"
          >
            <X size={18} strokeWidth={2} />
          </button>
          
          <div className="voice-waveform-bars">
            <span className="wave-bar" style={{ height: `${10 + audioLevel * 0.4}%` }} />
            <span className="wave-bar" style={{ height: `${15 + audioLevel * 0.6}%` }} />
            <span className="wave-bar" style={{ height: `${12 + audioLevel * 0.5}%` }} />
            <span className="wave-bar" style={{ height: `${18 + audioLevel * 0.7}%` }} />
            <span className="wave-bar" style={{ height: `${10 + audioLevel * 0.4}%` }} />
          </div>
          
          <button
            type="button"
            onClick={stopAndAccept}
            className="voice-icon-btn"
            aria-label="Accept recording"
          >
            <Check size={18} strokeWidth={2} />
          </button>
        </div>
      )}
    </>
  );
}