import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import * as THREE from 'three';

const App = () => {
  const canvasContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const sphereRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6e2d6);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

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
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute( 
          i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
          + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float lightIntensity = dot(vNormal, lightDir);
        
        vec3 pos = vPosition;
        float angle = time * 0.1;
        mat3 rotY = mat3(cos(angle), 0.0, sin(angle), 0.0, 1.0, 0.0, -sin(angle), 0.0, cos(angle));
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

        float viewDot = dot(normalize(vNormal), vec3(0,0,1));
        if (viewDot < 0.3 && viewDot > 0.0) {
          if (mod(gl_FragCoord.x + gl_FragCoord.y, 4.0) < 2.0) {
            finalColor = colorInk;
          }
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const uniforms = {
      time: { value: 0 },
      colorPaper: { value: new THREE.Color('#E6E2D6') },
      colorRust: { value: new THREE.Color('#CC5A38') },
      colorForest: { value: new THREE.Color('#2A5A43') },
      colorInk: { value: new THREE.Color('#1A1A1A') },
    };

    const geometry = new THREE.IcosahedronGeometry(3.5, 30);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
    };

    document.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      material.uniforms.time.value += 0.005;
      sphere.rotation.y += 0.002;
      sphere.rotation.y += (mouseX - sphere.rotation.y) * 0.05;
      sphere.rotation.x += (mouseY - sphere.rotation.x) * 0.05;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Syne:wght@400;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');

      :root {
        --paper: #E6E2D6; 
        --ink: #121212; 
        --rust: #C85228; 
        --terra-green: #2A5A42; 
        --sun-gold: #D4A044; 
        --pad-sm: 12px;
        --pad-md: 24px;
        --pad-lg: 48px;
        --pad-xl: 96px;
        --border-width: 1.5px;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }

      body {
        background-color: var(--paper);
        color: var(--ink);
        font-family: 'Syne', sans-serif;
        overflow-x: hidden;
        width: 100vw;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      #canvas-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        opacity: 0.9;
        pointer-events: none; 
      }

      .ui-layer {
        position: relative;
        z-index: 10;
        width: 100%;
        min-height: 100vh;
        display: grid;
        grid-template-rows: auto 1fr auto;
        pointer-events: none; 
      }

      button, a, .interactive {
        pointer-events: auto;
        cursor: pointer;
      }

      header {
        padding: var(--pad-md);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.75rem;
        font-family: 'Space Mono', monospace;
        border-bottom: 0px solid transparent; 
      }

      .brand-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        background-color: var(--rust);
        border-radius: 50%;
        animation: pulse 2s infinite;
      }

      main {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        position: relative;
        padding: var(--pad-md);
      }

      .hero-title-wrapper {
        position: relative;
        text-align: center;
        mix-blend-mode: multiply;
      }

      h1 {
        font-family: 'Abril Fatface', serif;
        font-size: clamp(6rem, 18vw, 22rem);
        line-height: 0.8;
        color: var(--ink);
        position: relative;
        z-index: 2;
        letter-spacing: -0.04em;
        text-align: center;
      }

      .title-line {
        height: 2px;
        background: var(--ink);
        position: absolute;
        top: 50%;
        width: 100vw;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
      }

      .subtitle-pill-cluster {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: -2vw;
        position: relative;
        z-index: 3;
        flex-wrap: wrap;
      }

      .pill {
        border: var(--border-width) solid var(--ink);
        padding: 4px 16px;
        border-radius: 50px;
        font-family: 'Syne', sans-serif;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.9rem;
        background: var(--paper);
        color: var(--ink);
        transition: all 0.3s ease;
      }
      
      .pill:hover {
        background: var(--ink);
        color: var(--paper);
      }

      .pill.accent {
        border-color: var(--rust);
        color: var(--rust);
      }
      
      .pill.accent:hover {
        background: var(--rust);
        color: var(--paper);
      }

      .data-block {
        position: absolute;
        font-family: 'Space Mono', monospace;
        font-size: 0.6rem;
        line-height: 1.4;
        color: var(--ink);
        max-width: 150px;
      }

      .data-tl { top: 20%; left: 5%; text-align: left; }
      .data-tr { top: 25%; right: 5%; text-align: right; }

      .star-graphic {
        position: absolute;
        width: 40px;
        height: 40px;
        top: -20px;
        right: -40px;
      }
      .star-graphic svg {
        fill: none;
        stroke: var(--ink);
        stroke-width: 1.5;
      }

      .grunge-map {
        width: 100%;
        height: 25vh;
        background-color: var(--rust);
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
        padding: var(--pad-md);
        border-top: var(--border-width) solid var(--ink);
        margin-top: auto;
      }

      .map-texture {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--terra-green);
        clip-path: polygon(
          0% 0%, 15% 10%, 25% 5%, 40% 25%, 
          35% 50%, 50% 60%, 60% 45%, 75% 55%, 
          85% 30%, 100% 40%, 100% 100%, 0% 100%
        );
        opacity: 0.9;
      }

      .map-texture-2 {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--ink);
        opacity: 0.1;
        filter: url('#noise');
        mix-blend-mode: overlay;
      }

      .footer-content {
        position: relative;
        z-index: 5;
        display: flex;
        justify-content: space-between;
        width: 100%;
        color: var(--paper);
        font-family: 'Space Mono', monospace;
        text-transform: uppercase;
        font-size: 0.8rem;
      }

      .coordinate-circle {
        width: 60px;
        height: 60px;
        border: 1px solid var(--paper);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(-15deg);
      }
      
      .line-graphic {
        width: 100%;
        height: 1px;
        background: currentColor;
        transform: rotate(45deg);
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      @media (max-width: 768px) {
        h1 { font-size: 18vw; }
        .title-line { display: none; }
        .data-block { display: none; }
        .grunge-map { height: 15vh; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Router basename="/">
      <svg style={{ display: 'none' }}>
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
          ></feTurbulence>
        </filter>
      </svg>

      <div id="canvas-container" ref={canvasContainerRef}></div>

      <div className="ui-layer">
        <header>
          <div className="brand-pill">
            <div className="status-dot"></div>
            <span>UAC // ARES DIVISION</span>
          </div>

          <div className="brand-pill" style={{ gap: '20px' }}>
            <span className="interactive hover-underline">Manifest</span>
            <span className="interactive hover-underline">Trajectory</span>
            <span className="interactive hover-underline">Colonize</span>
          </div>
        </header>

        <main>
          <div className="data-block data-tl">
            ATMOSPHERE: 95% CO2
            <br />
            GRAVITY: 3.721 M/S²
            <br />
            TEMP: -63°C
            <br />
            <br />
            [UNINHABITABLE]
          </div>

          <div className="hero-title-wrapper">
            <h1>MARS</h1>
            <div className="star-graphic">
              <svg viewBox="0 0 40 40">
                <path d="M20 0 L23 17 L40 20 L23 23 L20 40 L17 23 L0 20 L17 17 Z"></path>
              </svg>
            </div>
          </div>

          <div className="subtitle-pill-cluster">
            <a href="#" className="pill">
              Mission 2034
            </a>
            <a href="#" className="pill accent">
              Terraform Protocol
            </a>
            <a href="#" className="pill">
              Status: Active
            </a>
          </div>

          <div className="data-block data-tr">
            DISTANCE: 225M KM
            <br />
            TRANSIT: 7 MONTHS
            <br />
            CREW CAPACITY: 100
            <br />
            <br />
            [PRE-ORDER TICKET]
          </div>
        </main>

        <div className="grunge-map">
          <div className="map-texture"></div>
          <div className="map-texture-2"></div>

          <div className="footer-content">
            <div>
              SECTOR 7<br />
              VALLES MARINERIS
              <br />
              BASE ALPHA
            </div>
            <div className="coordinate-circle">
              <div className="line-graphic"></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              DO NOT PANIC
              <br />
              EST. ARRIVAL
              <br />
              T-MINUS 12Y
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;
