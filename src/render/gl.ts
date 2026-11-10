// WebGL2 renderer for the glowing shapes. One instanced draw call renders every capsule, disc
// and ring with a signed-distance edge, additively, into a texture. That texture is blurred at
// two reduced sizes and added back: the soft bloom on everything lit. It draws exactly the shape
// list that the Canvas 2D fallback draws.

import { STRIDE, type Scene } from "./scene";

const SHAPE_VS = `#version 300 es
layout(location=0) in vec2 a_corner;
layout(location=1) in vec4 a_pts;
layout(location=2) in vec2 a_size;
layout(location=3) in vec4 a_color;
layout(location=4) in float a_type;
uniform vec2 u_res;
out vec2 v_p; out vec4 v_pts; out vec2 v_size; out vec4 v_color; out float v_type;
void main() {
  vec2 p0 = a_pts.xy, p1 = a_pts.zw;
  float pad = a_size.x + a_size.y + 1.5;
  vec2 pos;
  if (a_type < 0.5) {
    vec2 d = p1 - p0; float len = length(d);
    vec2 u = len > 0.0001 ? d / len : vec2(1.0, 0.0); vec2 n = vec2(-u.y, u.x);
    pos = (p0 + p1) * 0.5 + u * a_corner.x * (len * 0.5 + pad) + n * a_corner.y * pad;
  } else pos = p0 + a_corner * pad;
  v_p = pos; v_pts = a_pts; v_size = a_size; v_color = a_color; v_type = a_type;
  vec2 clip = pos / u_res * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;
const SHAPE_FS = `#version 300 es
precision highp float;
in vec2 v_p; in vec4 v_pts; in vec2 v_size; in vec4 v_color; in float v_type;
uniform float u_aa;
out vec4 o;
void main() {
  float d;
  if (v_type < 0.5) {
    vec2 pa = v_p - v_pts.xy, ba = v_pts.zw - v_pts.xy;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    d = length(pa - ba * h) - v_size.x;
  } else if (v_type < 1.5) d = length(v_p - v_pts.xy) - v_size.x;
  else d = abs(length(v_p - v_pts.xy) - v_size.x) - v_size.y;
  float a = v_color.a * (1.0 - smoothstep(-u_aa, u_aa, d));
  o = vec4(v_color.rgb * a, a);
}`;
const QUAD_VS = `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const BLUR_FS = `#version 300 es
precision highp float;
in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_dir; out vec4 o;
void main() {
  vec4 c = texture(u_tex, v_uv) * 0.2270270;
  c += (texture(u_tex, v_uv + u_dir * 1.3846154) + texture(u_tex, v_uv - u_dir * 1.3846154)) * 0.3162162;
  c += (texture(u_tex, v_uv + u_dir * 3.2307692) + texture(u_tex, v_uv - u_dir * 3.2307692)) * 0.0702703;
  o = c;
}`;
const MIX_FS = `#version 300 es
precision highp float;
in vec2 v_uv; uniform sampler2D u_sharp; uniform sampler2D u_near; uniform sampler2D u_far; out vec4 o;
void main() {
  vec3 c = texture(u_sharp, v_uv).rgb + texture(u_near, v_uv).rgb * 0.85 + texture(u_far, v_uv).rgb * 0.75;
  // Scale down rather than clip, so bright areas keep their hue: amber stays amber, not yellow.
  c /= max(1.0, max(c.r, max(c.g, c.b)));
  // Premultiplied output: where nothing is lit the backdrop canvas below shows through.
  o = vec4(c, max(c.r, max(c.g, c.b)));
}`;

interface Target { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

export class GlRenderer {
  private shape: WebGLProgram; private blur: WebGLProgram; private mix: WebGLProgram;
  private vao: WebGLVertexArrayObject; private instances: WebGLBuffer; private capacity = 0;
  private targets: Target[] = [];
  private size = "";
  lost = false;

