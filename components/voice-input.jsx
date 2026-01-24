import { useState, useEffect, useRef } from 'react';
import { Mic, X, Check } from 'lucide-react';

export default function VoiceInput({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const transcriptRef = useRef('');

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
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          if (isListening) {
            // Restart if still in listening mode
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }
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
  }, [isListening]);

  // Animate audio level
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
    transcriptRef.current = '';
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
    
    if (transcriptRef.current && onTranscript) {
      onTranscript(transcriptRef.current.trim());
    }
    transcriptRef.current = '';
  };

  const stopAndCancel = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    transcriptRef.current = '';
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
          <Mic size={20} strokeWidth={2} />
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
            <X size={20} strokeWidth={2} />
          </button>
          
          <div className="voice-waveform-bars">
            <span className="wave-bar" style={{ height: `${20 + audioLevel * 0.3}%` }} />
            <span className="wave-bar" style={{ height: `${30 + audioLevel * 0.4}%` }} />
            <span className="wave-bar" style={{ height: `${25 + audioLevel * 0.35}%` }} />
            <span className="wave-bar" style={{ height: `${35 + audioLevel * 0.5}%` }} />
            <span className="wave-bar" style={{ height: `${20 + audioLevel * 0.3}%` }} />
          </div>
          
          <button
            type="button"
            onClick={stopAndAccept}
            className="voice-icon-btn"
            aria-label="Accept recording"
          >
            <Check size={20} strokeWidth={2} />
          </button>
        </div>
      )}
    </>
  );
}