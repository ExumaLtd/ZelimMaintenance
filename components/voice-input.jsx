import { useState, useEffect, useRef } from 'react';
import { Mic, X, Check } from 'lucide-react';

export default function VoiceInput({ onTranscript, disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [useElevenLabs, setUseElevenLabs] = useState(true);
  
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
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
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
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
          if (isListening && !useElevenLabs) {
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, useElevenLabs]);

  // More dramatic waveform animation
  useEffect(() => {
    if (isListening) {
      const animate = () => {
        // Create more variation in wave heights
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
    transcriptRef.current = '';
    audioChunksRef.current = [];
    
    if (useElevenLabs) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
        setIsListening(true);
        console.log('Started ElevenLabs recording');
      } catch (error) {
        console.error('Failed to start ElevenLabs recording, falling back:', error);
        setUseElevenLabs(false);
        startBrowserRecognition();
      }
    } else {
      startBrowserRecognition();
    }
  };

  const startBrowserRecognition = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('Started browser recognition');
    } catch (error) {
      console.error('Failed to start browser recognition:', error);
    }
  };

  const stopAndAccept = async () => {
    setIsListening(false);

    if (useElevenLabs && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob size:', audioBlob.size);
        
        try {
          const response = await fetch('/api/transcribe-elevenlabs', {
            method: 'POST',
            body: audioBlob,
          });

          const data = await response.json();
          console.log('ElevenLabs response:', data);

          if (data.fallback || !data.text) {
            console.log('ElevenLabs failed or empty, switching to browser');
            setUseElevenLabs(false);
            
            // Use browser fallback immediately with stored transcript
            if (transcriptRef.current && onTranscript) {
              onTranscript(transcriptRef.current.trim());
              transcriptRef.current = '';
            }
          } else if (data.text && onTranscript) {
            console.log('ElevenLabs transcription:', data.text);
            onTranscript(data.text);
          }
        } catch (error) {
          console.error('ElevenLabs error, switching to browser:', error);
          setUseElevenLabs(false);
          
          // Use browser fallback
          if (transcriptRef.current && onTranscript) {
            onTranscript(transcriptRef.current.trim());
            transcriptRef.current = '';
          }
        }

        // Stop all tracks
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
      };
    } else {
      // Browser recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      setTimeout(() => {
        if (transcriptRef.current && onTranscript) {
          console.log('Browser transcription:', transcriptRef.current);
          onTranscript(transcriptRef.current.trim());
        }
        transcriptRef.current = '';
      }, 500);
    }
  };

  const stopAndCancel = () => {
    setIsListening(false);
    transcriptRef.current = '';
    audioChunksRef.current = [];

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      const tracks = mediaRecorderRef.current.stream.getTracks();
      tracks.forEach(track => track.stop());
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
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