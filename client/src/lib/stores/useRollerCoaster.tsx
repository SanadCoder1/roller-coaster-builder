import { create } from "zustand";
import * as THREE from "three";

export type CoasterMode = "build" | "ride" | "preview";

export interface LoopMetadata {
  entryPos: THREE.Vector3;
  forward: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
  radius: number;
  theta: number; // 0 to 2π position in loop
}

export interface TrackPoint {
  id: string;
  position: THREE.Vector3;
  tilt: number;
  loopMeta?: LoopMetadata; // Present if this point is part of a loop
}

// Serializable versions for JSON storage
interface SerializedLoopMeta {
  entryPos: [number, number, number];
  forward: [number, number, number];
  up: [number, number, number];
  right: [number, number, number];
  radius: number;
  theta: number;
}

interface SerializedTrackPoint {
  id: string;
  position: [number, number, number];
  tilt: number;
  loopMeta?: SerializedLoopMeta;
}

export interface SavedCoaster {
  id: string;
  name: string;
  timestamp: number;
  trackPoints: SerializedTrackPoint[];
  isLooped: boolean;
  hasChainLift: boolean;
  showWoodSupports: boolean;
}

// Serialization helpers
function serializeVector3(v: THREE.Vector3): [number, number, number] {
  return [v.x, v.y, v.z];
}

function deserializeVector3(arr: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
}

function serializeTrackPoint(point: TrackPoint): SerializedTrackPoint {
  const serialized: SerializedTrackPoint = {
    id: point.id,
    position: serializeVector3(point.position),
    tilt: point.tilt,
  };
  if (point.loopMeta) {
    serialized.loopMeta = {
      entryPos: serializeVector3(point.loopMeta.entryPos),
      forward: serializeVector3(point.loopMeta.forward),
      up: serializeVector3(point.loopMeta.up),
      right: serializeVector3(point.loopMeta.right),
      radius: point.loopMeta.radius,
      theta: point.loopMeta.theta,
    };
  }
  return serialized;
}

function deserializeTrackPoint(serialized: SerializedTrackPoint): TrackPoint {
  const point: TrackPoint = {
    id: serialized.id,
    position: deserializeVector3(serialized.position),
    tilt: serialized.tilt,
  };
  if (serialized.loopMeta) {
    point.loopMeta = {
      entryPos: deserializeVector3(serialized.loopMeta.entryPos),
      forward: deserializeVector3(serialized.loopMeta.forward),
      up: deserializeVector3(serialized.loopMeta.up),
      right: deserializeVector3(serialized.loopMeta.right),
      radius: serialized.loopMeta.radius,
      theta: serialized.loopMeta.theta,
    };
  }
  return point;
}

const STORAGE_KEY = "roller_coaster_saves";

function loadSavedCoasters(): SavedCoaster[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function persistSavedCoasters(coasters: SavedCoaster[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coasters));
}

interface RollerCoasterState {
  mode: CoasterMode;
  trackPoints: TrackPoint[];
  selectedPointId: string | null;
  rideProgress: number;
  isRiding: boolean;
  rideSpeed: number;
  isDraggingPoint: boolean;
  isAddingPoints: boolean;
  isLooped: boolean;
  hasChainLift: boolean;
  showWoodSupports: boolean;
  isNightMode: boolean;
  cameraTarget: THREE.Vector3 | null;
  savedCoasters: SavedCoaster[];
  currentCoasterName: string | null;
  
  setMode: (mode: CoasterMode) => void;
  setCameraTarget: (target: THREE.Vector3 | null) => void;
  addTrackPoint: (position: THREE.Vector3) => void;
  updateTrackPoint: (id: string, position: THREE.Vector3) => void;
  updateTrackPointTilt: (id: string, tilt: number) => void;
  removeTrackPoint: (id: string) => void;
  createLoopAtPoint: (id: string) => void;
  selectPoint: (id: string | null) => void;
  clearTrack: () => void;
  setRideProgress: (progress: number) => void;
  setIsRiding: (riding: boolean) => void;
  setRideSpeed: (speed: number) => void;
  setIsDraggingPoint: (dragging: boolean) => void;
  setIsAddingPoints: (adding: boolean) => void;
  setIsLooped: (looped: boolean) => void;
  setHasChainLift: (hasChain: boolean) => void;
  setShowWoodSupports: (show: boolean) => void;
  setIsNightMode: (night: boolean) => void;
  startRide: () => void;
  stopRide: () => void;
  
  // Save/Load functionality
  saveCoaster: (name: string) => void;
  loadCoaster: (id: string) => void;
  deleteCoaster: (id: string) => void;
  exportCoaster: (id: string) => string | null;
  importCoaster: (jsonString: string) => boolean;
  refreshSavedCoasters: () => void;
}

let pointCounter = 0;

