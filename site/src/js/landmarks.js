const THREE = window.THREE;

const landmarkVertexShader = `
  uniform float uTime;
  attribute float aSeed;
  attribute float aKind;
  varying float vKind;
  varying float vAge;

  void main() {
    vec3 pos = position;
    vKind = aKind;

    if (aKind < 0.5) {
      float speed = 0.18 + aSeed * 0.34;
      float fall = fract(aSeed + uTime * speed);
      pos.y -= fall * 31.0;
      pos.x += sin(uTime * 1.7 + aSeed * 24.0) * (0.45 + fall * 1.1);
      pos.z += cos(uTime * 1.2 + aSeed * 19.0) * (0.35 + fall * 0.9);
      vAge = fall;
    } else if (aKind < 1.5) {
      float drift = uTime * (0.025 + aSeed * 0.018);
      pos.x += sin(drift + aSeed * 6.28318) * 5.8;
      pos.z += cos(drift * 1.2 + aSeed * 4.0) * 3.2;
      pos.y += sin(drift * 2.4 + aSeed * 10.0) * 0.9;
      vAge = 0.45 + 0.45 * sin(drift + aSeed * 8.0);
    } else if (aKind < 2.5) {
      float burst = fract(aSeed + uTime * (0.08 + aSeed * 0.08));
      pos.x += (aSeed - 0.5) * burst * 18.0;
      pos.z += sin(aSeed * 18.0) * burst * 7.0;
      pos.y += sin(burst * 3.14159) * 3.6;
      vAge = 1.0 - burst;
    } else if (aKind < 3.5) {
      float lane = floor(aSeed * 5.0);
      float local = fract(aSeed * 17.0);
      float fly = fract(uTime * 0.018 + local);
      pos.x += fly * 116.0;
      pos.y += sin(fly * 6.28318 + lane) * 2.2;
      pos.z += sin(fly * 3.14159 + local * 4.0) * 5.0;
      vAge = 1.0 - smoothstep(0.78, 1.0, fly);
    } else {
      float drift = uTime * (0.014 + aSeed * 0.012);
      pos.x += sin(drift + aSeed * 9.0) * 4.6;
      pos.z += cos(drift * 1.3 + aSeed * 7.0) * 2.2;
      pos.y += sin(drift * 2.1 + aSeed * 12.0) * 0.42;
      vAge = 0.72 + 0.28 * sin(drift * 3.0 + aSeed * 18.0);
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float baseSize = aKind < 0.5 ? 2.8 : (aKind < 1.5 ? 8.5 : (aKind < 2.5 ? 3.8 : (aKind < 3.5 ? 9.5 : 7.4)));
    gl_PointSize = baseSize * (34.0 / -mvPosition.z);
  }
`;

const landmarkFragmentShader = `
  uniform vec3 uWaterColor;
  uniform vec3 uMistColor;
  varying float vKind;
  varying float vAge;

  void main() {
    vec2 uv = gl_PointCoord.xy - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = 1.0 - smoothstep(0.06, 0.5, d);
    float soft = 1.0 - smoothstep(0.22, 0.5, d);
    vec3 color;
    float alpha;

    if (vKind < 0.5) {
      color = mix(uWaterColor, vec3(1.0, 1.0, 0.82), core * 0.55);
      alpha = (0.22 + core * 0.82) * (1.0 - smoothstep(0.72, 1.0, vAge));
    } else if (vKind < 1.5) {
      color = uMistColor;
      alpha = soft * (0.045 + vAge * 0.105);
    } else if (vKind < 2.5) {
      color = mix(uMistColor, uWaterColor, 0.38);
      alpha = soft * (0.08 + vAge * 0.16);
    } else if (vKind < 3.5) {
      float wingLeft = smoothstep(0.09, 0.0, abs(uv.y + uv.x * 0.58)) * smoothstep(0.52, 0.08, abs(uv.x));
      float wingRight = smoothstep(0.09, 0.0, abs(uv.y - uv.x * 0.58)) * smoothstep(0.52, 0.08, abs(uv.x));
      float body = smoothstep(0.09, 0.0, length(vec2(uv.x * 0.75, uv.y * 1.8)));
      float bird = max(max(wingLeft, wingRight), body * 0.85);
      color = mix(vec3(0.95, 1.0, 0.86), uWaterColor, 0.28);
      alpha = bird * 1.25 * vAge;
    } else {
      float flat = smoothstep(0.5, 0.02, abs(uv.y * 3.4)) * smoothstep(0.56, 0.06, abs(uv.x));
      float coreBand = smoothstep(0.34, 0.0, abs(uv.y * 4.8));
      color = mix(vec3(0.78, 1.0, 0.98), uWaterColor, 0.62);
      alpha = max(flat * 0.34, coreBand * 0.26) * vAge;
    }

    gl_FragColor = vec4(color, alpha);
  }
`;

