import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';

type GlobeMeshHandle = {
  rotation: {
    x: number;
    y: number;
  };
};

type GlobeMaterialHandle = {
  uniforms: {
    time: {
      value: number;
    };
  };
};

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  float random(vec3 scale, float seed) {
    return fract(sin(dot(gl_Position.xyz + seed, scale)) * 43758.5453 + seed);
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 colorPaper;
  uniform vec3 colorRust;
  uniform vec3 colorForest;
  uniform vec3 colorInk;
  uniform float time;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float lightIntensity = dot(vNormal, lightDir);

    vec3 pos = vPosition;
    float angle = time * 0.1;
    mat3 rotY = mat3(
      cos(angle), 0.0, sin(angle),
      0.0, 1.0, 0.0,
      -sin(angle), 0.0, cos(angle)
    );
    vec3 noisePos = rotY * pos * 2.5;
    float noiseVal = snoise(noisePos);

    vec3 finalColor = colorPaper;

    if (noiseVal > 0.1) {
      finalColor = colorRust;

      if (lightIntensity < 0.2) {
        finalColor = colorForest;
      }
    } else {
      if (lightIntensity < -0.2) {
        finalColor = mix(colorPaper, colorInk, 0.1);
      }
    }

    float viewDot = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
    if (viewDot < 0.3 && viewDot > 0.0) {
      if (mod(gl_FragCoord.x + gl_FragCoord.y, 4.0) < 2.0) {
        finalColor = colorInk;
      }
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function GlobeMesh() {
  const meshRef = useRef<GlobeMeshHandle | null>(null);
  const materialRef = useRef<GlobeMaterialHandle | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX - window.innerWidth / 2) * 0.001;
      mouseRef.current.y = (event.clientY - window.innerHeight / 2) * 0.001;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      colorPaper: { value: [0.90196, 0.88627, 0.83921] },
      colorRust: { value: [0.8, 0.35294, 0.2196] },
      colorForest: { value: [0.1647, 0.35294, 0.26274] },
      colorInk: { value: [0.10196, 0.10196, 0.10196] },
    }),
    [],
  );

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) {
      return;
    }

    materialRef.current.uniforms.time.value += 0.005;
    meshRef.current.rotation.y += 0.002;
    meshRef.current.rotation.y += (mouseRef.current.x - meshRef.current.rotation.y) * 0.05;
    meshRef.current.rotation.x += (mouseRef.current.y - meshRef.current.rotation.x) * 0.05;
  });

  return (
    <mesh ref={meshRef as never}>
      <icosahedronGeometry args={[3.5, 30]} />
      <shaderMaterial
        ref={materialRef as never}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
      />
    </mesh>
  );
}

export function HeroGlobe() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 12], fov: 35, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <GlobeMesh />
    </Canvas>
  );
}
