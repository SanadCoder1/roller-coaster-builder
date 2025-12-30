import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRollerCoaster } from "@/lib/stores/useRollerCoaster";
import { getTrackCurve, getTrackTiltAtProgress } from "./Track";

export function RideCamera() {
  const { camera } = useThree();
  const { trackPoints, isRiding, rideProgress, setRideProgress, rideSpeed, stopRide, isLooped, hasChainLift } = useRollerCoaster();
  
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const previousCameraPos = useRef(new THREE.Vector3());
  const previousLookAt = useRef(new THREE.Vector3());
  const previousRoll = useRef(0);
  const maxHeightReached = useRef(0);
  
  const firstPeakT = useMemo(() => {
    if (trackPoints.length < 2) return 0;
    
    const curve = getTrackCurve(trackPoints, isLooped);
    if (!curve) return 0;
    
    let maxHeight = -Infinity;
    let peakT = 0;
    let foundClimb = false;
    
    for (let t = 0; t <= 0.5; t += 0.01) {
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      
      if (tangent.y > 0.1) {
        foundClimb = true;
      }
      
      if (foundClimb && point.y > maxHeight) {
        maxHeight = point.y;
        peakT = t;
      }
      
      if (foundClimb && tangent.y < -0.1 && t > peakT) {
        break;
      }
    }
    
    return peakT > 0 ? peakT : 0.2;
  }, [trackPoints, isLooped]);
  
  useEffect(() => {
    curveRef.current = getTrackCurve(trackPoints, isLooped);
  }, [trackPoints, isLooped]);
  
  useEffect(() => {
    if (isRiding && curveRef.current) {
      const startPoint = curveRef.current.getPoint(0);
      maxHeightReached.current = startPoint.y;
    }
  }, [isRiding]);
  
  useFrame((_, delta) => {
    if (!isRiding || !curveRef.current) return;
    
    const curve = curveRef.current;
    const curveLength = curve.getLength();
    const currentPoint = curve.getPoint(rideProgress);
    const currentHeight = currentPoint.y;
    
    let speed: number;
    
    if (hasChainLift && rideProgress < firstPeakT) {
      const chainSpeed = 0.9 * rideSpeed;
      speed = chainSpeed;
      maxHeightReached.current = Math.max(maxHeightReached.current, currentHeight);
    } else {
      maxHeightReached.current = Math.max(maxHeightReached.current, currentHeight);
      
      const gravity = 9.8;
      const heightDrop = maxHeightReached.current - currentHeight;
      
      const energySpeed = Math.sqrt(2 * gravity * Math.max(0, heightDrop));
      
      const minSpeed = 1.0;
      speed = Math.max(minSpeed, energySpeed) * rideSpeed;
    }
    
    const progressDelta = (speed * delta) / curveLength;
    let newProgress = rideProgress + progressDelta;
    
    if (newProgress >= 1) {
      if (isLooped) {
        newProgress = newProgress % 1;
        if (hasChainLift) {
          const startPoint = curve.getPoint(0);
          maxHeightReached.current = startPoint.y;
        }
      } else {
        stopRide();
        return;
      }
    }
    
    setRideProgress(newProgress);
    
    const position = curve.getPoint(newProgress);
    const lookAheadT = isLooped 
      ? (newProgress + 0.02) % 1 
      : Math.min(newProgress + 0.02, 0.999);
    const lookAtPoint = curve.getPoint(lookAheadT);
    
    const tangent = curve.getTangent(newProgress);
    const binormal = new THREE.Vector3();
    const normal = new THREE.Vector3(0, 1, 0);
    binormal.crossVectors(tangent, normal).normalize();
    
    const cameraHeight = 1.5;
    const cameraOffset = normal.clone().multiplyScalar(cameraHeight);
    
    const targetCameraPos = position.clone().add(cameraOffset);
    const targetLookAt = lookAtPoint.clone().add(cameraOffset.clone().multiplyScalar(0.5));
    
    previousCameraPos.current.lerp(targetCameraPos, 0.1);
    previousLookAt.current.lerp(targetLookAt, 0.1);
    
    const tilt = getTrackTiltAtProgress(trackPoints, newProgress, isLooped);
    const targetRoll = (tilt * Math.PI) / 180;
    previousRoll.current = previousRoll.current + (targetRoll - previousRoll.current) * 0.1;
    
    camera.position.copy(previousCameraPos.current);
    camera.lookAt(previousLookAt.current);
    camera.rotateZ(-previousRoll.current);
  });
  
  return null;
}
