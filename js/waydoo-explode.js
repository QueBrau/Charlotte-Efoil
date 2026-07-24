/**
 * Waydoo sticky-scroll canvas sequence + GSAP callouts
 *
 * Requires GSAP + ScrollTrigger on window (CDN):
 *   gsap.registerPlugin(ScrollTrigger)
 *
 * Replace currentFrame() paths when your 3D render sequence is ready.
 */

const FRAME_COUNT = 60;
const CANVAS_WIDTH = 1158;
const CANVAS_HEIGHT = 770;

/**
 * Returns the image URL for a frame index (0–59).
 *
 * When your renders are ready, swap the return line to:
 *   return `/assets/waydoo-frames/waydoo_frame_${frameNumber}.webp`;
 *
 * @param {number} index - Zero-based frame index
 * @returns {string}
 */
function currentFrame(index) {
  const frameNumber = String(index + 1).padStart(3, "0");

  // TODO: Replace placeholder URLs with your local sequence:
  // return `/assets/waydoo-frames/waydoo_frame_${frameNumber}.webp`;

  // Temporary public placeholders — unique seed per frame for scrub testing.
  return `https://picsum.photos/seed/waydoo-frame-${frameNumber}/${CANVAS_WIDTH}/${CANVAS_HEIGHT}`;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getGsap() {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) {
    console.warn("[waydoo-explode] GSAP and ScrollTrigger must be loaded globally before initWaydooExplode().");
    return null;
  }
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

function preloadFrames() {
  return new Promise((resolve, reject) => {
    const images = new Array(FRAME_COUNT);
    let loadedCount = 0;
    let failed = false;

    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const img = new Image();
      img.decoding = "async";
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loadedCount += 1;
        if (loadedCount === FRAME_COUNT) resolve(images);
      };
      img.onerror = () => {
        if (failed) return;
        failed = true;
        reject(new Error(`Failed to preload frame ${i + 1}: ${currentFrame(i)}`));
      };
      img.src = currentFrame(i);
      images[i] = img;
    }
  });
}

function fitCanvas(canvas) {
  const parent = canvas.parentElement;
  if (!parent) return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, dpr: 1 };

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bounds = parent.getBoundingClientRect();
  const scale = Math.min(bounds.width / CANVAS_WIDTH, bounds.height / CANVAS_HEIGHT, 1);
  const displayWidth = Math.round(CANVAS_WIDTH * scale);
  const displayHeight = Math.round(CANVAS_HEIGHT * scale);

  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = Math.round(displayWidth * dpr);
  canvas.height = Math.round(displayHeight * dpr);

  return { width: canvas.width, height: canvas.height, dpr };
}

function drawFrame(ctx, canvas, image, metrics) {
  if (!image?.complete) return;

  const { width, height } = metrics;
  ctx.clearRect(0, 0, width, height);

  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function buildCalloutTimeline(gsap, section, callouts) {
  const battery = callouts.battery;
  const mast = callouts.mast;
  const motor = callouts.motor;

  gsap.set([battery, mast, motor], { autoAlpha: 0, y: 36 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.2,
    },
  });

  // 10% → 30% — PowerFlight Smart Battery
  tl.fromTo(
    battery,
    { autoAlpha: 0, y: 36 },
    { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.08 },
    0.1
  )
    .to(battery, { autoAlpha: 0, y: -24, ease: "power2.in", duration: 0.08 }, 0.22);

  // 40% → 60% — Carbon Fiber Mast
  tl.fromTo(
    mast,
    { autoAlpha: 0, y: 36 },
    { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.08 },
    0.4
  )
    .to(mast, { autoAlpha: 0, y: -24, ease: "power2.in", duration: 0.08 }, 0.52);

  // 70% → 90% — 6000W Waterproof Motor
  tl.fromTo(
    motor,
    { autoAlpha: 0, y: 36 },
    { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.08 },
    0.7
  )
    .to(motor, { autoAlpha: 0, y: -24, ease: "power2.in", duration: 0.08 }, 0.82);

  return tl;
}

export async function initWaydooExplode() {
  const section = document.querySelector("[data-waydoo-explode]");
  if (!section) return;

  const gsapBundle = getGsap();
  if (!gsapBundle) return;

  const { gsap, ScrollTrigger } = gsapBundle;
  const canvas = section.querySelector("#waydoo-explode-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const callouts = {
    battery: section.querySelector('[data-callout="battery"]'),
    mast: section.querySelector('[data-callout="mast"]'),
    motor: section.querySelector('[data-callout="motor"]'),
  };

  let frames = [];
  let metrics = fitCanvas(canvas);
  let activeFrame = 0;

  const render = (frameIndex) => {
    activeFrame = Math.max(0, Math.min(FRAME_COUNT - 1, frameIndex));
    drawFrame(ctx, canvas, frames[activeFrame], metrics);
  };

  const onResize = () => {
    metrics = fitCanvas(canvas);
    render(activeFrame);
  };

  window.addEventListener("resize", onResize, { passive: true });

  try {
    frames = await preloadFrames();
  } catch (error) {
    console.error("[waydoo-explode]", error);
    return;
  }

  render(0);

  if (prefersReducedMotion()) {
    gsap.set(Object.values(callouts), { autoAlpha: 1, y: 0 });
    render(Math.floor(FRAME_COUNT / 2));
    return;
  }

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    scrub: 1.2,
    onUpdate: (self) => {
      const frameIndex = Math.round(self.progress * (FRAME_COUNT - 1));
      render(frameIndex);
    },
  });

  buildCalloutTimeline(gsap, section, callouts);
  ScrollTrigger.refresh();
}
