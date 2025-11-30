// frontend/src/App.jsx
import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  Box, 
  Plane, 
  Text, 
  PointerLockControls,
  Sphere,
  Cylinder,
  Environment,
  ContactShadows
} from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import axios from 'axios'
import { getApiUrl } from './config'
import './App.css'

// Add to your imports
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'

// Create an Image Display component
function StockImage({ url, position, scale = 1 }) {
    const texture = useLoader(TextureLoader, url || 'https://via.placeholder.com/800x600')
    
    return (
        <Plane args={[3 * scale, 1.5 * scale]} position={position}>
            <meshBasicMaterial map={texture} />
        </Plane>
    )
}

// First Person Controller Component (keep as is)
function Player() {
  const { camera } = useThree()
  const moveSpeed = 0.1
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (keys.current.hasOwnProperty(key)) {
        keys.current[key] = true
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase()
      if (keys.current.hasOwnProperty(key)) {
        keys.current[key] = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame(() => {
    const direction = new THREE.Vector3()
    const frontVector = new THREE.Vector3(0, 0, Number(keys.current.s) - Number(keys.current.w))
    const sideVector = new THREE.Vector3(Number(keys.current.a) - Number(keys.current.d), 0, 0)
    
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(moveSpeed)
      .applyQuaternion(camera.quaternion)
    
    camera.position.add(direction)
    
    // Boundary limits - keep player inside lobby (with some margin)
    const boundaryMargin = 0.5
    const minX = -19 + boundaryMargin
    const maxX = 19 - boundaryMargin
    const minZ = -29 + boundaryMargin
    const maxZ = 14 - boundaryMargin
    
    // Clamp position to boundaries
    if (camera.position.x < minX) camera.position.x = minX
    if (camera.position.x > maxX) camera.position.x = maxX
    if (camera.position.z < minZ) camera.position.z = minZ
    if (camera.position.z > maxZ) camera.position.z = maxZ
    
    camera.position.y = 1.7 // Eye height
  })

  return null
}

// Realistic Fish Component with detailed geometry
function StandingFish({ position, rotation = [0, 0, 0], scale = 1 }) {
  const meshRef = useRef()
  const time = useRef(Math.random() * 1000)
  
  // Create realistic fish texture programmatically
  const fishBodyMaterial = useRef()
  const fishHeadMaterial = useRef()
  
  useFrame((state, delta) => {
    time.current += delta
    // Subtle swaying animation
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(time.current * 0.5) * 0.02
      meshRef.current.position.y = position[1] + Math.sin(time.current * 0.3) * 0.02
    }
    
    // Animate texture offset for scale shimmer effect
    if (fishBodyMaterial.current) {
      fishBodyMaterial.current.emissiveIntensity = 0.1 + Math.sin(time.current * 2) * 0.05
    }
  })
  
  // Fish color variations (realistic fish colors)
  const fishColors = [
    { body: '#4a6fa5', head: '#3d5a8f', fin: '#5a7fb8', eye: '#ffd700' }, // Blue
    { body: '#6b8e23', head: '#556b2f', fin: '#7ba05b', eye: '#ffd700' }, // Green
    { body: '#8b7355', head: '#6b5742', fin: '#9b8565', eye: '#ffd700' }, // Brown
    { body: '#708090', head: '#5a6670', fin: '#7a8a9a', eye: '#ffd700' }, // Gray
  ]
  const colorSet = fishColors[Math.floor(Math.random() * fishColors.length)]
  
  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      {/* Main Fish Body - More detailed ellipsoid with better proportions */}
      <Sphere 
        args={[0.4 * scale, 32, 32]} 
        position={[0, 1.2 * scale, 0]} 
        scale={[0.55, 1.6, 0.35]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial 
          ref={fishBodyMaterial}
          color={colorSet.body}
          metalness={0.1}
          roughness={0.3}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          envMapIntensity={1.2}
          emissive={colorSet.body}
          emissiveIntensity={0.1}
          transmission={0.05}
          thickness={0.1}
        />
      </Sphere>
      
      {/* Fish Head - More defined with better shape */}
      <Sphere 
        args={[0.32 * scale, 32, 32]} 
        position={[0, 1.95 * scale, 0]} 
        scale={[0.75, 0.85, 0.55]}
        castShadow
      >
        <meshPhysicalMaterial 
          ref={fishHeadMaterial}
          color={colorSet.head}
          metalness={0.1}
          roughness={0.3}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          envMapIntensity={1.2}
          emissive={colorSet.head}
          emissiveIntensity={0.08}
          transmission={0.05}
        />
      </Sphere>
      
      {/* Realistic Eyes - Larger, more detailed */}
      {/* Left Eye */}
      <group position={[0.18 * scale, 1.98 * scale, 0.15 * scale]}>
        <Sphere args={[0.1 * scale, 16, 16]}>
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.0} />
        </Sphere>
        <Sphere args={[0.07 * scale, 16, 16]} position={[0, 0, 0.03 * scale]}>
          <meshStandardMaterial color={colorSet.eye} roughness={0.2} metalness={0.3} />
        </Sphere>
        <Sphere args={[0.04 * scale, 16, 16]} position={[0, 0, 0.05 * scale]}>
          <meshStandardMaterial color="#000000" roughness={0.0} />
        </Sphere>
        {/* Eye highlight */}
        <Sphere args={[0.015 * scale, 8, 8]} position={[0.02 * scale, 0.02 * scale, 0.06 * scale]}>
          <meshStandardMaterial color="#ffffff" roughness={0.0} />
        </Sphere>
      </group>
      
      {/* Right Eye */}
      <group position={[-0.18 * scale, 1.98 * scale, 0.15 * scale]}>
        <Sphere args={[0.1 * scale, 16, 16]}>
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.0} />
        </Sphere>
        <Sphere args={[0.07 * scale, 16, 16]} position={[0, 0, 0.03 * scale]}>
          <meshStandardMaterial color={colorSet.eye} roughness={0.2} metalness={0.3} />
        </Sphere>
        <Sphere args={[0.04 * scale, 16, 16]} position={[0, 0, 0.05 * scale]}>
          <meshStandardMaterial color="#000000" roughness={0.0} />
        </Sphere>
        {/* Eye highlight */}
        <Sphere args={[0.015 * scale, 8, 8]} position={[-0.02 * scale, 0.02 * scale, 0.06 * scale]}>
          <meshStandardMaterial color="#ffffff" roughness={0.0} />
        </Sphere>
      </group>
      
      {/* Mouth - Small opening */}
      <Box 
        args={[0.15 * scale, 0.05 * scale, 0.08 * scale]} 
        position={[0, 1.75 * scale, 0.25 * scale]}
        rotation={[0.2, 0, 0]}
      >
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </Box>
      
      {/* Dorsal Fin (top fin) - More realistic shape */}
      <Box 
        args={[0.08 * scale, 0.5 * scale, 0.3 * scale]} 
        position={[0, 1.6 * scale, 0.1 * scale]}
        rotation={[0, 0, 0]}
        castShadow
      >
        <meshPhysicalMaterial 
          color={colorSet.fin}
          metalness={0.05}
          roughness={0.4}
          clearcoat={0.6}
          envMapIntensity={0.8}
          transparent
          opacity={0.85}
        />
      </Box>
      
      {/* Tail Fin (touching ground) - More realistic forked tail */}
      <group position={[0, 0.3 * scale, 0]}>
        {/* Left side of tail */}
        <Box 
          args={[0.06 * scale, 0.7 * scale, 0.15 * scale]} 
          position={[-0.15 * scale, 0, 0]}
          rotation={[0, 0, -0.3]}
          castShadow
        >
          <meshPhysicalMaterial 
            color={colorSet.fin}
            metalness={0.05}
            roughness={0.4}
            clearcoat={0.6}
            envMapIntensity={0.8}
            transparent
            opacity={0.85}
          />
        </Box>
        {/* Right side of tail */}
        <Box 
          args={[0.06 * scale, 0.7 * scale, 0.15 * scale]} 
          position={[0.15 * scale, 0, 0]}
          rotation={[0, 0, 0.3]}
          castShadow
        >
          <meshPhysicalMaterial 
            color={colorSet.fin}
            metalness={0.05}
            roughness={0.4}
            clearcoat={0.6}
            envMapIntensity={0.8}
            transparent
            opacity={0.85}
          />
        </Box>
      </group>
      
      {/* Pectoral Fins (side fins) - More realistic shape */}
      <Box 
        args={[0.3 * scale, 0.03 * scale, 0.2 * scale]} 
        position={[0.25 * scale, 1.15 * scale, 0]} 
        rotation={[0, -0.4, -0.5]}
        castShadow
      >
        <meshPhysicalMaterial 
          color={colorSet.fin}
          metalness={0.05}
          roughness={0.4}
          clearcoat={0.6}
          envMapIntensity={0.8}
          transparent
          opacity={0.85}
        />
      </Box>
      <Box 
        args={[0.3 * scale, 0.03 * scale, 0.2 * scale]} 
        position={[-0.25 * scale, 1.15 * scale, 0]} 
        rotation={[0, 0.4, 0.5]}
        castShadow
      >
        <meshPhysicalMaterial 
          color={colorSet.fin}
          metalness={0.05}
          roughness={0.4}
          clearcoat={0.6}
          envMapIntensity={0.8}
          transparent
          opacity={0.85}
        />
      </Box>
      
      {/* Pelvic Fins (bottom fins) */}
      <Box 
        args={[0.2 * scale, 0.03 * scale, 0.15 * scale]} 
        position={[0.12 * scale, 0.8 * scale, 0]} 
        rotation={[0, -0.2, 0.3]}
        castShadow
      >
        <meshPhysicalMaterial 
          color={colorSet.fin}
          metalness={0.05}
          roughness={0.4}
          clearcoat={0.6}
          envMapIntensity={0.8}
          transparent
          opacity={0.85}
        />
      </Box>
      <Box 
        args={[0.2 * scale, 0.03 * scale, 0.15 * scale]} 
        position={[-0.12 * scale, 0.8 * scale, 0]} 
        rotation={[0, 0.2, -0.3]}
        castShadow
      >
        <meshPhysicalMaterial 
          color={colorSet.fin}
          metalness={0.05}
          roughness={0.4}
          clearcoat={0.6}
          envMapIntensity={0.8}
          transparent
          opacity={0.85}
        />
      </Box>
      
      {/* Scale detail - Small bumps for texture */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const radius = 0.35 * scale
        const y = 1.0 + (i % 3) * 0.3
        return (
          <Sphere 
            key={`scale-${i}`}
            args={[0.02 * scale, 8, 8]} 
            position={[
              Math.cos(angle) * radius,
              y * scale,
              Math.sin(angle) * radius * 0.6
            ]}
          >
            <meshStandardMaterial 
              color={colorSet.body}
              metalness={0.2}
              roughness={0.3}
              envMapIntensity={1.5}
            />
          </Sphere>
        )
      })}
      
      {/* Business Tie - Professional touch */}
      <Box 
        args={[0.06 * scale, 0.5 * scale, 0.02 * scale]} 
        position={[0, 1.0 * scale, 0.22 * scale]}
        castShadow
      >
        <meshStandardMaterial 
          color="#cc0000" 
          roughness={0.3}
          metalness={0.1}
        />
      </Box>
      <Box 
        args={[0.1 * scale, 0.06 * scale, 0.02 * scale]} 
        position={[0, 1.25 * scale, 0.22 * scale]}
        rotation={[0, 0, 0.1]}
        castShadow
      >
        <meshStandardMaterial 
          color="#cc0000" 
          roughness={0.3}
          metalness={0.1}
        />
      </Box>
    </group>
  )
}

