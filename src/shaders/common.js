/**
 * Shared GLSL chunks.
 *
 * Grass, flowers and tree canopies all bend to the *same* wind field, which is
 * what sells the meadow as one living thing rather than a set of independently
 * wiggling props. Any change to the wind model belongs here, not in a consumer.
 */

export const glslNoise = /* glsl */ `
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  float hash1(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash1(i);
    float b = hash1(i + vec2(1.0, 0.0));
    float c = hash1(i + vec2(0.0, 1.0));
    float d = hash1(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm2(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise2(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`

/**
 * Wind displacement.
 *
 * `stiffness` shapes how bend distributes along the object: values above 1 keep
 * the base planted and throw the motion into the tip, which is what real grass
 * does. Gusts travel as a wave across the field so you see wind *arrive*.
 */
export const glslWind = /* glsl */ `
  uniform float uTime;
  uniform vec2 uWindDir;
  uniform float uWindStrength;

  // Rolling gust envelope travelling along the wind direction.
  float gustField(vec2 worldXZ) {
    float travel = dot(worldXZ, uWindDir) * 0.035 - uTime * 0.55;
    float broad = sin(travel) * 0.5 + 0.5;
    float detail = fbm2(worldXZ * 0.04 + uWindDir * uTime * 0.12);
    return mix(0.35, 1.0, broad) * mix(0.6, 1.15, detail);
  }

  // Horizontal offset for a point at heightFrac (0 = root, 1 = tip).
  vec2 windOffset(vec2 worldXZ, float heightFrac, float phase, float stiffness) {
    float gust = gustField(worldXZ);

    float flutter = sin(uTime * 2.6 + phase * 6.28318) * 0.18
                  + sin(uTime * 4.7 + phase * 12.0) * 0.07;

    float bend = pow(heightFrac, stiffness) * uWindStrength * (gust + flutter);
    return uWindDir * bend;
  }
`

/**
 * Painterly lighting.
 *
 * Not physically based on purpose. Ghibli foliage reads as flat colour with a
 * hot translucent rim where the sun is behind it, so the backlight term is
 * driven by how much the view direction aligns with the light rather than by
 * any transmission model.
 */
export const glslPainterlyLight = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;
  uniform vec3 uBounceColor;

  vec3 painterlyLight(vec3 normal, vec3 viewDir, vec3 albedo, float translucency) {
    float ndl = dot(normal, uSunDir);

    // Two-step terminator instead of a smooth ramp — keeps the poster-like
    // separation between lit and shadowed foliage.
    float lit = smoothstep(-0.05, 0.25, ndl);
    lit = mix(lit, smoothstep(0.25, 0.6, ndl), 0.45);

    // Sky fills the shadows from above; warm bounce fills from below.
    float skyFill = normal.y * 0.5 + 0.5;
    vec3 ambient = mix(uBounceColor, uSkyColor, skyFill) * 0.55;

    // Backlight: strongest when looking toward the sun through the surface.
    float back = pow(clamp(dot(viewDir, -uSunDir), 0.0, 1.0), 4.0);
    back *= (1.0 - lit) * translucency;

    // Rim: a thin bright edge on silhouettes. Tightened (pow 5) and kept
    // narrow — a broad rim term turns every curved surface into a white blob,
    // because most of a sphere's area faces away from the viewer.
    float rim = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 5.0);
    rim *= smoothstep(-0.3, 0.4, ndl) * 0.35;

    vec3 color = albedo * (ambient + uSunColor * lit * 0.95);

    // Both additive terms are tinted by albedo so foliage glows *green*
    // rather than bleaching toward the sun colour.
    color += uSunColor * albedo * back * 1.1;
    color += uSunColor * albedo * rim * 0.9;

    return color;
  }
`

/** Uniforms every wind/light-aware material shares. */
export const sharedUniforms = () => ({
  uTime: { value: 0 },
  uWindDir: { value: null },
  uWindStrength: { value: 0 },
  uSunDir: { value: null },
  uSunColor: { value: null },
  uSkyColor: { value: null },
  uBounceColor: { value: null },
})
