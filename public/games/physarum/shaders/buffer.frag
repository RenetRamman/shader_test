precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;

varying vec2 v_uv;

void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
}
