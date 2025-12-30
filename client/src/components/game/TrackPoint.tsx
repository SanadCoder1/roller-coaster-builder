import { useRef, useEffect, useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { TransformControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { useRollerCoaster } from "@/lib/stores/useRollerCoaster";

interface TrackPointProps {
  id: string;
  position: THREE.Vector3;
  tilt: number;
  index: number;
}

export function TrackPoint({ id, position, tilt, index }: TrackPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const transformRef = useRef<any>(null);
  const [meshReady, setMeshReady] = useState(false);
  const { selectedPointId, selectPoint, updateTrackPoint, updateTrackPointTilt, mode, setIsDraggingPoint } = useRollerCoaster();
  
  const isSelected = selectedPointId === id;
  
  useEffect(() => {
    if (meshRef.current) {
      setMeshReady(true);
    }
  }, []);
  
  useEffect(() => {
    if (!transformRef.current) return;
    
    const controls = transformRef.current;
    
    const handleDraggingChanged = (event: any) => {
      setIsDraggingPoint(event.value);
      
      if (!event.value && meshRef.current) {
        const worldPos = new THREE.Vector3();
        meshRef.current.getWorldPosition(worldPos);
        const clampedY = Math.max(0.5, worldPos.y);
        updateTrackPoint(id, new THREE.Vector3(worldPos.x, clampedY, worldPos.z));
      }
    };
    
    const handleObjectChange = () => {
      if (meshRef.current) {
        const worldPos = new THREE.Vector3();
        meshRef.current.getWorldPosition(worldPos);
        const clampedY = Math.max(0.5, worldPos.y);
        updateTrackPoint(id, new THREE.Vector3(worldPos.x, clampedY, worldPos.z));
      }
    };
    
    controls.addEventListener("dragging-changed", handleDraggingChanged);
    controls.addEventListener("objectChange", handleObjectChange);
    
    return () => {
      controls.removeEventListener("dragging-changed", handleDraggingChanged);
      controls.removeEventListener("objectChange", handleObjectChange);
    };
  }, [id, updateTrackPoint, setIsDraggingPoint, isSelected, meshReady]);
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (mode !== "build") return;
    e.stopPropagation();
    selectPoint(id);
  };
  
  const handleTiltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTilt = parseFloat(e.target.value);
    updateTrackPointTilt(id, newTilt);
  };
  
  if (mode === "ride") return null;
  
  return (
    <group>
      <mesh
        ref={meshRef}
        position={[position.x, position.y, position.z]}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? "#ff6600" : "#4488ff"}
          emissive={isSelected ? "#ff3300" : "#000000"}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {isSelected && meshReady && meshRef.current && (
        <>
          <TransformControls
            ref={transformRef}
            object={meshRef.current}
            mode="translate"
            size={0.75}
            showX={true}
            showY={true}
            showZ={true}
          />
          
          <Html position={[position.x, position.y + 2, position.z]} center>
            <div 
              className="bg-black/80 text-white p-2 rounded text-xs whitespace-nowrap"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-center gap-2">
                <span>Tilt:</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="5"
                  value={tilt}
                  onChange={handleTiltChange}
                  className="w-20 h-2 cursor-pointer"
                />
                <span className="w-8">{tilt}°</span>
              </div>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}