export const useRollerCoaster = create<RollerCoasterState>((set, get) => ({
  mode: "build",
  trackPoints: [],
  selectedPointId: null,
  rideProgress: 0,
  isRiding: false,
  rideSpeed: 1.0,
  isDraggingPoint: false,
  isAddingPoints: true,
  isLooped: false,
  hasChainLift: true,
  showWoodSupports: false,
  isNightMode: false,
  cameraTarget: null,
  savedCoasters: loadSavedCoasters(),
  currentCoasterName: null,
  
  setMode: (mode) => set({ mode }),
  
  setCameraTarget: (target) => set({ cameraTarget: target }),
  
  setIsDraggingPoint: (dragging) => set({ isDraggingPoint: dragging }),
  
  setIsAddingPoints: (adding) => set({ isAddingPoints: adding }),
  
  setIsLooped: (looped) => set({ isLooped: looped }),
  
  setHasChainLift: (hasChain) => set({ hasChainLift: hasChain }),
  
  setShowWoodSupports: (show) => set({ showWoodSupports: show }),
  
  setIsNightMode: (night) => set({ isNightMode: night }),
  
  addTrackPoint: (position) => {
    const id = `point-${++pointCounter}`;
    set((state) => ({
      trackPoints: [...state.trackPoints, { id, position: position.clone(), tilt: 0 }],
    }));
  },
  
  updateTrackPoint: (id, position) => {
    set((state) => ({
      trackPoints: state.trackPoints.map((point) =>
        point.id === id ? { ...point, position: position.clone() } : point
      ),
    }));
  },
  
  updateTrackPointTilt: (id, tilt) => {
    set((state) => ({
      trackPoints: state.trackPoints.map((point) =>
        point.id === id ? { ...point, tilt } : point
      ),
    }));
  },
  
  removeTrackPoint: (id) => {
    set((state) => ({
      trackPoints: state.trackPoints.filter((point) => point.id !== id),
      selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
    }));
  },
  
  createLoopAtPoint: (id) => {
    set((state) => {
      const pointIndex = state.trackPoints.findIndex((p) => p.id === id);
      if (pointIndex === -1) return state;
      
      const entryPoint = state.trackPoints[pointIndex];
      const entryPos = entryPoint.position.clone();
      
      // Build a temporary spline to get the TRUE tangent at the entry point
      // This ensures the loop follows the track's actual direction
      const points = state.trackPoints.map((p) => p.position.clone());
      const tempCurve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
      
      // Get parameter t for this point
      const t = pointIndex / (state.trackPoints.length - 1);
      
      // Sample TRUE tangent from the spline (includes curvature direction)
      let forward = tempCurve.getTangent(t).normalize();
      
      // Make forward horizontal for vertical loop (project to XZ and renormalize)
      const horizontalForward = new THREE.Vector3(forward.x, 0, forward.z);
      if (horizontalForward.length() > 0.01) {
        forward = horizontalForward.normalize();
      }
      
      const loopRadius = 5;
      const totalLoopPoints = 32;  // More points for smoother spline
      const loopPoints: TrackPoint[] = [];
      
      // World up for vertical loop
      const up = new THREE.Vector3(0, 1, 0);
      // Right vector perpendicular to forward and up
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();
      
      // NO helical offset - pure vertical loop for cleaner geometry
      
      // Build the pure vertical loop
      for (let i = 0; i <= totalLoopPoints; i++) {
        const loopT = i / totalLoopPoints; // 0 to 1
        const theta = loopT * Math.PI * 2; // 0 to 2π
        
        // Pure vertical loop: position = entry + sin(θ)*forward*R + (1-cos(θ))*up*R
        const forwardOffset = Math.sin(theta) * loopRadius;
        const verticalOffset = (1 - Math.cos(theta)) * loopRadius;
        
        loopPoints.push({
          id: `point-${++pointCounter}`,
          position: new THREE.Vector3(
            entryPos.x + forward.x * forwardOffset,
            entryPos.y + verticalOffset,
            entryPos.z + forward.z * forwardOffset
          ),
          tilt: 0,
          loopMeta: {
            entryPos: entryPos.clone(),
            forward: forward.clone(),
            up: up.clone(),
            right: right.clone(),
            radius: loopRadius,
            theta: theta
          }
        });
      }
      
      // Loop exit position (same as entry for pure vertical loop)
      const loopExitPos = loopPoints[loopPoints.length - 1].position.clone();
      
      // Departure points - continue straight in the forward direction
      const departureDist = 4;
      const departurePoints: TrackPoint[] = [];
      
      // Add 2 departure guide points to ensure smooth exit
      for (let i = 1; i <= 2; i++) {
        departurePoints.push({
          id: `point-${++pointCounter}`,
          position: new THREE.Vector3(
            loopExitPos.x + forward.x * departureDist * i,
            loopExitPos.y,
            loopExitPos.z + forward.z * departureDist * i
          ),
          tilt: 0
        });
      }
      
      // Combine: replace the entry point with loop + departure
      // Don't add approach points - the existing track provides the approach
      const newTrackPoints = [
        ...state.trackPoints.slice(0, pointIndex),  // Points before entry (provide natural approach)
        ...loopPoints,
        ...departurePoints,
        ...state.trackPoints.slice(pointIndex + 1)  // Points after entry
      ];
      
      return { trackPoints: newTrackPoints };
    });
  },
  
  selectPoint: (id) => set({ selectedPointId: id }),
  
  clearTrack: () => {
    set({ trackPoints: [], selectedPointId: null, rideProgress: 0, isRiding: false });
  },
  
  setRideProgress: (progress) => set({ rideProgress: progress }),
  
  setIsRiding: (riding) => set({ isRiding: riding }),
  
  setRideSpeed: (speed) => set({ rideSpeed: speed }),
  
  startRide: () => {
    const { trackPoints } = get();
    if (trackPoints.length >= 2) {
      set({ mode: "ride", isRiding: true, rideProgress: 0 });
    }
  },
  
  stopRide: () => {
    set({ mode: "build", isRiding: false, rideProgress: 0 });
  },
  
  // Save/Load functionality
  saveCoaster: (name: string) => {
    const state = get();
    const id = `coaster-${Date.now()}`;
    const savedCoaster: SavedCoaster = {
      id,
      name,
      timestamp: Date.now(),
      trackPoints: state.trackPoints.map(serializeTrackPoint),
      isLooped: state.isLooped,
      hasChainLift: state.hasChainLift,
      showWoodSupports: state.showWoodSupports,
    };
    
    const coasters = loadSavedCoasters();
    coasters.push(savedCoaster);
    persistSavedCoasters(coasters);
    
    set({ savedCoasters: coasters, currentCoasterName: name });
  },
  
  loadCoaster: (id: string) => {
    try {
      const coasters = loadSavedCoasters();
      const coaster = coasters.find(c => c.id === id);
      if (!coaster || !Array.isArray(coaster.trackPoints)) return;
      
      const trackPoints = coaster.trackPoints.map(deserializeTrackPoint);
      
      // Update pointCounter to avoid ID collisions
      const maxId = trackPoints.reduce((max, p) => {
        const num = parseInt(p.id.replace('point-', ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      pointCounter = maxId;
      
      set({
        trackPoints,
        isLooped: Boolean(coaster.isLooped),
        hasChainLift: coaster.hasChainLift !== false,
        showWoodSupports: Boolean(coaster.showWoodSupports),
        currentCoasterName: coaster.name || "Untitled",
        selectedPointId: null,
        rideProgress: 0,
        isRiding: false,
        mode: "build",
      });
    } catch (e) {
      console.error("Failed to load coaster:", e);
    }
  },
  
  deleteCoaster: (id: string) => {
    const coasters = loadSavedCoasters().filter(c => c.id !== id);
    persistSavedCoasters(coasters);
    set({ savedCoasters: coasters });
  },
  
  exportCoaster: (id: string) => {
    const coasters = loadSavedCoasters();
    const coaster = coasters.find(c => c.id === id);
    if (!coaster) return null;
    return JSON.stringify(coaster, null, 2);
  },
  
  importCoaster: (jsonString: string) => {
    try {
      const coaster = JSON.parse(jsonString);
      
      // Validate required fields
      if (!coaster || typeof coaster !== 'object') return false;
      if (typeof coaster.name !== 'string' || !coaster.name.trim()) return false;
      if (!Array.isArray(coaster.trackPoints)) return false;
      
      // Validate each track point has required structure
      for (const pt of coaster.trackPoints) {
        if (!pt || typeof pt !== 'object') return false;
        if (!Array.isArray(pt.position) || pt.position.length !== 3) return false;
        if (!pt.position.every((n: unknown) => typeof n === 'number' && isFinite(n))) return false;
        if (typeof pt.tilt !== 'number') return false;
        if (typeof pt.id !== 'string') return false;
        
        // Validate loopMeta if present
        if (pt.loopMeta) {
          const lm = pt.loopMeta;
          if (!Array.isArray(lm.entryPos) || lm.entryPos.length !== 3) return false;
          if (!Array.isArray(lm.forward) || lm.forward.length !== 3) return false;
          if (!Array.isArray(lm.up) || lm.up.length !== 3) return false;
          if (!Array.isArray(lm.right) || lm.right.length !== 3) return false;
          if (typeof lm.radius !== 'number' || typeof lm.theta !== 'number') return false;
        }
      }
      
      // Assign new ID to avoid conflicts
      const validCoaster: SavedCoaster = {
        id: `coaster-${Date.now()}`,
        name: coaster.name.trim(),
        timestamp: Date.now(),
        trackPoints: coaster.trackPoints,
        isLooped: Boolean(coaster.isLooped),
        hasChainLift: coaster.hasChainLift !== false,
        showWoodSupports: Boolean(coaster.showWoodSupports),
      };
      
      const coasters = loadSavedCoasters();
      coasters.push(validCoaster);
      persistSavedCoasters(coasters);
      set({ savedCoasters: coasters });
      return true;
    } catch {
      return false;
    }
  },
  
  refreshSavedCoasters: () => {
    set({ savedCoasters: loadSavedCoasters() });
  },
}));
