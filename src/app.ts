import * as THREE from "three";
import { createCamera } from "./camera";
import { addLights } from "./lights";
import { setupControls } from "./controls";
import { setupResize } from "./resize";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import fragmentSimulation from "./shaders/fragmentSimulation.glsl";
import vertexPartcles from "./shaders/vertexParticles.glsl";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";

const WIDTH = 32;

function init(): void {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const scene = new THREE.Scene();
  const camera = createCamera();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

  addLights(scene);
  const controls = setupControls(camera, renderer);
  setupResize(camera, renderer);

  //  GPU Computation Renderer
  let gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);
  const dtPosition = gpuCompute.createTexture();
  console.log(dtPosition);
  let positionVariable = gpuCompute.addVariable(
    "texturePosition",
    fragmentSimulation,
    dtPosition
  );
  positionVariable.material.uniforms.time = { value: 0.0 };
  positionVariable.wrapS = THREE.RepeatWrapping;
  positionVariable.wrapT = THREE.RepeatWrapping;

  let error = gpuCompute.init();
  if (error !== null) {
    console.error(error);
  }

  function fillPositions(texture: THREE.DataTexture): THREE.DataTexture {
    const posArray = texture.image.data;
    for (let i = 0; i < posArray.length; i += 4) {
      let x = Math.random();
      let y = Math.random();
      let z = Math.random();
      posArray[i + 0] = x;
      posArray[i + 1] = y;
      posArray[i + 2] = z;
      posArray[i + 3] = 1;
    }
    return texture;
  }
  fillPositions(dtPosition);

  //  My Mesh
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      positionTexture: { value: null },
    },
    side: THREE.DoubleSide,
    vertexShader: vertexPartcles,
    fragmentShader: fragmentShader,
  });
  let positions = new Float32Array(WIDTH * WIDTH * 3);
  let reference = new Float32Array(WIDTH * WIDTH * 2);
  for (let i = 0; i < WIDTH * WIDTH; i++) {
    let x = Math.random();
    let y = Math.random();
    let z = Math.random();
    let xx = (i % WIDTH) / WIDTH;
    let yy = Math.floor(i / WIDTH) / WIDTH;
    positions.set([x, y, z], i * 3);
    reference.set([xx, yy], i * 2);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("reference", new THREE.BufferAttribute(reference, 2));

  const myMesh = new THREE.Points(geometry, material);
  scene.add(myMesh);

  //  Animate
  function animateFrame(): void {
    gpuCompute.compute();
    (myMesh.material as THREE.ShaderMaterial).uniforms.positionTexture.value =
      gpuCompute.getCurrentRenderTarget(positionVariable).texture;
    requestAnimationFrame(animateFrame);
    renderer.render(scene, camera);
  }
  animateFrame();
}

init();