  private constructor(private gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    this.shape = program(gl, SHAPE_VS, SHAPE_FS);
    this.blur = program(gl, QUAD_VS, BLUR_FS);
    this.mix = program(gl, QUAD_VS, MIX_FS);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const corners = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.instances = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
    const bytes = STRIDE * 4;
    for (const [loc, count, offset] of [[1, 4, 0], [2, 2, 4], [3, 4, 6], [4, 1, 10]] as const) {
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, count, gl.FLOAT, false, bytes, offset * 4); gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); this.lost = true; });
  }

  /** Returns null when WebGL2 is unavailable, so the caller can use the 2D fallback. */
  static create(canvas: HTMLCanvasElement): GlRenderer | null {
    try {
      const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
      return gl ? new GlRenderer(gl, canvas) : null;
    } catch { return null; }
  }

  private resize(pw: number, ph: number): void {
    const gl = this.gl, key = `${pw}x${ph}`;
    if (key === this.size) return;
    this.size = key;
    for (const t of this.targets) { gl.deleteFramebuffer(t.fbo); gl.deleteTexture(t.tex); }
    // 0: sharp. 1,2: half size (blur ping-pong). 3,4: quarter size (wider blur ping-pong).
    this.targets = [1, 2, 2, 4, 4].map(div => {
      const w = Math.max(2, Math.round(pw / div)), h = Math.max(2, Math.round(ph / div));
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { fbo, tex, w, h };
    });
  }

  private pass(prog: WebGLProgram, to: Target | null, pw: number, ph: number, textures: [string, Target][], dir?: [number, number]): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, to?.fbo ?? null);
    gl.viewport(0, 0, to?.w ?? pw, to?.h ?? ph);
    gl.useProgram(prog);
    textures.forEach(([name, t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(gl.getUniformLocation(prog, name), i); });
    if (dir) gl.uniform2f(gl.getUniformLocation(prog, "u_dir"), dir[0], dir[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  draw(scene: Scene, w: number, h: number, dpr: number): void {
    const gl = this.gl;
    if (this.lost) return;
    const pw = gl.drawingBufferWidth, ph = gl.drawingBufferHeight;
    this.resize(pw, ph);
    const [sharp, halfA, halfB, quarterA, quarterB] = this.targets as [Target, Target, Target, Target, Target];

    // 1. Shapes, additive, into the sharp texture.
    gl.bindFramebuffer(gl.FRAMEBUFFER, sharp.fbo);
    gl.viewport(0, 0, pw, ph);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const n = scene.shapes.n;
    if (n > 0) {
      gl.useProgram(this.shape);
      gl.uniform2f(gl.getUniformLocation(this.shape, "u_res"), w, h);
      gl.uniform1f(gl.getUniformLocation(this.shape, "u_aa"), 0.8 / dpr);
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instances);
      const view = scene.shapes.data.subarray(0, n * STRIDE);
      if (n > this.capacity) { this.capacity = Math.max(n, this.capacity * 2, 1024); gl.bufferData(gl.ARRAY_BUFFER, this.capacity * STRIDE * 4, gl.DYNAMIC_DRAW); }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }

    // 2. Bloom: blur at half size, then again at quarter size for the wide soft halo.
    this.pass(this.blur, halfA, pw, ph, [["u_tex", sharp]], [1 / halfA.w, 0]);
    this.pass(this.blur, halfB, pw, ph, [["u_tex", halfA]], [0, 1 / halfB.h]);
    this.pass(this.blur, quarterA, pw, ph, [["u_tex", halfB]], [1.6 / quarterA.w, 0]);
    this.pass(this.blur, quarterB, pw, ph, [["u_tex", quarterA]], [0, 1.6 / quarterB.h]);

    // 3. Sharp + both blurs, onto the canvas.
    this.pass(this.mix, null, pw, ph, [["u_sharp", sharp], ["u_near", halfB], ["u_far", quarterB]]);
  }
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`shader: ${gl.getShaderInfoLog(s) ?? "compile failed"}`);
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`program: ${gl.getProgramInfoLog(p) ?? "link failed"}`);
  return p;
}
