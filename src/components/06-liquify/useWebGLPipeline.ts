import { useCallback, useEffect, useRef } from "react";
import * as twgl from "twgl.js";
import {
  VERT_SHADER,
  PASSTHROUGH_FRAG,
  FIELD_BLUR_FRAG,
  VORTEX_FRAG,
  DITHER_FRAG,
} from "./shaders";

export interface BlurPoint {
  x: number;
  y: number;
  radius: number;
}

export interface Vortex {
  x: number;
  y: number;
  radius: number;
  angle: number;
}

export interface PipelineParams {
  fieldBlurEnabled: boolean;
  blurIntensity: number;
  blurPoints: BlurPoint[];
  vortexEnabled: boolean;
  vortices: Vortex[];
  vortexDecay: number;
  ditherEnabled: boolean;
  ditherSharpness: number;
  ditherSeed: number;
}

const MAX_POINTS = 16;

interface Pipeline {
  gl: WebGL2RenderingContext;
  fieldBlurProg: twgl.ProgramInfo;
  vortexProg: twgl.ProgramInfo;
  ditherProg: twgl.ProgramInfo;
  passthroughProg: twgl.ProgramInfo;
  quad: twgl.BufferInfo;
  sourceTexture: WebGLTexture | null;
  fboA: twgl.FramebufferInfo;
  fboB: twgl.FramebufferInfo;
  width: number;
  height: number;
}

export function useWebGLPipeline(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  source: HTMLCanvasElement | null,
  width: number,
  height: number,
) {
  const ref = useRef<Pipeline | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;

    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) {
      console.error("WebGL 2 not available");
      return;
    }

    const fieldBlurProg = twgl.createProgramInfo(gl, [VERT_SHADER, FIELD_BLUR_FRAG]);
    const vortexProg = twgl.createProgramInfo(gl, [VERT_SHADER, VORTEX_FRAG]);
    const ditherProg = twgl.createProgramInfo(gl, [VERT_SHADER, DITHER_FRAG]);
    const passthroughProg = twgl.createProgramInfo(gl, [VERT_SHADER, PASSTHROUGH_FRAG]);

    const quad = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1] },
    });

    const fboOpts = [{ min: gl.LINEAR, mag: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE }];
    const fboA = twgl.createFramebufferInfo(gl, fboOpts, width, height);
    const fboB = twgl.createFramebufferInfo(gl, fboOpts, width, height);

    ref.current = {
      gl,
      fieldBlurProg,
      vortexProg,
      ditherProg,
      passthroughProg,
      quad,
      sourceTexture: null,
      fboA,
      fboB,
      width,
      height,
    };

    return () => {
      ref.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- canvasRef is a stable ref object
  }, [width, height]);

  useEffect(() => {
    const p = ref.current;
    if (!p || !source) return;
    const { gl } = p;

    if (p.sourceTexture) gl.deleteTexture(p.sourceTexture);

    p.sourceTexture = twgl.createTexture(gl, {
      src: source,
      min: gl.LINEAR_MIPMAP_LINEAR,
      mag: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
      flipY: 1,
    });
  }, [source]);

  const drawPass = useCallback(
    (p: Pipeline, prog: twgl.ProgramInfo, uniforms: Record<string, unknown>) => {
      const { gl, quad } = p;
      gl.useProgram(prog.program);
      twgl.setBuffersAndAttributes(gl, prog, quad);
      twgl.setUniforms(prog, uniforms);
      twgl.drawBufferInfo(gl, quad);
    },
    [],
  );

  const render = useCallback(
    (params: PipelineParams) => {
      const p = ref.current;
      if (!p || !p.sourceTexture) return;
      const { gl, width: w, height: h } = p;

      gl.viewport(0, 0, w, h);

      let currentTex: WebGLTexture = p.sourceTexture;
      let writeFbo = p.fboA;
      let swapFbo = p.fboB;

      type Pass = { prog: twgl.ProgramInfo; uniforms: Record<string, unknown> };
      const passes: Pass[] = [];

      if (params.fieldBlurEnabled && params.blurPoints.length >= 2) {
        const positions = new Float32Array(MAX_POINTS * 2);
        const radii = new Float32Array(MAX_POINTS);
        const count = Math.min(params.blurPoints.length, MAX_POINTS);
        for (let i = 0; i < count; i++) {
          positions[i * 2] = params.blurPoints[i].x;
          positions[i * 2 + 1] = h - params.blurPoints[i].y;
          radii[i] = params.blurPoints[i].radius;
        }
        passes.push({
          prog: p.fieldBlurProg,
          uniforms: {
            u_source: p.sourceTexture,
            u_resolution: [w, h],
            u_pointCount: count,
            u_pointPositions: positions,
            u_pointRadii: radii,
            u_intensity: params.blurIntensity,
            u_maxRadius: 50.0,
          },
        });
      }

      if (params.vortexEnabled && params.vortices.length > 0) {
        const count = Math.min(params.vortices.length, 8);
        const centers = new Float32Array(8 * 2);
        const radii = new Float32Array(8);
        const angles = new Float32Array(8);
        for (let i = 0; i < count; i++) {
          centers[i * 2] = params.vortices[i].x;
          centers[i * 2 + 1] = h - params.vortices[i].y;
          radii[i] = params.vortices[i].radius;
          angles[i] = params.vortices[i].angle;
        }
        passes.push({
          prog: p.vortexProg,
          uniforms: {
            u_source: null as unknown,
            u_resolution: [w, h],
            u_vortexCount: count,
            u_vortexCenters: centers,
            u_vortexRadii: radii,
            u_vortexAngles: angles,
            u_vortexDecay: params.vortexDecay,
          },
        });
      }

      if (params.ditherEnabled) {
        passes.push({
          prog: p.ditherProg,
          uniforms: {
            u_source: null as unknown,
            u_seed: (params.ditherSeed & 0xffff) * 0.01,
            u_gainK: 1.0 + (params.ditherSharpness / 100.0) * 19.0,
          },
        });
      }

      if (passes.length === 0) {
        twgl.bindFramebufferInfo(gl, null);
        drawPass(p, p.passthroughProg, { u_source: p.sourceTexture });
        return;
      }

      for (let i = 0; i < passes.length; i++) {
        const pass = passes[i];
        const isLast = i === passes.length - 1;

        if (pass.uniforms.u_source === null) {
          pass.uniforms.u_source = currentTex;
        }

        twgl.bindFramebufferInfo(gl, isLast ? null : writeFbo);
        drawPass(p, pass.prog, pass.uniforms);

        if (!isLast) {
          currentTex = writeFbo.attachments[0] as WebGLTexture;
          const tmp = writeFbo;
          writeFbo = swapFbo;
          swapFbo = tmp;
        }
      }
    },
    [drawPass],
  );

  return { render };
}
