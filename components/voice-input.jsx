import { useState, useEffect, useRef } from 'react';
import { Mic, X, Check } from 'lucide-react';

export default function VoiceInput({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-GB';

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript && onTranscript) {
            onTranscript(finalTranscript.trim());
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onTranscript]);

  // Simulate audio level animation
  useEffect(() => {
    if (isListening) {
      const animate = () => {
        setAudioLevel(Math.random() * 100);
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

  const startRecording = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopAndAccept = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const stopAndCancel = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setIsListening(false);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="voice-input-container">
      {!isListening ? (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="voice-mic-button"
          aria-label="Start voice dictation"
        >
          <Mic size={18} strokeWidth={2} />
          <span className="voice-tooltip">Dictate</span>
        </button>
      ) : (
        <div className="voice-recording-controls">
          <button
            type="button"
            onClick={stopAndCancel}
            className="voice-control-button voice-cancel"
            aria-label="Cancel recording"
          >
            <X size={18} strokeWidth={2} />
          </button>
          
          <div className="voice-waveform">
            <div className="wave-bar" style={{ height: `${20 + audioLevel * 0.3}%` }} />
            <div className="wave-bar" style={{ height: `${30 + audioLevel * 0.4}%` }} />
            <div className="wave-bar" style={{ height: `${25 + audioLevel * 0.35}%` }} />
            <div className="wave-bar" style={{ height: `${35 + audioLevel * 0.5}%` }} />
            <div className="wave-bar" style={{ height: `${20 + audioLevel * 0.3}%` }} />
          </div>
          
          <button
            type="button"
            onClick={stopAndAccept}
            className="voice-control-button voice-accept"
            aria-label="Accept recording"
          >
            <Check size={18} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}