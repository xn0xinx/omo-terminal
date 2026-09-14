/**
 * CRT Shader Controller: Single-pass WebGL post-processing & barrel distortion.
 * Optimized for low-power Intel HD 530 iGPU.
 */
(function() {
  "use strict";

  const canvas = document.getElementById("crt-canvas");
  const screenEl = document.getElementById("crt-screen");
  const toggleBtn = document.getElementById("crt-toggle");

  if (!canvas || !screenEl || !toggleBtn) return;

  let gl = null;
  let program = null;
  let animId = null;
  let enabled = true;
  let uTimeLoc, uResLoc, uCurvLoc, uTintLoc;
  let crtTint = [0.02, 0.12, 0.04];
  let startTime = performance.now();

  const vsSource = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = (aPosition + 1.0) * 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  // Lean single-pass fragment shader for subtle barrel distortion & phosphor scanlines
  const fsSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uCurvature;
    uniform vec3 uTint;

    void main() {
      vec2 uv = vUv;
      vec2 cc = uv - 0.5;
      float dist = dot(cc, cc);

      // Barrel distortion curve
      uv = uv + cc * (dist * uCurvature);

      // Outside screen bounds mask
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.95);
        return;
      }

      // Soft vignette with minimum brightness floor
      float vig = 1.0 - dist * 1.05;
      vig = clamp(vig, 0.25, 1.0);

      // Scanline pattern
      float scan = sin(uv.y * uResolution.y * 1.8 + uTime * 3.0) * 0.04;

      // Subtle phosphor flicker
      float flicker = 0.98 + 0.02 * sin(uTime * 25.0);

      vec3 color = uTint * (1.0 + scan) * vig * flicker;
      gl_FragColor = vec4(color, 0.08);
    }
  `;


  function initGL() {
    try {
      gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false });
    } catch (e) {
      gl = null;
    }
    if (!gl) {
      setFallbackCSS();
      return false;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFallbackCSS();
      return false;
    }

    gl.useProgram(program);

    // Quad geometry
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uTimeLoc = gl.getUniformLocation(program, "uTime");
    uResLoc = gl.getUniformLocation(program, "uResolution");
    uCurvLoc = gl.getUniformLocation(program, "uCurvature");
    uTintLoc = gl.getUniformLocation(program, "uTint");

    resize();
    window.addEventListener("resize", resize);
    return true;
  }

  function createShader(glCtx, type, src) {
    const s = glCtx.createShader(type);
    glCtx.shaderSource(s, src);
    glCtx.compileShader(s);
    return s;
  }

  function resize() {
    if (!gl || !canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function render(now) {
    if (!enabled || !gl) return;
    const time = (now - startTime) * 0.001;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform1f(uTimeLoc, time);
    gl.uniform2f(uResLoc, canvas.width, canvas.height);
    gl.uniform1f(uCurvLoc, 0.08); // tuned retro curvature intensity
    if (uTintLoc) {
      gl.uniform3f(uTintLoc, crtTint[0], crtTint[1], crtTint[2]);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    animId = requestAnimationFrame(render);
  }

  function setFallbackCSS() {
    canvas.style.display = "none";
    screenEl.classList.add("barrel-curve");
  }

  function toggleCRT() {
    enabled = !enabled;
    if (enabled) {
      toggleBtn.textContent = "CURVE: ON";
      canvas.style.display = "block";
      screenEl.classList.add("barrel-curve");
      if (gl && !animId) {
        animId = requestAnimationFrame(render);
      }
    } else {
      toggleBtn.textContent = "CURVE: OFF";
      canvas.style.display = "none";
      screenEl.classList.remove("barrel-curve");
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    }
  }

  toggleBtn.addEventListener("click", toggleCRT);

  if (initGL()) {
    screenEl.classList.add("barrel-curve");
    animId = requestAnimationFrame(render);
  } else {
    toggleBtn.textContent = "CURVE: OFF";
  }

  window.CRTController = {
    toggle: toggleCRT,
    setTint: function(rgb) {
      if (Array.isArray(rgb) && rgb.length === 3) {
        crtTint = [rgb[0], rgb[1], rgb[2]];
      }
    },
  };
})();

