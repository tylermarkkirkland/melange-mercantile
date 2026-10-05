// GLSL shared by the light shafts and the dust, so dust only sparkles
// where it actually sits inside a beam.
const SUN_RAYS = /* glsl */ `
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uSun;

  float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  float vnoise1(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash11(i), hash11(i + 1.0), f);
  }

  // Light enters from a high opening, off-screen to the upper left,
  // and falls toward the mark. uv is 0..1 with y up.
  float sunRays(vec2 uv, out float dist) {
    float aspect = uRes.x / uRes.y;
    vec2 src = vec2(-0.2 * aspect, 1.34);
    vec2 d = vec2(uv.x * aspect, uv.y) - src;
    dist = length(d);
    vec2 toMark = vec2(0.5 * aspect, 0.6) - src;
    float a = atan(d.y, d.x) - atan(toMark.y, toMark.x);

    float t = uTime;
    float broad = smoothstep(0.42, 0.88, vnoise1(a * 9.0 + 3.0 + t * 0.025));
    broad += 0.35 * smoothstep(0.5, 0.9, vnoise1(a * 23.0 - 7.0 + t * 0.04));
    float fine = vnoise1(a * 52.0 - t * 0.05) * 0.25 + 0.75;
    float window = smoothstep(0.42, 0.02, abs(a + 0.05));
    float reach = smoothstep(2.5, 0.3, dist) * smoothstep(0.0, 0.4, dist);
    float air = 0.78 + 0.22 * vnoise1(dist * 8.0 - t * 0.35 + a * 28.0);
    return broad * fine * window * reach * air;
  }
`;

export const raysVertex = /* glsl */ `
  uniform float uDepth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, uDepth, 1.0);
  }
`;

export const raysFragment = /* glsl */ `
  ${SUN_RAYS}
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    float dist;
    float r = sunRays(vUv, dist);
    vec3 warmNear = vec3(1.0, 0.86, 0.66);
    vec3 warmFar = vec3(0.93, 0.52, 0.2);
    vec3 col = mix(warmNear, warmFar, smoothstep(0.4, 1.8, dist));
    float glow = exp(-dist * 2.4) * 0.22;
    vec3 light = col * (r * 0.3 + glow) * uSun * uGain;
    gl_FragColor = vec4(light, 1.0);
  }
`;

export const dustVertex = /* glsl */ `
  ${SUN_RAYS}
  attribute vec4 aSeed;
  uniform vec3 uBox;
  uniform vec3 uFall;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uAspect;
  uniform float uTanHalf;
  uniform float uCamZ;
  uniform float uPixelRatio;
  uniform float uRayVis;
  uniform float uAmbient;
  varying float vLight;
  varying float vTone;
  varying float vNear;

  void main() {
    vec3 p = position;

    // settle at an angle, each grain at its own pace, with a little flutter
    p += uFall * uTime * mix(0.05, 0.15, aSeed.x);
    p.x += sin(uTime * (0.35 + aSeed.y * 0.6) + aSeed.z * 6.283) * 0.08;
    p.y += cos(uTime * (0.3 + aSeed.w * 0.5) + aSeed.y * 6.283) * 0.05;
    p = mod(p + uBox, uBox * 2.0) - uBox;

    // the cursor parts the dust, with a soft swirl around its edge
    float depth = uCamZ - p.z;
    vec2 m = uMouse * vec2(uAspect, 1.0) * uTanHalf * depth;
    vec2 dl = p.xy - m;
    float dd = length(dl) + 1e-4;
    float R = 0.5 + depth * 0.05;
    float f = smoothstep(R, 0.0, dd) * uMouseStrength;
    p.xy += (dl / dd) * f * R * 0.75;
    p.xy += vec2(-dl.y, dl.x) * f * 0.45;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    vec2 suv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
    float rd;
    float ray = sunRays(suv, rd);
    float twinkle = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed.w * 2.0) + aSeed.x * 40.0);
    // uRayVis fades the beams on scroll; uAmbient keeps a quiet glitter once they're gone
    vLight = (0.05 + uAmbient * twinkle + ray * uRayVis * 5.0 * (0.3 + 0.7 * twinkle)) * uSun;
    // 0 = deep orange, 1 = ember, 2 = pale
    vTone = aSeed.z < 0.4 ? 2.0 : (aSeed.z < 0.66 ? 1.0 : 0.0);
    vNear = smoothstep(6.5, 2.6, -mv.z);

    float size = mix(0.7, 2.4, aSeed.y * aSeed.y) * (vTone < 0.5 ? 1.25 : 1.0);
    gl_PointSize = size * uPixelRatio * (46.0 / -mv.z) * mix(1.0, 3.2, vNear);
  }
`;

export const dustFragment = /* glsl */ `
  varying float vLight;
  varying float vTone;
  varying float vNear;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    core = pow(core, mix(2.4, 1.1, vNear));
    float a = core * vLight * mix(1.0, 0.22, vNear);
    vec3 deep = vec3(0.8, 0.22, 0.03);
    vec3 ember = vec3(0.91, 0.51, 0.17);
    vec3 pale = vec3(1.0, 0.93, 0.84);
    vec3 col = vTone > 1.5 ? pale : (vTone > 0.5 ? ember : deep);
    // deep grains carry a touch more weight so they read as rich, not dim
    a *= vTone < 0.5 ? 1.35 : 1.0;
    gl_FragColor = vec4(col * a, a);
  }
`;

// The planet footage, drawn inside the scene so dust can drift in front of it.
export const videoVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9998, 1.0);
  }
`;

export const videoFragment = /* glsl */ `
  uniform sampler2D uVideo;
  uniform vec2 uRes;
  uniform float uVideoAspect;
  uniform float uRise;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float screenAspect = uRes.x / uRes.y;
    vec2 scale = screenAspect > uVideoAspect
      ? vec2(1.0, uVideoAspect / screenAspect)
      : vec2(screenAspect / uVideoAspect, 1.0);
    // rises from below and settles, easing in from a slight push-in
    float zoom = mix(1.18, 1.0, uRise);
    vec2 uv = (vUv - 0.5) * scale / zoom + 0.5;
    uv.y += mix(0.66, 0.17, uRise);
    vec3 col = texture2D(uVideo, uv).rgb;
    float inside = step(0.0, uv.y) * step(uv.y, 1.0);
    // pull exposure down before tone mapping so the highlights keep their
    // colour, then restore some saturation: a deep rust planet, not a pale one
    col *= 0.52;
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(mix(vec3(luma), col, 1.5), 0.0) * vec3(1.04, 0.97, 0.9);
    gl_FragColor = vec4(col * inside * uOpacity, 1.0);
  }
`;