// TV Screen Component 
function TVScreen({ position, rotation, prediction, scale = 1 }) {
  const scrollRef = useRef(0)
  const [imageTexture, setImageTexture] = useState(null)
  const textureRef = useRef(null)
  
  useFrame((state, delta) => {
      scrollRef.current += delta * 0.3
  })
  
  // Load image texture if URL exists
  useEffect(() => {
      if (prediction?.stockImageUrl) {
          console.log('Loading image for prediction:', prediction.headline, 'URL:', prediction.stockImageUrl)
          const loader = new THREE.TextureLoader()
          loader.crossOrigin = "anonymous"
          loader.load(
              prediction.stockImageUrl,
              (texture) => {
                  console.log('Image loaded successfully', texture)
                  // Ensure texture is properly configured - flipY true for correct orientation
                  texture.flipY = true
                  texture.needsUpdate = true
                  // Dispose old texture if it exists
                  if (textureRef.current) {
                      textureRef.current.dispose()
                  }
                  textureRef.current = texture
                  setImageTexture(texture)
              },
              undefined,
              (err) => {
                  console.error('Failed to load image:', err, 'URL:', prediction.stockImageUrl)
                  // Set a fallback placeholder texture
                  const fallbackUrl = 'https://via.placeholder.com/800x600/333333/666666?text=Image+Unavailable'
                  loader.load(fallbackUrl, (texture) => {
                      if (textureRef.current) {
                          textureRef.current.dispose()
                      }
                      textureRef.current = texture
                      setImageTexture(texture)
                  })
              }
          )
      } else {
          console.log('No stockImageUrl found for prediction:', prediction?.headline)
          setImageTexture(null)
      }
      
      // Cleanup function
      return () => {
          if (textureRef.current) {
              textureRef.current.dispose()
              textureRef.current = null
          }
      }
  }, [prediction?.stockImageUrl])

  // Remove "Stock Photo #" prefix from description if present
  const cleanDescription = prediction?.stockPhotoDescription 
    ? prediction.stockPhotoDescription.replace(/^Stock Photo #\d+:\s*/i, '')
    : null;

  return (
      <group position={position} rotation={rotation}>
          {/* TV Frame - more realistic with beveled edges */}
          <Box args={[4 * scale, 2.5 * scale, 0.2]} castShadow receiveShadow>
              <meshStandardMaterial 
                  color="#0a0a0a" 
                  metalness={0.9} 
                  roughness={0.15}
                  envMapIntensity={1.2}
              />
          </Box>
          
          {/* Screen bezel inner edge - pushed back */}
          <Box args={[3.75 * scale, 2.25 * scale, 0.05]} position={[0, 0, 0.08]}>
              <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
          </Box>
          
          {/* Screen background - black screen, pushed back */}
          <Box args={[3.7 * scale, 2.2 * scale, 0.01]} position={[0, 0, 0.09]}>
              <meshStandardMaterial 
                  color="#000" 
                  emissive="#000011"
                  emissiveIntensity={0.1}
              />
          </Box>
          
          {/* Stock Photo if available - spans full height below banner, on screen surface */}
          {imageTexture && (
              <Plane 
                  args={[3.6 * scale, 1.9 * scale]} 
                  position={[0, -0.25 * scale, 0.12]}
                  rotation={[0, 0, 0]}
              >
                  <meshBasicMaterial 
                      map={imageTexture} 
                      toneMapped={false}
                      side={THREE.FrontSide}
                  />
              </Plane>
          )}
          
          {/* Breaking News Banner - with subtle gradient effect, above image */}
          <Plane args={[3.6 * scale, 0.3 * scale]} position={[0, 0.85 * scale, 0.12]}>
              <meshStandardMaterial 
                  color="#cc0000" 
                  emissive="#440000"
                  emissiveIntensity={0.3}
              />
          </Plane>
          
          <Text
              position={[0, 0.85 * scale, 0.13]}
              fontSize={0.15 * scale}
              color="#ffffff"
              fontWeight="bold"
              letterSpacing={0.02}
              outlineWidth={0.01}
              outlineColor="#000000"
          >
              BREAKING NEWS
          </Text>
          
          {/* Lower third background for headline - positioned at bottom, behind text but visible */}
          <Plane args={[3.6 * scale, 0.5 * scale]} position={[0, -0.95 * scale, 0.125]}>
              <meshBasicMaterial color="#000000" opacity={0.8} transparent depthWrite={false} />
          </Plane>
          
          {/* Headline at bottom of screen */}
          <Text
              position={[0, -0.95 * scale, 0.135]}
              fontSize={0.09 * scale}
              maxWidth={3.4 * scale}
              lineHeight={1.2}
              color="white"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.01}
          >
              {prediction?.headline || "AWAITING TRANSMISSION..."}
          </Text>
          
          {/* Lower third background for description - at very bottom, behind text but visible */}
          {prediction?.stockPhotoDescription && (
              <Plane args={[3.6 * scale, 0.3 * scale]} position={[0, -1.15 * scale, 0.125]}>
                  <meshBasicMaterial color="#000000" opacity={0.8} transparent depthWrite={false} />
              </Plane>
          )}
          
          {/* Stock Photo Description - at very bottom */}
          {cleanDescription && (
              <Text
                  position={[0, -1.15 * scale, 0.135]}
                  fontSize={0.06 * scale}
                  color="#ffff00"
                  anchorX="center"
                  anchorY="middle"
                  fontStyle="italic"
                  maxWidth={3.5 * scale}
              >
                  {cleanDescription}
              </Text>
          )}
      </group>
  )
}

