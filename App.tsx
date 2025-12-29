import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { HandTracker } from './components/HandTracker';
import { GestureState } from './types';

export default function App() {
  // Shared state between the vision system and the 3D scene
  const [gestureState, setGestureState] = useState<GestureState>({
    activeShapeIndex: 1, // Default to 'I'
    dispersionFactor: 0, // 0 = tight, 1 = exploded
    isHandDetected: false,
  });

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* 1. Camera Background Layer (z-0) */}
      <HandTracker onUpdate={setGestureState} />

      {/* 2. 3D Scene Layer (z-10) - Transparent Background */}
      <div className="absolute inset-0 z-10">
        <Canvas camera={{ position: [0, 0, 30], fov: 45 }} gl={{ alpha: true }}>
          {/* Background color removed to allow video passthrough */}
          <Scene gestureState={gestureState} />
        </Canvas>
      </div>

      {/* 3. UI Overlay (z-20) */}
      <div className="absolute top-0 left-0 p-6 z-20 pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
          MAGIC PARTICLES
        </h1>
        <div className="space-y-2 text-sm text-gray-200 max-w-xs font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
          <p>
            <span className="text-pink-400 font-bold">LEFT HAND:</span>
            <br/>
            ☝️ 1 Finger = "I"
            <br/>
            ✌️ 2 Fingers = "LOVE"
            <br/>
            👌 3+ Fingers = "YOU"
          </p>
          <p className="mt-2">
            <span className="text-purple-400 font-bold">RIGHT HAND:</span>
            <br/>
            ✊ Close / 🖐 Open to Scatter
          </p>
          <div className="pt-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${gestureState.isHandDetected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
            <span>{gestureState.isHandDetected ? 'System Online' : 'Searching for Hand...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}