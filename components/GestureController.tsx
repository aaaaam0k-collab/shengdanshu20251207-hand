
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { TreeState } from '../types';

interface GestureControllerProps {
  onStateChange: (state: TreeState) => void;
  onRotationChange: (x: number, y: number, isPresent: boolean) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onStateChange, onRotationChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);

  // Constants for gesture detection
  const PINCH_THRESHOLD = 0.05;

  const predictWebcam = useCallback(() => {
    if (!handLandmarkerRef.current || !videoRef.current) return;

    const video = videoRef.current;
    
    // Only process if video has data and is playing
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
    }

    const startTimeMs = performance.now();
    
    try {
        const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // --- 1. Rotation Control (Hand Centroid) ---
          // Use wrist (0) and middle finger mcp (9) to approximate center palm
          const palmX = (landmarks[0].x + landmarks[9].x) / 2;
          const palmY = (landmarks[0].y + landmarks[9].y) / 2;
          
          // Use palmX directly because the video is visually mirrored via CSS (-scale-x-100).
          onRotationChange(palmX, palmY, true);

          // --- 2. Gesture Recognition ---
          const dist = (i1: number, i2: number) => {
            const dx = landmarks[i1].x - landmarks[i2].x;
            const dy = landmarks[i1].y - landmarks[i2].y;
            const dz = landmarks[i1].z - landmarks[i2].z;
            return Math.sqrt(dx*dx + dy*dy + dz*dz);
          };

          const thumbTip = 4;
          const indexTip = 8;
          const wrist = 0;

          // Detect Pinch
          const pinchDistance = dist(thumbTip, indexTip);
          
          // Detect Open Hand
          const isExtended = (tip: number, pip: number) => dist(wrist, tip) > dist(wrist, pip) * 1.2;
          
          const indexOpen = isExtended(8, 6);
          const middleOpen = isExtended(12, 10);
          const ringOpen = isExtended(16, 14);
          const pinkyOpen = isExtended(20, 18);
          
          const isOpenHand = indexOpen && middleOpen && ringOpen && pinkyOpen;

          let newState: TreeState | null = null;

          if (pinchDistance < PINCH_THRESHOLD) {
             newState = TreeState.WORD;
          } else if (isOpenHand) {
             newState = TreeState.CHAOS;
          } else {
             newState = TreeState.FORMED;
          }

          if (newState) {
             onStateChange(newState);
          }

        } else {
          // No hand detected
          onRotationChange(0.5, 0.5, false);
        }
    } catch (e) {
        console.warn("Detection error:", e);
    }
    
    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [onStateChange, onRotationChange]);


  const startWebcam = useCallback(async () => {
    if (!handLandmarkerRef.current) return;
    setError(null);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 320,
            height: 240,
            facingMode: "user"
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for metadata to load before predicting
          videoRef.current.onloadeddata = () => {
              setIsLoaded(true);
              predictWebcam();
          };
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Camera Access Denied");
        setIsLoaded(true); // Stop loading spinner
      }
    } else {
        setError("Camera Not Supported");
        setIsLoaded(true);
    }
  }, [predictWebcam]);


  useEffect(() => {
    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        // Auto-start once AI is ready
        startWebcam();

      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setError("AI Init Failed");
        setIsLoaded(true);
      }
    };

    setupMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startWebcam]);

  return (
    <div className="absolute bottom-8 left-8 z-50 pointer-events-auto">
      <div className="relative rounded-lg overflow-hidden border-2 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.2)] bg-black/50 backdrop-blur transition-all duration-300">
        
        {/* Error State / Manual Start */}
        {error ? (
            <div className="w-32 h-24 flex flex-col items-center justify-center bg-red-900/80 p-2 text-center gap-2">
                <span className="text-[10px] text-red-200 font-sans uppercase tracking-widest">{error}</span>
                <button 
                    onClick={() => startWebcam()}
                    className="px-2 py-1 bg-red-500/20 hover:bg-red-500/40 border border-red-400/50 text-[10px] text-white rounded uppercase tracking-wide transition-colors"
                >
                    Retry
                </button>
            </div>
        ) : (
            <>
                <video 
                  ref={videoRef} 
                  className={`w-32 h-24 object-cover transform -scale-x-100 ${!isLoaded ? 'opacity-0' : 'opacity-100'}`}
                  autoPlay 
                  muted 
                  playsInline
                />
                
                {/* Loading Overlay */}
                {!isLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[8px] text-yellow-100/70 font-sans uppercase tracking-widest">
                        Initializing AI...
                    </span>
                  </div>
                )}

                {/* Status Bar */}
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/90 to-transparent p-1">
                  <div className="flex items-center justify-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isLoaded ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                      <p className="text-[8px] text-center text-yellow-100/80 font-mono tracking-widest">
                          {isLoaded ? 'VISION ACTIVE' : 'LOADING'}
                      </p>
                  </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