export class QianliLandmarks {
  constructor({ setGeometryAttribute, palette }) {
    this.setGeometryAttribute = setGeometryAttribute;
    this.group = new THREE.Group();
    this.uniforms = {
      uTime: { value: 0 },
      uWaterColor: { value: new THREE.Color('#c7ffff') },
      uMistColor: { value: new THREE.Color(palette.mist) }
    };

    this.group.add(this.createCloudBeltLayer());
    this.group.add(this.createSummitCloudLayer());
    this.group.add(this.createSplashLayer());
    this.group.add(this.createBirdLayer());
  }

  createMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: landmarkVertexShader,
      fragmentShader: landmarkFragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });
  }

  createCloudBeltLayer() {
    const count = 2400;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const kinds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const band = i / count;
      positions[i3] = -62 + band * 112 + (Math.random() - 0.5) * 8;
      positions[i3 + 1] = 11 + Math.sin(band * Math.PI * 4) * 2.8 + Math.random() * 3.5;
      positions[i3 + 2] = -34 + Math.sin(band * Math.PI * 2) * 8 + (Math.random() - 0.5) * 5;
      seeds[i] = Math.random();
      kinds[i] = 1;
    }

    const layer = new THREE.Points(this.createGeometry(positions, seeds, kinds), this.createMaterial());
    layer.name = 'qianli-cloud-belt';
    return layer;
  }

  createSummitCloudLayer() {
    const clusters = [
      { x: -62, y: 36, z: -48, width: 28 },
      { x: -34, y: 41, z: -54, width: 24 },
      { x: -6, y: 38, z: -50, width: 34 },
      { x: 28, y: 40, z: -46, width: 30 },
      { x: 58, y: 43, z: -52, width: 26 },
      { x: 78, y: 37, z: -44, width: 22 }
    ];
    const pointsPerCluster = 520;
    const count = clusters.length * pointsPerCluster;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const kinds = new Float32Array(count);

    let cursor = 0;
    for (let c = 0; c < clusters.length; c += 1) {
      const cloud = clusters[c];
      for (let i = 0; i < pointsPerCluster; i += 1) {
        const i3 = cursor * 3;
        const spread = Math.random() - 0.5;
        const layer = Math.random();
        positions[i3] = cloud.x + spread * cloud.width;
        positions[i3 + 1] = cloud.y + (Math.random() - 0.5) * 1.2 + Math.sin(spread * Math.PI) * 0.7;
        positions[i3 + 2] = cloud.z + (Math.random() - 0.5) * 4.5 + layer * 1.2;
        seeds[cursor] = Math.random();
        kinds[cursor] = 4;
        cursor += 1;
      }
    }

    const layer = new THREE.Points(this.createGeometry(positions, seeds, kinds), this.createMaterial());
    layer.name = 'qianli-summit-clouds';
    return layer;
  }

  createSplashLayer() {
    const count = 1600;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const kinds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      positions[i3] = 34 + (Math.random() - 0.5) * 7.5;
      positions[i3 + 1] = -4 + Math.random() * 2.2;
      positions[i3 + 2] = -20 + (Math.random() - 0.5) * 6;
      seeds[i] = Math.random();
      kinds[i] = 2;
    }

    const layer = new THREE.Points(this.createGeometry(positions, seeds, kinds), this.createMaterial());
    layer.name = 'qianli-waterfall-splash';
    return layer;
  }

  createBirdLayer() {
    const count = 54;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const kinds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const row = Math.floor(i / 7);
      const col = i % 7;
      positions[i3] = -68 - col * 3.1 - row * 4.2;
      positions[i3 + 1] = 27 + row * 1.55 + Math.sin(col) * 1.1;
      positions[i3 + 2] = -38 - row * 1.3;
      seeds[i] = (i + 1) / (count + 3);
      kinds[i] = 3;
    }

    const layer = new THREE.Points(this.createGeometry(positions, seeds, kinds), this.createMaterial());
    layer.name = 'qianli-distant-birds';
    return layer;
  }

  createGeometry(positions, seeds, kinds) {
    const geometry = new THREE.BufferGeometry();
    this.setGeometryAttribute(geometry, 'position', new THREE.BufferAttribute(positions, 3));
    this.setGeometryAttribute(geometry, 'aSeed', new THREE.BufferAttribute(seeds, 1));
    this.setGeometryAttribute(geometry, 'aKind', new THREE.BufferAttribute(kinds, 1));
    geometry.computeBoundingSphere();
    return geometry;
  }

  update(elapsedTime) {
    this.uniforms.uTime.value = elapsedTime;
  }
}
