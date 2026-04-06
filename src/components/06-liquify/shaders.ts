export const VERT_SHADER = `#version 300 es
in vec2 position;
out vec2 v_uv;
void main() {
  v_uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export const PASSTHROUGH_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_source;
void main() {
  outColor = texture(u_source, v_uv);
}`;

export const FIELD_BLUR_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_source;
uniform vec2 u_resolution;
uniform int u_pointCount;
uniform vec2 u_pointPositions[16];
uniform float u_pointRadii[16];
uniform float u_intensity;
uniform float u_maxRadius;

void main() {
  vec2 pixel = v_uv * u_resolution;
  float wSum = 0.0;
  float rSum = 0.0;

  for (int i = 0; i < 16; i++) {
    if (i >= u_pointCount) break;
    vec2 d = pixel - u_pointPositions[i];
    float d2 = dot(d, d);
    float w = 1.0 / max(d2, 1.0);
    wSum += w;
    rSum += w * u_pointRadii[i];
  }

  float effR = min((rSum / wSum) * u_intensity, u_maxRadius);
  float lod = log2(1.0 + effR);
  outColor = textureLod(u_source, v_uv, lod);
}`;

export const VORTEX_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_source;
uniform vec2 u_resolution;
uniform int u_vortexCount;
uniform vec2 u_vortexCenters[8];
uniform float u_vortexRadii[8];
uniform float u_vortexAngles[8];

void main() {
  vec2 uv = v_uv;

  for (int i = 0; i < 8; i++) {
    if (i >= u_vortexCount) break;
    vec2 pixel = uv * u_resolution;
    vec2 d = pixel - u_vortexCenters[i];
    float dist = length(d);

    if (dist < u_vortexRadii[i]) {
      float t = 1.0 - dist / u_vortexRadii[i];
      float theta = u_vortexAngles[i] * t * t;
      float c = cos(theta);
      float s = sin(theta);
      vec2 rotated = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
      uv = (rotated + u_vortexCenters[i]) / u_resolution;
    }
  }

  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
    outColor = texture(u_source, uv);
  } else {
    outColor = texture(u_source, v_uv);
  }
}`;

export const DITHER_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_source;
uniform float u_seed;
uniform float u_gainK;

float hash(vec2 p, float seed) {
  p += seed;
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float gain(float t, float k) {
  if (t < 0.5) return 0.5 * pow(2.0 * t, k);
  return 1.0 - 0.5 * pow(2.0 * (1.0 - t), k);
}

void main() {
  vec4 color = texture(u_source, v_uv);
  float probability = gain(color.a, u_gainK);
  float noise = hash(gl_FragCoord.xy, u_seed);
  color.a = noise < probability ? 1.0 : 0.0;
  outColor = color;
}`;
