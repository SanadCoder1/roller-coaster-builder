import { useRef, useState, useEffect } from "react";
import { ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useRollerCoaster } from "@/lib/stores/useRollerCoaster";
import { TrackPoint } from "./TrackPoint";
import { Track } from "./Track";

export function TrackBuilder() {
  const { trackPoints, addTrackPoint, mode, selectPoint, isAddingPoints } = useRollerCoaster();
  const planeRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  
  const [isDraggingNew, setIsDraggingNew] = useState(false);
  const [dragPosition, setDragPosition] = useState<THREE.Vector3 | null>(null);
  const currentHeightRef = useRef(3);
  
  useEffect(() => {
    if (!isDraggingNew) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingNew || !dragPosition) return;
      
      const deltaY = e.movementY * -0.1;
      const newHeight = Math.max(0.5, Math.min(50, currentHeightRef.current + deltaY));
      currentHeightRef.current = newHeight;
      
      setDragPosition(new THREE.Vector3(dragPosition.x, newHeight, dragPosition.z));
    };
    
    const handlePointerUp = () => {
      if (isDraggingNew && dragPosition) {
        const finalPoint = new THREE.Vector3(dragPosition.x, currentHeightRef.current, dragPosition.z);
        addTrackPoint(finalPoint);
        console.log("Added track point at:", finalPoint);
      }
      
      setIsDraggingNew(false);
      setDragPosition(null);
      currentHeightRef.current = 3;
    };
    
    gl.domElement.addEventListener("pointermove", handlePointerMove);
    gl.domElement.addEventListener("pointerup", handlePointerUp);
    
    return () => {
      gl.domElement.removeEventListener("pointermove", handlePointerMove);
      gl.domElement.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingNew, dragPosition, addTrackPoint, gl.domElement]);
  
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== "build" || !isAddingPoints) return;
    e.stopPropagation();
    
    selectPoint(null);
    
    currentHeightRef.current = 3;
    const point = new THREE.Vector3(e.point.x, 3, e.point.z);
    
    setDragPosition(point);
    setIsDraggingNew(true);
  };
  
  return (
    <group>
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerDown={handlePointerDown}
        visible={false}
      >
        <planeGeometry args={[800, 800]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      <Track />
      
      {trackPoints.map((point, index) => (
        <TrackPoint
          key={point.id}
          id={point.id}
          position={point.position}
          tilt={point.tilt}
          index={index}
        />
      ))}
      
      {isDraggingNew && dragPosition && (
        <group>
          <mesh position={[dragPosition.x, dragPosition.y, dragPosition.z]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color="#00ff00" transparent opacity={0.7} />
          </mesh>
          <mesh position={[dragPosition.x, dragPosition.y / 2, dragPosition.z]}>
            <cylinderGeometry args={[0.05, 0.05, dragPosition.y, 8]} />
            <meshStandardMaterial color="#00ff00" transparent opacity={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}
