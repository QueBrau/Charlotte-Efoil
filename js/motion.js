import { animate, createTimeline, stagger } from "animejs";
import { splitText } from "animejs/text";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

function prefersReducedMotion() {
  return REDUCED_MOTION.matches;
}

function revealImmediately() {
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    el.classList.add("is-visible");
  });
}

function primeHidden(el, offsetY = 28) {
  if (!el) return;
  el.style.opacity = "0";
  el.style.transform = `translateY(${offsetY}px)`;
}

export function initMotion() {
  if (prefersReducedMotion()) {
    revealImmediately();
    return;
  }

  document.body.classList.add("motion-enabled");

  initHeaderEntrance();
  initHeroEntrance();
  initPageHeroEntrance();
  initScrollReveals();
  initScrollCue();
}

function initHeaderEntrance() {
  const header = document.querySelector("[data-header]");
  if (!header) return;

  animate(header, {
    opacity: [0, 1],
    translateY: [-18, 0],
    duration: 700,
    ease: "outExpo",
  });
}

function initHeroEntrance() {
  const hero = document.querySelector(".hero-content");
  if (!hero) return;

  const eyebrow = hero.querySelector(".eyebrow");
  const h1 = hero.querySelector("h1");
  const lead = hero.querySelector(".hero-lead");
  const buttons = [...hero.querySelectorAll(".hero-actions .btn")];
  const scrollCue = document.querySelector(".hero-scroll");

  let words = [];

  if (h1) {
    const split = splitText(h1, {
      words: { wrap: true, class: "hero-word" },
      accessible: true,
    });
    words = split.words;
    words.forEach((word) => {
      word.style.opacity = "0";
      word.style.transform = "translateY(110%)";
    });
  }

  primeHidden(eyebrow, 18);
  primeHidden(lead, 24);
  buttons.forEach((btn) => primeHidden(btn, 18));

  if (scrollCue) {
    scrollCue.style.opacity = "0";
  }

  const start = () => {
    const timeline = createTimeline({ defaults: { ease: "outExpo" } });

    timeline.add(
      eyebrow,
      {
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 650,
      },
      180
    );

    if (words.length) {
      timeline.add(
        words,
        {
          opacity: [0, 1],
          translateY: ["110%", "0%"],
          duration: 900,
          delay: stagger(70),
        },
        320
      );
    } else if (h1) {
      timeline.add(
        h1,
        {
          opacity: [0, 1],
          translateY: [32, 0],
          duration: 900,
        },
        320
      );
    }

    timeline.add(
      lead,
      {
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 750,
      },
      720
    );

    timeline.add(
      buttons,
      {
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 650,
        delay: stagger(90),
      },
      860
    );

    if (scrollCue) {
      timeline.add(
        scrollCue,
        {
          opacity: [0, 1],
          duration: 600,
        },
        980
      );
    }
  };

  requestAnimationFrame(() => requestAnimationFrame(start));
}

function initPageHeroEntrance() {
  if (document.querySelector(".hero-parallax")) return;

  const pageHero = document.querySelector(".page-hero");
  if (!pageHero) return;

  const eyebrow = pageHero.querySelector(".eyebrow");
  const heading = pageHero.querySelector("h1");
  const copy = pageHero.querySelector("p");

  [eyebrow, heading, copy].filter(Boolean).forEach((el) => primeHidden(el, 22));

  const timeline = createTimeline({ defaults: { ease: "outExpo" } });

  timeline.add(
    eyebrow,
    {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 600,
    },
    120
  );

  timeline.add(
    heading,
    {
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 750,
    },
    260
  );

  timeline.add(
    copy,
    {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 700,
    },
    420
  );
}

function initScrollReveals() {
  document
    .querySelectorAll(".fleet-grid, .experience-grid, .location-cards, .steps-grid, .pricing-grid")
    .forEach((grid) => {
      [...grid.querySelectorAll("[data-reveal]")].forEach((el, index) => {
        el.dataset.revealDelay = String(index * 90);
      });
    });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        revealElement(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    primeHidden(el, revealOffset(el));
    observer.observe(el);
  });
}

function revealOffset(el) {
  if (el.matches(".fleet-card, .experience-card, .step-card, .price-card, .location-card")) {
    return 36;
  }

  if (el.matches(".split-visual, .about-visual, .image-card")) {
    return 32;
  }

  return 28;
}

function revealElement(el) {
  el.classList.add("is-visible");

  const isCard = el.matches(
    ".fleet-card, .experience-card, .step-card, .price-card, .location-card"
  );
  const isVisual = el.matches(".split-visual, .about-visual, .image-card");
  const delay = Number(el.dataset.revealDelay || 0);

  animate(el, {
    opacity: [0, 1],
    translateY: [revealOffset(el), 0],
    scale: isCard || isVisual ? [0.96, 1] : [1, 1],
    duration: isCard ? 850 : 780,
    delay,
    ease: "outExpo",
  });

  animateChecklist(el);
}

function animateChecklist(container) {
  const items = container.querySelectorAll(".check-list li");
  if (!items.length) return;

  items.forEach((item) => {
    item.style.opacity = "0";
    item.style.transform = "translateX(-14px)";
  });

  animate(items, {
    opacity: [0, 1],
    translateX: [-14, 0],
    duration: 550,
    delay: stagger(70, { start: 260 }),
    ease: "outQuad",
  });
}

function initScrollCue() {
  const line = document.querySelector(".hero-scroll-line");
  if (!line) return;

  animate(line, {
    scaleY: [0.55, 1],
    opacity: [0.35, 1],
    duration: 1700,
    ease: "inOutSine",
    loop: true,
    alternate: true,
  });
}
