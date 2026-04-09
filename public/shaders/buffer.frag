precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_brush_size;
uniform bool u_grid_enable;
uniform bool u_paint;
uniform bool u_brush_mode;
uniform sampler2D u_patternTex;
uniform vec2 u_patternDims;

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

// Pattern in u_patternTex: row-major, row 0 = top; size u_patternDims (width, height).
// Uses a texture because WebGL1 often breaks on non-constant indices into uniform float[].
// Cursor (m) is framebuffer pixels; top-left cell of pattern anchors at floor(m).
float patternStamp(vec2 p, vec2 m) {
    float w = u_patternDims.x;
    float h = u_patternDims.y;
    if (w < 1.0 || h < 1.0)
        return 0.0;
    vec2 anchor = floor(m);
    for (float row = 0.0; row < 64.0; row += 1.0) {
        if (row >= h)
            break;
        for (float col = 0.0; col < 64.0; col += 1.0) {
            if (col >= w)
                break;
            vec2 uv = (vec2(col, row) + 0.5) / vec2(w, h);
            if (texture2D(u_patternTex, uv).r < 0.5)
                continue;
            if (floor(p.x) == anchor.x + col && floor(p.y) == anchor.y - row)
                return 1.0;
        }
    }
    return 0.0;
}

void main() {
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

    // color = vec3(v_uv.x, v_uv.y, 1.0);
    // color = vec3(gl_FragCoord.xy / u_resolution.xy, 1.0);

    // // Debug lines for pixel width
    // float x = gl_FragCoord.x;
    // // Alternate every 1 pixel
    // float stripe = mod(floor(x), 2.0);
    // color = vec3(stripe);

    // // Debug grid
    // float x = gl_FragCoord.x;
    // float stripex = mod(floor(x), 2.0);
    // float y = gl_FragCoord.y;
    // float stripey = mod(floor(y), 2.0);
    // color += vec3(stripex * 0.5, 0.0, 0.0);
    // color += vec3(0.0, stripey * 0.5, 0.0);

    // Debug grid gradient
    if (u_grid_enable) {
        float x = gl_FragCoord.x;
        float stripex = mod(floor(x), 2.0);
        float y = gl_FragCoord.y;
        float stripey = mod(floor(y), 2.0);
        color += vec3(stripex * 0.5 * (x / u_resolution.x), 0.0, 0.0);
        color += vec3(0.0, stripey * 0.5 * (y / u_resolution.y), 0.0);
    }

    // // Debug cross
    // if (distance(u_mouse.x, gl_FragCoord.x) < 10.0) {
    //     color = vec3(0.0);
    // }
    // if (distance(u_mouse.y, gl_FragCoord.y ) < 10.0) {
    //     color = vec3(0.0);
    // }

    if (u_paint) {
        if (u_brush_mode) {
            if (distance(u_mouse.xy, gl_FragCoord.xy) < u_brush_size)
                color = vec3(1.0);
        } else {
            float stamped = patternStamp(gl_FragCoord.xy, u_mouse.xy);
            if (stamped > 0.5)
                color = vec3(1.0);
        }
    }

    gl_FragColor = vec4(color, 1.0);
}
