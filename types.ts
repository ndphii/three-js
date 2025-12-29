export interface GestureState {
  activeShapeIndex: number; // 1, 2, or 3 representing different text/shapes
  dispersionFactor: number; // 0.0 to 1.0 (tight to spread)
  isHandDetected: boolean;
}

export type ParticleData = {
  x: number;
  y: number;
  z: number;
};
