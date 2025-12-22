precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_zoom;

varying vec2 v_uv;

float GetNeighbours(vec2 p) {
    float count = 0.0;

    for (float y = -1.0; y <= 1.0; y++) {
        for (float x = -1.0; x <= 1.0; x++) {
            if (x == 0.0 && y == 0.0)
                continue;

            // Scale the offset down
            vec2 offset = vec2(x, y) / u_resolution.xy;
            // Apply offset and sample texture
            vec4 lookup = texture2D(u_texture, p + offset);
            // Accumulate the result
            count += lookup.r > 0.5 ? 1.0 : 0.0;
        }
    }

    return count;
}

void main() {
    vec2 mouse = u_mouse / u_resolution;
    vec3 color = vec3(0.0);
    float neighbors = GetNeighbours(v_uv);
    bool alive = texture2D(u_texture, v_uv).r > 0.5;
    float delay = 1.0;

    // is cell alive
    if (neighbors == 3.0 || (alive && neighbors == 2.0)) {
        color = vec3(1.0);
    }

    // show image for some time
    if (u_time <= delay) {
        color = texture2D(u_texture, v_uv).rgb;
    }

    // draw on screen
    vec2 zoomed_uv = (v_uv - mouse) * u_zoom + mouse;
    if (distance((v_uv - mouse) * u_zoom + mouse, mouse) < 0.005 * u_zoom
            && u_time > delay) {
        color = vec3(1.0);
    }

    gl_FragColor = vec4(color, 1.0);
}
