export const vertexShader = `
  uniform float uTime;
  uniform float uBreath;
  uniform float uMountainHeight;
  uniform float uRiverWidth;
  uniform float uValleyWidth;

  attribute vec3 aRandom;
  attribute float aLine;
  attribute float aKind;

  varying float vKind;
  varying float vHeight;
  varying float vIntensity;
  varying float vRiver;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float riverCenter(float z) {
    return sin(z * 0.052) * 13.0 + sin(z * 0.143) * 5.4 + sin(z * 0.021 + 1.7) * 7.2 - 3.0;
  }

  void main() {
    vec3 pos = position;
    vKind = aKind;
    vRiver = 0.0;

    if (aKind > 1.5) {
      float drift = uTime * (0.12 + aRandom.z * 0.08) + aRandom.x * 6.28318;
      pos.x += sin(drift) * (5.0 + aRandom.y * 8.0);
      pos.z += cos(drift * 0.72) * (6.0 + aRandom.x * 6.0);
      pos.y += sin(drift * 1.5) * 2.0 + uBreath * 2.5;
      vHeight = pos.y;
      vIntensity = 0.18 + aRandom.y * 0.38;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = (0.62 + aRandom.y * 1.15) * (30.0 / -mvPosition.z);
      return;
    }

    float center = riverCenter(pos.z);
    float distToRiver = abs(pos.x - center);
    float height = 0.0;
    float pointSize = 1.0;

    if (distToRiver < uRiverWidth) {
      vKind = 0.0;
      float flow = snoise(vec2(pos.x * 0.38, pos.z * 0.18 - uTime * 0.62));
      height = flow * 1.2 + 0.45 + sin(uTime * 1.2 + pos.z * 0.12) * 0.28;
      pointSize = 2.9 * (1.0 - distToRiver / uRiverWidth) + 0.72;
      vRiver = 1.0 - smoothstep(0.0, uRiverWidth, distToRiver);
      vIntensity = 1.05 + 0.82 * sin(uTime * 3.2 + aRandom.x * 8.0);
    } else if (distToRiver < uValleyWidth) {
      vKind = 1.5;
      height = 0.2;
      pointSize = 0.35;
      vIntensity = 0.22;
    } else {
      vKind = 1.0;
      float mountainDistance = distToRiver - uValleyWidth;
      float ridgeA = abs(snoise(vec2(pos.x * 0.045, pos.z * 0.066)));
      float ridgeB = snoise(vec2(pos.x * 0.115 + 8.0, pos.z * 0.13));
      float ridgeC = abs(snoise(vec2(pos.x * 0.018 - 4.0, pos.z * 0.026 + 2.0)));
      float mask = smoothstep(0.0, 17.0, mountainDistance);

      height = (ridgeA * 23.0 + ridgeB * 7.0 + ridgeC * 20.0) * mask;
      height *= 0.48 + uMountainHeight * 1.38;
      height += sin(aLine * 82.0 + uTime * 0.42) * 0.55;
      height += snoise(vec2(pos.z * 0.035 + uTime * 0.16, pos.x * 0.025)) * 0.72 * mask;
      height = clamp(height, 0.0, 48.0);

      float terrace = sin(aLine * 920.0);
      pointSize = 1.38 + height * 0.092 + step(0.7, terrace) * 0.78;
      vIntensity = 0.88 + step(0.74, terrace) * 0.82 + aRandom.z * 0.32;
    }

    pos.y = height;
    vHeight = height;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = pointSize * (43.0 / -mvPosition.z);
  }
`;

export const fragmentShader = `
  uniform vec3 uRiverColor;
  uniform vec3 uRiverCoreColor;
  uniform vec3 uMountainBaseColor;
  uniform vec3 uMountainMidColor;
  uniform vec3 uMountainTopColor;
  uniform vec3 uMistColor;

  varying float vKind;
  varying float vHeight;
  varying float vIntensity;
  varying float vRiver;

  void main() {
    if (vKind > 1.25 && vKind < 1.75) discard;

    vec2 uv = gl_PointCoord.xy - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.18, 0.5, d);
    vec3 color;

    if (vKind < 0.5) {
      color = mix(uRiverColor, uRiverCoreColor, clamp(vRiver, 0.0, 1.0));
      color += vec3(0.28, 0.24, 0.04) * vIntensity;
      alpha *= 1.05 + vRiver * 0.9;
    } else if (vKind > 1.75) {
      color = uMistColor;
      alpha *= 0.22 + vIntensity * 0.22;
    } else {
      float h = clamp(vHeight / 40.0, 0.0, 1.0);
      color = mix(uMountainBaseColor, uMountainMidColor, smoothstep(0.05, 0.62, h));
      color = mix(color, uMountainTopColor, smoothstep(0.58, 1.0, h));
      color *= 1.24 + vIntensity * 1.05;
      color += uMountainTopColor * pow(h, 2.35) * 0.68;
      alpha *= 1.08 + h * 0.94;
    }

    gl_FragColor = vec4(color, alpha);
  }
`;
