precision mediump float;
uniform sampler2D u_texture;
uniform float u_zoom;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 v_uv;

void main() {
    vec2 mouse = u_mouse / u_resolution;
    vec2 zoomed_uv = (v_uv - mouse) * u_zoom + mouse;
    gl_FragColor = texture2D(u_texture, zoomed_uv);
}

