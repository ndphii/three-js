import { FilesetResolver, HandLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";

let handLandmarker: HandLandmarker | undefined;

export const initializeHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });
  
  return handLandmarker;
};

export const detectHands = (video: HTMLVideoElement, timestamp: number) => {
  if (!handLandmarker) return null;
  const result = handLandmarker.detectForVideo(video, timestamp);
  return result;
};

/**
 * Calculates gesture (Left Hand) and openness (Right Hand)
 */
export const analyzeHandGesture = (landmarks: any[], handednesses: any[], currentState: any) => {
  if (!landmarks || landmarks.length === 0 || !handednesses || handednesses.length === 0) {
    return null;
  }

  // Preserve previous state by default
  let shapeIndex = currentState.activeShapeIndex;
  let dispersionFactor = currentState.dispersionFactor;

  // Iterate through all detected hands
  for (let i = 0; i < landmarks.length; i++) {
    const hand = landmarks[i];
    const handedness = handednesses[i][0]; // { categoryName: 'Left' | 'Right', score: ... }
    const label = handedness.categoryName; 

    // NOTE: MediaPipe 'Left' usually corresponds to the person's Left hand 
    // (though in mirrored video it appears on the left side).

    // --- LEFT HAND: Controls SHAPE ---
    if (label === 'Left') {
      const isIndexUp = hand[8].y < hand[6].y;
      const isMiddleUp = hand[12].y < hand[10].y;
      const isRingUp = hand[16].y < hand[14].y;
      const isPinkyUp = hand[20].y < hand[18].y;

      let fingerCount = 0;
      if (isIndexUp) fingerCount++;
      if (isMiddleUp) fingerCount++;
      if (isRingUp) fingerCount++;
      if (isPinkyUp) fingerCount++;

      // MAPPING UPDATE:
      // 1 finger -> Shape 1 ("I")
      // 2 fingers -> Shape 2 ("LOVE")
      // 3 or more fingers -> Shape 3 ("YOU")
      if (fingerCount === 1) shapeIndex = 1;
      else if (fingerCount === 2) shapeIndex = 2;
      else if (fingerCount >= 3) shapeIndex = 3;
    }

    // --- RIGHT HAND: Controls DISPERSION (Open/Close) ---
    if (label === 'Right') {
      const wrist = hand[0];
      const tips = [4, 8, 12, 16, 20];
      let totalDist = 0;
      
      tips.forEach(idx => {
        const dx = hand[idx].x - wrist.x;
        const dy = hand[idx].y - wrist.y;
        totalDist += Math.sqrt(dx * dx + dy * dy);
      });

      const avgDist = totalDist / 5;
      const minOpen = 0.15;
      const maxOpen = 0.45;
      
      // Calculate new dispersion
      dispersionFactor = Math.min(Math.max((avgDist - minOpen) / (maxOpen - minOpen), 0), 1);
    }
  }

  return {
    shapeIndex,
    dispersionFactor
  };
};