uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

varying vec2 vUv;

float random(vec2 st) {
    const float a = 12.9898;
    const float b = 78.233;
    const float c = 43758.543123;
    return fract(sin(dot(st.xy, vec2(a, b))) * c);
}

float random(vec2 st, float seed) {
    const float a = 12.9898;
    const float b = 78.233;
    const float c = 43758.543123;
    return fract(sin(dot(st, vec2(a, b)) + seed) * c);
}

void main() {
    vec3 color = random(vUv, u_time) * vec3(1.0);

    // if (u_time > 5.0) {
    //     color = vec3(0.0);
    // }

    gl_FragColor = vec4(color, 1.0);
}
