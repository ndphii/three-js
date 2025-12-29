import React, { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';
import { initializeHandLandmarker, detectHands, analyzeHandGesture } from '../services/visionService';
import { GestureState } from '../types';

interface HandTrackerProps {
  onUpdate: Dispatch<SetStateAction<GestureState>>;
}

export const HandTracker: React.FC<HandTrackerProps> = ({ onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  // Keep track of current state to pass to analyzer for persistence
  const currentStateRef = useRef<GestureState>({
    activeShapeIndex: 1,
    dispersionFactor: 0,
    isHandDetected: false
  });

  useEffect(() => {
    let lastVideoTime = -1;

    const startCamera = async () => {
      try {
        await initializeHandLandmarker();
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
             setCameraActive(true);
             predict();
          });
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    const predict = () => {
      if (videoRef.current && videoRef.current.currentTime !== lastVideoTime) {
        lastVideoTime = videoRef.current.currentTime;
        const results = detectHands(videoRef.current, Date.now());

        if (results && results.landmarks && results.landmarks.length > 0) {
          const analysis = analyzeHandGesture(results.landmarks, results.handednesses, currentStateRef.current);
          if (analysis) {
             const newState = {
               activeShapeIndex: analysis.shapeIndex,
               dispersionFactor: analysis.dispersionFactor,
               isHandDetected: true
             };
             currentStateRef.current = newState;
             onUpdate(newState);
          }
        } else {
           // If no hands detected, keep shape/dispersion but mark detection false
           const newState = { ...currentStateRef.current, isHandDetected: false };
           onUpdate(newState);
        }
      }
      requestRef.current = requestAnimationFrame(predict);
    };

    startCamera();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // Removed bg-black to ensure full transparency if video loads slowly
    <div className="absolute inset-0 z-0 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        // Removed opacity-50, now fully visible (opacity-100 is default)
        className="w-full h-full object-cover transform scale-x-[-1]" 
      />
      {!cameraActive && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white bg-black">
          Initializing Camera...
        </div>
      )}
    </div>
  );
};