// Updated Lobby with Fish and Windows
function Lobby({ predictions }) {
  return (
    <>
      {/* External World - ADD THIS */}
      <Sphere args={[200, 32, 32]}>
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
      </Sphere>
      
      {/* External ground */}
      <Plane args={[500, 500]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -100]}>
        <meshStandardMaterial color="#4a7c59" />
      </Plane>
      
      {/* Distant buildings */}
      {[
        [-60, 15, -80], [70, 20, -90], [-80, 25, -100]
      ].map((pos, i) => (
        <Box key={`ext-building-${i}`} args={[15, pos[1] * 2, 15]} position={pos}>
          <meshStandardMaterial color="#5a6670" metalness={0.5} roughness={0.5} />
        </Box>
      ))}
      
      {/* Realistic Interior Lighting with shadows */}
      <ambientLight intensity={0.4} color="#f5f5f5" />
      
      {/* Main overhead lights */}
      <directionalLight 
          position={[0, 10, 5]} 
          intensity={1.2} 
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
      />
      
      {/* Fill lights for realism */}
      <pointLight position={[-10, 6, 10]} intensity={0.6} color="#fff8e1" castShadow />
      <pointLight position={[10, 6, 10]} intensity={0.6} color="#fff8e1" castShadow />
      <pointLight position={[0, 6, -20]} intensity={0.8} color="#ffffff" castShadow />
      
      {/* Subtle rim lighting */}
      <spotLight 
          position={[-20, 8, 0]} 
          angle={0.3} 
          penumbra={0.5} 
          intensity={0.4} 
          color="#e3f2fd"
          castShadow
      />
      <spotLight 
          position={[20, 8, 0]} 
          angle={0.3} 
          penumbra={0.5} 
          intensity={0.4} 
          color="#e3f2fd"
          castShadow
      />
      
      {/* Floor - realistic polished surface */}
      <Plane 
        args={[40, 45]} 
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -7.5]}
        receiveShadow
      >
        <meshStandardMaterial 
          color="#f0f0f0" 
          metalness={0.1}
          roughness={0.05}
          envMapIntensity={0.5}
        />
      </Plane>
      
      {/* Ceiling - with subtle texture */}
      <Plane 
        args={[40, 45]} 
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 8, -7.5]}
        receiveShadow
      >
        <meshStandardMaterial 
          color="#fafafa" 
          roughness={0.8}
          metalness={0.05}
        />
      </Plane>
      
      {/* Ceiling light fixtures - recessed spots */}
      {[-15, -5, 5, 15].map((x) => (
        <group key={`light-fixture-${x}`} position={[x, 7.9, -7.5]}>
          <Cylinder args={[0.8, 0.8, 0.1, 16]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#ffffff"
              emissiveIntensity={0.3}
              metalness={0.8}
              roughness={0.2}
            />
          </Cylinder>
          <pointLight position={[0, -0.05, 0]} intensity={0.8} color="#ffffff" />
        </group>
      ))}
      
      {/* Solid Walls with Windows */}
      {/* Back Wall - with windows */}
      <Box args={[40, 8, 0.3]} position={[0, 4, -30]} receiveShadow castShadow>
        <meshStandardMaterial 
          color="#e8e8e8" 
          roughness={0.6}
          metalness={0.05}
          envMapIntensity={0.3}
        />
      </Box>
      {/* Back wall windows */}
      {[-12, 0, 12].map((x) => (
        <group key={`back-window-${x}`} position={[x, 4, -29.8]}>
          {/* Window frame */}
          <Box args={[5, 3.5, 0.1]} position={[0, 0, 0]} receiveShadow castShadow>
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
          </Box>
          {/* Window glass */}
          <Box args={[4.5, 3, 0.05]} position={[0, 0, 0.03]}>
            <meshPhysicalMaterial 
              color="#87CEEB"
              transmission={0.7}
              thickness={0.1}
              roughness={0.1}
              metalness={0.0}
              ior={1.5}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
            />
          </Box>
          {/* Window mullions */}
          <Box args={[0.1, 3, 0.08]} position={[0, 0, 0.05]} castShadow>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
          <Box args={[4.5, 0.1, 0.08]} position={[0, 0, 0.05]} castShadow>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
        </group>
      ))}
      
      {/* Left Wall - solid with windows */}
      <Box args={[0.3, 8, 45]} position={[-20, 4, -7.5]} receiveShadow castShadow>
        <meshStandardMaterial 
          color="#e0e0e0" 
          roughness={0.6}
          metalness={0.05}
          envMapIntensity={0.3}
        />
      </Box>
      {/* Left wall windows */}
      {[-12, 0, 12].map((z) => (
        <group key={`left-window-${z}`} position={[-19.8, 4, z - 7.5]}>
          {/* Window frame */}
          <Box args={[0.1, 3.5, 5]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
          </Box>
          {/* Window glass */}
          <Box args={[0.05, 3, 4.5]} rotation={[0, Math.PI / 2, 0]} position={[0.03, 0, 0]}>
            <meshPhysicalMaterial 
              color="#87CEEB"
              transmission={0.7}
              thickness={0.1}
              roughness={0.1}
              metalness={0.0}
              ior={1.5}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
            />
          </Box>
          {/* Window mullions */}
          <Box args={[0.08, 3, 0.1]} rotation={[0, Math.PI / 2, 0]} position={[0.05, 0, 0]} castShadow>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
          <Box args={[0.08, 0.1, 4.5]} rotation={[0, Math.PI / 2, 0]} position={[0.05, 0, 0]} castShadow>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
        </group>
      ))}
      
      {/* Right Wall - solid with windows */}
      <Box args={[0.3, 8, 45]} position={[20, 4, -7.5]} receiveShadow castShadow>
        <meshStandardMaterial 
          color="#e0e0e0" 
          roughness={0.6}
          metalness={0.05}
          envMapIntensity={0.3}
        />
      </Box>
      {/* Right wall windows */}
      {[-12, 0, 12].map((z) => (
        <group key={`right-window-${z}`} position={[19.8, 4, z - 7.5]}>
          {/* Window frame */}
          <Box args={[0.1, 3.5, 5]} rotation={[0, -Math.PI / 2, 0]} receiveShadow castShadow>
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
          </Box>
          {/* Window glass */}
          <Box args={[0.05, 3, 4.5]} rotation={[0, -Math.PI / 2, 0]} position={[-0.03, 0, 0]}>
            <meshPhysicalMaterial 
              color="#87CEEB"
              transmission={0.7}
              thickness={0.1}
              roughness={0.1}
              metalness={0.0}
              ior={1.5}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
            />
          </Box>
          {/* Window mullions */}
          <Box args={[0.08, 3, 0.1]} rotation={[0, -Math.PI / 2, 0]} position={[-0.05, 0, 0]} castShadow>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
          <Box args={[0.08, 0.1, 4.5]} rotation={[0, -Math.PI / 2, 0]} position={[-0.05, 0, 0]} castShadow>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
        </group>
      ))}
      
      {/* Front Wall - solid (behind reception) with windows */}
      <Box args={[40, 8, 0.3]} position={[0, 4, 15]} receiveShadow castShadow>
        <meshStandardMaterial 
          color="#e8e8e8" 
          roughness={0.6}
          metalness={0.05}
          envMapIntensity={0.3}
        />
      </Box>
      {/* Front wall windows */}
      {[-12, 12].map((x) => (
        <group key={`front-window-${x}`} position={[x, 4, 14.8]}>
          {/* Window frame */}
          <Box args={[5, 3.5, 0.1]} position={[0, 0, 0]} receiveShadow castShadow>
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
          </Box>
          {/* Window glass */}
          <Box args={[4.5, 3, 0.05]} position={[0, 0, -0.03]}>
            <meshPhysicalMaterial 
              color="#87CEEB"
              transmission={0.7}
              thickness={0.1}
              roughness={0.1}
              metalness={0.0}
              ior={1.5}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
            />
          </Box>
          {/* Window mullions */}
          <Box args={[0.1, 3, 0.08]} position={[0, 0, -0.05]} castShadow>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
          <Box args={[4.5, 0.1, 0.08]} position={[0, 0, -0.05]} castShadow>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
        </group>
      ))}
      
      {/* Wall trim/baseboards for detail */}
      {[[0, -30], [0, 15], [-20, -7.5], [20, -7.5]].map(([x, z], i) => (
        <Box 
          key={`trim-${i}`}
          args={x === 0 ? [40.5, 0.15, 0.2] : [0.2, 0.15, 45.5]} 
          position={[x, 0.075, z]} 
          receiveShadow
        >
          <meshStandardMaterial 
            color="#c0c0c0" 
            roughness={0.4}
            metalness={0.1}
          />
        </Box>
      ))}
      
      {/* Realistic columns with shadows and decorative caps */}
      {[-10, 10].map((x) => 
        [-22, -7.5, 7.5, 22].map((z) => (
          <group key={`${x}-${z}`} position={[x, 4, z - 7.5]}>
            <Box args={[0.8, 8, 0.8]} castShadow receiveShadow>
              <meshStandardMaterial 
                color="#d0d0d0" 
                metalness={0.5} 
                roughness={0.15}
                envMapIntensity={1.0}
              />
            </Box>
            {/* Column capital */}
            <Box args={[1.0, 0.3, 1.0]} position={[0, 4.15, 0]} castShadow>
              <meshStandardMaterial 
                color="#e8e8e8" 
                metalness={0.6} 
                roughness={0.1}
                envMapIntensity={1.2}
              />
            </Box>
            {/* Column base */}
            <Box args={[1.0, 0.3, 1.0]} position={[0, -4.15, 0]} castShadow>
              <meshStandardMaterial 
                color="#e8e8e8" 
                metalness={0.6} 
                roughness={0.1}
                envMapIntensity={1.2}
              />
            </Box>
          </group>
        ))
      )}
      
      {/* TV panels - more realistic */}
      <Box args={[0.5, 6, 42]} position={[-15, 3, -5]} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#1a1a1a" 
          metalness={0.6}
          roughness={0.3}
        />
      </Box>
      <Box args={[0.5, 6, 42]} position={[15, 3, -5]} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#1a1a1a" 
          metalness={0.6}
          roughness={0.3}
        />
      </Box>
      
      {/* TVs - keep existing */}
      {predictions.slice(0, 12).map((pred, index) => (
        <TVScreen
          key={`left-${index}`}
          position={[-14.7, 2.0 + (index % 2) * 2.8, -20 + (Math.floor(index / 2) * 7.5)]}
          rotation={[0, Math.PI / 2, 0]}
          prediction={pred}
        />
      ))}
      
      {predictions.slice(12, 24).map((pred, index) => (
        <TVScreen
          key={`right-${index}`}
          position={[14.7, 2.0 + (index % 2) * 2.8, -20 + (Math.floor(index / 2) * 7.5)]}
          rotation={[0, -Math.PI / 2, 0]}
          prediction={pred}
        />
      ))}
      
      {/* Central screen - more realistic */}
      <Box args={[12, 7, 0.5]} position={[0, 4, -29.5]} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#0a0a0a" 
          metalness={0.8}
          roughness={0.15}
          envMapIntensity={1.0}
        />
      </Box>
      {predictions[0] && (
        <TVScreen
          position={[0, 4, -29]}
          rotation={[0, 0, 0]}
          prediction={predictions[0]}
          scale={2.5}
        />
      )}
      
      {/* Standing Fish throughout lobby - some looking at screens */}
      {/* Fish in front of door */}
      <StandingFish position={[0, 0, 12]} rotation={[0, Math.PI, 0]} scale={1.0} />
      
      {/* Fish looking at left wall TVs */}
      <StandingFish position={[-10, 0, -15]} rotation={[0, Math.PI / 2 + 0.2, 0]} scale={1.0} />
      <StandingFish position={[-8, 0, -8]} rotation={[0, Math.PI / 2, 0]} scale={0.95} />
      <StandingFish position={[-11, 0, -22]} rotation={[0, Math.PI / 2 - 0.1, 0]} scale={1.1} />
      
      {/* Fish looking at right wall TVs */}
      <StandingFish position={[10, 0, -15]} rotation={[0, -Math.PI / 2 - 0.2, 0]} scale={1.0} />
      <StandingFish position={[8, 0, -8]} rotation={[0, -Math.PI / 2, 0]} scale={0.95} />
      <StandingFish position={[11, 0, -22]} rotation={[0, -Math.PI / 2 + 0.1, 0]} scale={1.1} />
      
      {/* Fish looking at central screen */}
      <StandingFish position={[-2, 0, -20]} rotation={[0, Math.PI, 0]} scale={1.05} />
      <StandingFish position={[2, 0, -20]} rotation={[0, Math.PI, 0]} scale={1.05} />
      <StandingFish position={[-4, 0, -24]} rotation={[0, Math.PI + 0.1, 0]} scale={0.9} />
      <StandingFish position={[4, 0, -24]} rotation={[0, Math.PI - 0.1, 0]} scale={0.9} />
      
      {/* Additional fish throughout lobby */}
      <StandingFish position={[-7, 0, 2]} rotation={[0, 0.3, 0]} scale={1.0} />
      <StandingFish position={[7, 0, 5]} rotation={[0, -0.5, 0]} scale={1.0} />
      <StandingFish position={[-5, 0, -2]} rotation={[0, 0, 0]} scale={1.1} />
      <StandingFish position={[5, 0, -5]} rotation={[0, -1.5, 0]} scale={1.2} />
      <StandingFish position={[-8, 0, -15]} rotation={[0, 0.8, 0]} scale={0.95} />
      <StandingFish position={[8, 0, -18]} rotation={[0, -0.8, 0]} scale={1.05} />
      <StandingFish position={[-3, 0, -12]} rotation={[0, 1.5, 0]} scale={0.9} />
      <StandingFish position={[3, 0, -20]} rotation={[0, -1.2, 0]} scale={1.1} />
      <StandingFish position={[-6, 0, 8]} rotation={[0, Math.PI - 0.3, 0]} scale={1.0} />
      <StandingFish position={[6, 0, 8]} rotation={[0, Math.PI + 0.3, 0]} scale={1.0} />
      <StandingFish position={[-13, 0, -5]} rotation={[0, 1.0, 0]} scale={1.1} />
      <StandingFish position={[13, 0, -5]} rotation={[0, -1.0, 0]} scale={1.1} />
      
      {/* Reception desk - in front of central TV, facing scene */}
      <group position={[0, 0, -25]} rotation={[0, Math.PI, 0]}>
        <Box args={[8, 0.2, 3]} position={[0, 1.2, 0]} castShadow receiveShadow>
          <meshStandardMaterial 
            color="#ffffff" 
            metalness={0.2} 
            roughness={0.1}
            envMapIntensity={0.6}
          />
        </Box>
        <Box args={[8, 1.2, 0.1]} position={[0, 0.6, 1.5]} castShadow receiveShadow>
          <meshStandardMaterial 
            color="#f8f8f8" 
            roughness={0.4}
            metalness={0.05}
          />
        </Box>
        <Box args={[0.2, 1.2, 3]} position={[-4, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial 
            color="#f8f8f8" 
            roughness={0.4}
            metalness={0.05}
          />
        </Box>
        <Box args={[0.2, 1.2, 3]} position={[4, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial 
            color="#f8f8f8" 
            roughness={0.4}
            metalness={0.05}
          />
        </Box>
      </group>
      
      {/* Fish standing at reception desk, facing scene */}
      <StandingFish position={[0, 0, -26]} rotation={[0, 0, 0]} scale={1.0} />
      
      {/* Door in front wall - decorative, doesn't open */}
      <group position={[0, 0, 14.85]}>
        {/* Door frame */}
        <Box args={[3.5, 7.5, 0.15]} position={[0, 3.75, 0]} receiveShadow castShadow>
          <meshStandardMaterial 
            color="#2a2a2a" 
            roughness={0.4}
            metalness={0.3}
          />
        </Box>
        {/* Door panel */}
        <Box args={[3, 7, 0.1]} position={[0, 3.5, 0.03]} receiveShadow castShadow>
          <meshStandardMaterial 
            color="#4a3a2a" 
            roughness={0.7}
            metalness={0.1}
          />
        </Box>
        {/* Door panels/panels (decorative) */}
        <Box args={[2.8, 0.1, 0.05]} position={[0, 5.5, 0.05]} castShadow>
          <meshStandardMaterial color="#3a2a1a" />
        </Box>
        <Box args={[2.8, 0.1, 0.05]} position={[0, 4.5, 0.05]} castShadow>
          <meshStandardMaterial color="#3a2a1a" />
        </Box>
        <Box args={[2.8, 0.1, 0.05]} position={[0, 3.5, 0.05]} castShadow>
          <meshStandardMaterial color="#3a2a1a" />
        </Box>
        <Box args={[2.8, 0.1, 0.05]} position={[0, 2.5, 0.05]} castShadow>
          <meshStandardMaterial color="#3a2a1a" />
        </Box>
        {/* Vertical dividers */}
        <Box args={[0.1, 7, 0.05]} position={[-0.9, 3.5, 0.05]} castShadow>
          <meshStandardMaterial color="#3a2a1a" />
        </Box>
        <Box args={[0.1, 7, 0.05]} position={[0.9, 3.5, 0.05]} castShadow>
          <meshStandardMaterial color="#3a2a1a" />
        </Box>
        {/* Door handle */}
        <Cylinder args={[0.05, 0.05, 0.15, 8]} position={[1.3, 3.5, 0.08]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <meshStandardMaterial 
            color="#8b7355" 
            metalness={0.8}
            roughness={0.2}
          />
        </Cylinder>
        <Sphere args={[0.08, 8, 8]} position={[1.3, 3.5, 0.15]} castShadow>
          <meshStandardMaterial 
            color="#8b7355" 
            metalness={0.8}
            roughness={0.2}
          />
        </Sphere>
      </group>
      
      {/* Realistic benches with shadows and cushions */}
      {[-9, -3, 3, 9].map((x) => (
        <group key={`seating-${x}`} position={[x, 0, -2]}>
          {/* Bench base */}
          <Box args={[2, 0.5, 1]} position={[0, 0.25, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color="#3a3a3a" 
              roughness={0.7}
              metalness={0.15}
            />
          </Box>
          {/* Cushion */}
          <Box args={[1.8, 0.15, 0.9]} position={[0, 0.575, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color="#2a2a2a" 
              roughness={0.9}
              metalness={0.0}
            />
          </Box>
          {/* Legs */}
          {[-0.8, 0.8].map((offset) => (
            <Box key={`leg-${offset}`} args={[0.1, 0.5, 0.1]} position={[offset, 0.25, -0.4]} castShadow>
              <meshStandardMaterial 
                color="#2a2a2a" 
                roughness={0.8}
                metalness={0.2}
              />
            </Box>
          ))}
        </group>
      ))}
      
      {/* Additional seating area near reception */}
      {[-6, 6].map((x) => (
        <group key={`seating-reception-${x}`} position={[x, 0, 8]}>
          <Box args={[1.5, 0.4, 1]} position={[0, 0.2, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color="#3a3a3a" 
              roughness={0.7}
              metalness={0.15}
            />
          </Box>
          <Box args={[1.3, 0.12, 0.9]} position={[0, 0.46, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color="#2a2a2a" 
              roughness={0.9}
              metalness={0.0}
            />
          </Box>
        </group>
      ))}
      
      {/* Realistic plants with shadows and better detail */}
      {[[-18, 8], [18, 8], [-18, -15], [18, -15], [-12, -22], [12, -22], [-6, 5], [6, 5]].map(([x, z], i) => (
        <group key={`plant-${i}`} position={[x, 0, z - 7.5]}>
          {/* Planter pot */}
          <Cylinder args={[0.6, 0.5, 1.0, 16]} position={[0, 0.5, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color="#4a4a4a" 
              metalness={0.3} 
              roughness={0.6}
            />
          </Cylinder>
          {/* Soil */}
          <Cylinder args={[0.48, 0.48, 0.1, 16]} position={[0, 1.0, 0]} castShadow>
            <meshStandardMaterial 
              color="#3a2a1a" 
              roughness={0.9}
              metalness={0.0}
            />
          </Cylinder>
          {/* Plant stem */}
          <Cylinder args={[0.05, 0.05, 2.5, 8]} position={[0, 2.25, 0]} castShadow>
            <meshStandardMaterial 
              color="#2d5016" 
              roughness={0.9}
              metalness={0.0}
            />
          </Cylinder>
          {/* Leaves - multiple spheres */}
          {Array.from({ length: 8 }).map((_, j) => {
            const angle = (j / 8) * Math.PI * 2
            const radius = 0.4 + Math.random() * 0.2
            const height = 2.0 + (j % 3) * 0.4
            return (
              <Sphere key={`leaf-${j}`} args={[0.15, 8, 8]} position={[
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
              ]} castShadow>
                <meshStandardMaterial 
                  color="#1a6b1a" 
                  roughness={0.8}
                  metalness={0.0}
                />
              </Sphere>
            )
          })}
        </group>
      ))}
      
      {/* Decorative tables/coffee tables */}
      {[-7, 7].map((x) => (
        <group key={`table-${x}`} position={[x, 0, -5]}>
          <Box args={[1.5, 0.05, 1.5]} position={[0, 0.4, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color="#8b7355" 
              roughness={0.6}
              metalness={0.1}
            />
          </Box>
          <Box args={[0.05, 0.4, 0.05]} position={[-0.7, 0.2, -0.7]} castShadow>
            <meshStandardMaterial color="#6b5b3d" />
          </Box>
          <Box args={[0.05, 0.4, 0.05]} position={[0.7, 0.2, -0.7]} castShadow>
            <meshStandardMaterial color="#6b5b3d" />
          </Box>
          <Box args={[0.05, 0.4, 0.05]} position={[-0.7, 0.2, 0.7]} castShadow>
            <meshStandardMaterial color="#6b5b3d" />
          </Box>
          <Box args={[0.05, 0.4, 0.05]} position={[0.7, 0.2, 0.7]} castShadow>
            <meshStandardMaterial color="#6b5b3d" />
          </Box>
        </group>
      ))}
      
      {/* Magazine racks or decorative elements */}
      {[-14, 14].map((x) => (
        <group key={`rack-${x}`} position={[x, 0, 0]}>
          <Box args={[0.3, 1.2, 0.8]} position={[0, 0.6, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color="#5a5a5a" 
              roughness={0.7}
              metalness={0.2}
            />
          </Box>
          {/* Magazines/papers */}
          {[0, 0.2, 0.4].map((offset, i) => (
            <Box key={`mag-${i}`} args={[0.25, 0.3, 0.05]} position={[0, 0.3 + offset, 0.1]} castShadow>
              <meshStandardMaterial 
                color={['#ff4444', '#4444ff', '#44ff44'][i]} 
                roughness={0.9}
              />
            </Box>
          ))}
        </group>
      ))}
      
      {/* Rugs/Carpets */}
      {/* Large central rug */}
      <Plane args={[12, 8]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -5]} receiveShadow>
        <meshStandardMaterial 
          color="#8b6f47" 
          roughness={0.9}
          metalness={0.0}
        />
      </Plane>
      {/* Rug border/pattern */}
      <Plane args={[11.5, 7.5]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, -5]} receiveShadow>
        <meshStandardMaterial 
          color="#6b5433" 
          roughness={0.9}
          metalness={0.0}
        />
      </Plane>
      
      {/* Smaller rugs near seating areas */}
      {[-7, 7].map((x) => (
        <Plane key={`rug-${x}`} args={[4, 3]} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -5]} receiveShadow>
          <meshStandardMaterial 
            color="#7a6a4a" 
            roughness={0.9}
            metalness={0.0}
          />
        </Plane>
      ))}
      
      {/* Rug near reception */}
      <Plane args={[10, 4]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 10]} receiveShadow>
        <meshStandardMaterial 
          color="#9b7f57" 
          roughness={0.9}
          metalness={0.0}
        />
      </Plane>
      
      {/* Chairs around coffee tables */}
      {[-7, 7].map((x) => (
        <group key={`chair-group-${x}`} position={[x, 0, -5]}>
          {/* Chair 1 - left side */}
          <group position={[-1.2, 0, 0]}>
            {/* Seat */}
            <Box args={[0.6, 0.1, 0.6]} position={[0, 0.4, 0]} castShadow receiveShadow>
              <meshStandardMaterial color="#4a4a4a" roughness={0.7} metalness={0.1} />
            </Box>
            {/* Backrest */}
            <Box args={[0.6, 0.8, 0.05]} position={[0, 0.8, -0.275]} castShadow>
              <meshStandardMaterial color="#3a3a3a" roughness={0.7} metalness={0.1} />
            </Box>
            {/* Legs */}
            {[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([px, pz], i) => (
              <Box key={`leg-${i}`} args={[0.05, 0.4, 0.05]} position={[px, 0.2, pz]} castShadow>
                <meshStandardMaterial color="#2a2a2a" />
              </Box>
            ))}
          </group>
          {/* Chair 2 - right side */}
          <group position={[1.2, 0, 0]}>
            {/* Seat */}
            <Box args={[0.6, 0.1, 0.6]} position={[0, 0.4, 0]} castShadow receiveShadow>
              <meshStandardMaterial color="#4a4a4a" roughness={0.7} metalness={0.1} />
            </Box>
            {/* Backrest */}
            <Box args={[0.6, 0.8, 0.05]} position={[0, 0.8, -0.275]} castShadow>
              <meshStandardMaterial color="#3a3a3a" roughness={0.7} metalness={0.1} />
            </Box>
            {/* Legs */}
            {[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([px, pz], i) => (
              <Box key={`leg-${i}`} args={[0.05, 0.4, 0.05]} position={[px, 0.2, pz]} castShadow>
                <meshStandardMaterial color="#2a2a2a" />
              </Box>
            ))}
          </group>
        </group>
      ))}
      
      {/* Side tables/end tables */}
      {[-10, 10].map((x) => (
        <group key={`side-table-${x}`} position={[x, 0, 2]}>
          <Box args={[0.8, 0.05, 0.8]} position={[0, 0.5, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#6b5b4d" roughness={0.6} metalness={0.1} />
          </Box>
          <Box args={[0.05, 0.5, 0.05]} position={[0, 0.25, 0]} castShadow>
            <meshStandardMaterial color="#5b4b3d" />
          </Box>
          {/* Decorative item on table */}
          <Sphere args={[0.15, 8, 8]} position={[0, 0.6, 0]} castShadow>
            <meshStandardMaterial color="#8b7355" roughness={0.4} metalness={0.2} />
          </Sphere>
        </group>
      ))}
      
      {/* Additional lounge chairs */}
      {[-4, 4].map((x) => (
        <group key={`lounge-chair-${x}`} position={[x, 0, -12]}>
          {/* Seat base */}
          <Box args={[1.2, 0.3, 1.0]} position={[0, 0.15, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#5a4a3a" roughness={0.8} metalness={0.0} />
          </Box>
          {/* Backrest */}
          <Box args={[1.2, 1.0, 0.1]} position={[0, 0.8, -0.45]} rotation={[-0.2, 0, 0]} castShadow>
            <meshStandardMaterial color="#4a3a2a" roughness={0.8} metalness={0.0} />
          </Box>
          {/* Armrests */}
          <Box args={[0.1, 0.4, 0.8]} position={[-0.55, 0.4, 0]} castShadow>
            <meshStandardMaterial color="#5a4a3a" />
          </Box>
          <Box args={[0.1, 0.4, 0.8]} position={[0.55, 0.4, 0]} castShadow>
            <meshStandardMaterial color="#5a4a3a" />
          </Box>
        </group>
      ))}
      
      {/* Wall-mounted decorative elements */}
      {[-15, 15].map((x) => (
        <group key={`wall-art-${x}`} position={[x, 5, -29.7]}>
          {/* Picture frame */}
          <Box args={[2, 1.5, 0.1]} position={[0, 0, 0]} castShadow>
            <meshStandardMaterial color="#8b7355" roughness={0.5} metalness={0.2} />
          </Box>
          {/* Picture */}
          <Box args={[1.8, 1.3, 0.05]} position={[0, 0, 0.03]}>
            <meshStandardMaterial 
              color={['#4a6b8a', '#8a6b4a', '#6b8a4a'][Math.abs(x) % 3]} 
              roughness={0.7}
            />
          </Box>
        </group>
      ))}
      
      {/* Floor lamps */}
      {[-11, 11].map((x) => (
        <group key={`lamp-${x}`} position={[x, 0, 5]}>
          {/* Lamp base */}
          <Cylinder args={[0.15, 0.15, 0.3, 16]} position={[0, 0.15, 0]} castShadow>
            <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.3} />
          </Cylinder>
          {/* Lamp pole */}
          <Cylinder args={[0.03, 0.03, 1.5, 8]} position={[0, 1.0, 0]} castShadow>
            <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
          </Cylinder>
          {/* Lamp shade */}
          <Cylinder args={[0.4, 0.3, 0.3, 16]} position={[0, 1.75, 0]} castShadow>
            <meshStandardMaterial 
              color="#f5f5f5" 
              emissive="#fff8e1"
              emissiveIntensity={0.3}
              roughness={0.8}
            />
          </Cylinder>
          <pointLight position={[0, 1.75, 0]} intensity={0.5} color="#fff8e1" />
        </group>
      ))}
      
      {/* Contact shadows for better grounding */}
      <ContactShadows 
        position={[0, 0.01, 0]} 
        opacity={0.3} 
        scale={100} 
        blur={2} 
        far={10}
      />
      
      <Player />
      <PointerLockControls />
    </>
  )
}

// Keep rest of App component exactly as you have it
// Update your App component to remove all UI text:

function App() {
  const [predictions, setPredictions] = useState([])
  const [urlInput, setUrlInput] = useState('')
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPredictions()
    
    // Don't auto-generate new predictions - just cycle through existing ones
    // Predictions are based on yesterday's articles and should be manually populated
    // Refresh predictions every 60 seconds to show any new ones that were added
    const interval = setInterval(async () => {
      await fetchPredictions()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcut for URL input - press 'u' to open, 'x' to close
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if not typing in an input field (except when closing)
      const isInputFocused = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      if (e.key.toLowerCase() === 'u' && !isInputFocused && !showUrlInput) {
        // Exit pointer lock when opening menu
        if (document.pointerLockElement) {
          document.exitPointerLock()
        }
        setShowUrlInput(true)
        // Focus the input when opening
        setTimeout(() => {
          const input = document.querySelector('.url-input-field')
          if (input) {
            input.focus()
            input.select() // Select any existing text
          }
        }, 100)
      }
      // Close on 'x' or 'X' (only when menu is open)
      if ((e.key.toLowerCase() === 'x') && showUrlInput && !isInputFocused) {
        setShowUrlInput(false)
        setUrlError('')
        setUrlInput('')
        // Re-enter pointer lock when closing menu - click on canvas
        setTimeout(() => {
          const canvas = document.querySelector('canvas')
          if (canvas) {
            canvas.click() // This will trigger pointer lock via PointerLockControls
          }
        }, 100)
      }
      // Also close on Escape
      if (e.key === 'Escape' && showUrlInput) {
        setShowUrlInput(false)
        setUrlError('')
        setUrlInput('')
        // Re-enter pointer lock when closing menu - click on canvas
        setTimeout(() => {
          const canvas = document.querySelector('canvas')
          if (canvas) {
            canvas.click() // This will trigger pointer lock via PointerLockControls
          }
        }, 100)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showUrlInput])

  const fetchPredictions = async () => {
    try {
      const response = await axios.get(getApiUrl('api/predictions'))
      console.log('Predictions fetched:', response.data.length)
      // Log first prediction to verify image fields
      if (response.data.length > 0) {
        console.log('First prediction sample:', {
          headline: response.data[0].headline,
          hasImageUrl: !!response.data[0].stockImageUrl,
          imageUrl: response.data[0].stockImageUrl,
          hasDescription: !!response.data[0].stockPhotoDescription
        })
      }
      
      // Sort by created_at descending to show newest first, but cycle through all
      const sorted = response.data.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0)
        const dateB = new Date(b.created_at || b.createdAt || 0)
        return dateB - dateA
      })
      
      setPredictions(sorted)
      setIsLoading(false)
      
      // If we have very few predictions, populate with yesterday's articles
      if (response.data.length < 10) {
        console.log(`Only ${response.data.length} predictions found. Populating with yesterday's articles...`)
        try {
          await axios.post(getApiUrl('api/populate/yesterday'))
          // Refresh after population
          setTimeout(() => fetchPredictions(), 2000)
        } catch (error) {
          console.error('Error populating yesterday articles:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching predictions:', error)
      setIsLoading(false)
    }
  }

  const checkForNewNews = async () => {
    try {
        const mundaneResponse = await axios.get(getApiUrl('api/mundane'))
        const { elements, isNew } = mundaneResponse.data
        
        if (isNew) {
            console.log('New news detected! Generating prediction...')
            await generateNewPrediction(elements)
        } else {
            // Only generate if news has actually changed
            console.log('No new news detected, skipping prediction generation')
        }
    } catch (error) {
        console.error('Error checking for new news:', error)
    }
  }

  const generateNewPrediction = async (elements) => {
    try {
        if (!elements) {
            const mundaneResponse = await axios.get(getApiUrl('api/mundane'))
            // Handle both new format {elements, isNew} and old format (array)
            elements = mundaneResponse.data.elements || mundaneResponse.data
        }
        
        if (!elements || elements.length === 0) {
            console.log('No elements available for prediction');
            return;
        }
        
        console.log('Got mundane elements:', elements);
        
        // Try to find an unused headline - shuffle and try each one
        const shuffled = [...elements].sort(() => 0.5 - Math.random());
        
        for (const element of shuffled) {
            try {
                const selectedElement = [element];
                
                console.log('Attempting prediction for:', element.text);
                
                const predictionResponse = await axios.post(getApiUrl('api/predict'), {
                    elements: selectedElement
                })
                
                console.log('✅ Generated NEW prediction:', predictionResponse.data.headline);
                
                // Refresh predictions from database (PostgreSQL is source of truth)
                await fetchPredictions();
                return; // Success, exit
            } catch (error) {
                // If this headline was already used, try the next one
                if (error.response?.status === 400 && error.response?.data?.error?.includes('already')) {
                    console.log('⚠️  Headline already used, trying next...');
                    continue;
                } else {
                    // Some other error, log and break
                    console.error('Error generating prediction:', error);
                    break;
                }
            }
        }
        
        console.log('⚠️  All available headlines have been used');
    } catch (error) {
        console.error('Error generating prediction:', error)
    }
}

  const handleUrlSubmit = async (e) => {
    e.preventDefault()
    if (!urlInput.trim()) {
      setUrlError('Please enter a URL')
      return
    }
    
    setIsSubmittingUrl(true)
    setUrlError('')
    
    try {
      const response = await axios.post(getApiUrl('api/predict/from-url'), {
        url: urlInput.trim()
      })
      
      // Refresh predictions from database (PostgreSQL is source of truth)
      await fetchPredictions()
      
      // Clear input and hide form
      setUrlInput('')
      setShowUrlInput(false)
      
      // Re-enter pointer lock after successful submission - click on canvas
      setTimeout(() => {
        const canvas = document.querySelector('canvas')
        if (canvas) {
          canvas.click() // This will trigger pointer lock via PointerLockControls
        }
      }, 100)
      
      console.log('✅ Prediction generated from URL and saved to database:', response.data.headline)
    } catch (error) {
      console.error('Error generating prediction from URL:', error)
      setUrlError(
        error.response?.data?.error || 
        'Failed to generate prediction. Please check the URL and try again.'
      )
    } finally {
      setIsSubmittingUrl(false)
    }
  }

  // Audio element for background music
  const audioRef = useRef(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3 // Set volume to 30%
      audioRef.current.loop = true
      // Try to play, but handle autoplay restrictions
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Audio autoplay prevented:', error)
          // Autoplay might be blocked, user will need to interact first
        })
      }
    }
  }, [])

  return (
    <div className="app">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/news-tomorrow/muzak.mp3"
        preload="auto"
        loop
      />
      
      {/* URL Input UI */}
      {showUrlInput && (
        <div className="url-input-overlay">
          <div className="url-input-container">
            <button 
              className="close-button"
              onClick={() => {
                setShowUrlInput(false)
                setUrlError('')
                setUrlInput('')
                // Re-enter pointer lock when closing menu - click on canvas
                setTimeout(() => {
                  const canvas = document.querySelector('canvas')
                  if (canvas) {
                    canvas.click() // This will trigger pointer lock via PointerLockControls
                  }
                }, 100)
              }}
              title="Press X to close"
            >
              ×
            </button>
            <h2>Generate Prediction from Article URL</h2>
            <p className="url-input-description">
              Paste a news article URL to generate a tragic prediction headline
            </p>
            <form onSubmit={handleUrlSubmit}>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  setUrlError('')
                }}
                placeholder="https://example.com/article"
                className="url-input-field"
                disabled={isSubmittingUrl}
              />
              {urlError && (
                <div className="url-error">{urlError}</div>
              )}
              <button 
                type="submit" 
                className="url-submit-button"
                disabled={isSubmittingUrl || !urlInput.trim()}
              >
                {isSubmittingUrl ? 'Generating...' : 'Generate Prediction'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <Canvas
        camera={{ 
          fov: 75, 
          position: [0, 1.7, 15]
        }}
        shadows
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        style={{ background: '#000000' }}
        onCreated={({ scene, gl }) => {
          scene.background = new THREE.Color('#000000')
          gl.setClearColor('#000000', 1)
        }}
      >
        {/* Fog removed for indoor environment */}
        
        {/* Environment for realistic reflections - using softer preset */}
        <Environment preset="apartment" />
        
        <Lobby predictions={predictions} />
        
        {/* Post-processing effects - reduced for clarity */}
        <EffectComposer>
          <Bloom 
            intensity={0.2} 
            luminanceThreshold={0.95} 
            luminanceSmoothing={0.95}
            height={300}
          />
          <ToneMapping />
          <Vignette eskil={false} offset={0.1} darkness={0.3} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

export default App
