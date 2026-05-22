precision mediump float;

uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_seed;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 st = floor(gl_FragCoord.xy) + vec2(u_seed, u_seed * 0.37);
    float noise = random(st);
    float alive = noise < u_threshold ? 1.0 : 0.0;
    gl_FragColor = vec4(alive, alive, alive, 1.0);
}
