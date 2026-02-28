precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_zoom;
uniform float u_brush_size;
uniform bool u_grid_enable;
uniform bool u_paint;
uniform float u_pattern[1024];

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

float paint(vec2 p, vec2 m) {
    for (float x = 2.0; x <= 9999.0; x++) {
        if (x >= u_pattern[0] * u_pattern[1]) break;
        if (floor(p.x) == m.x + float(mod(x, u_pattern[0]))) {
            if (floor(p.y) == m.y - float(int(x / u_pattern[0]))) {
                return u_pattern[int(x)];
            }
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

    // // show image for some time
    // if (u_time <= delay) {
    //     color = texture2D(u_texture, v_uv).rgb;
    // }

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

    // Draw on screen
    if (u_paint && distance(u_mouse.xy, gl_FragCoord.xy) < 1.0 * u_brush_size && u_time > delay) {
        color = vec3(1.0);
    }

    // Paint on screen
    // if (u_paint) {
    //     float col = paint(gl_FragCoord.xy, u_mouse.xy);
    //     if (col == 1.0) {
    //         color = vec3(col);
    //     }
    // }

    gl_FragColor = vec4(color, 1.0);
}
