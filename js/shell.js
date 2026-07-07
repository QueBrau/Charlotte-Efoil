import { initAnalytics, trackEvent } from "/js/analytics.js";

const NAV_ITEMS = [
  { href: "/", label: "Welcome", page: "welcome" },
  { href: "/reservation-request.html", label: "Reservations", page: "reservation-request" },
  { href: "/flight-lessons.html", label: "How We Operate", page: "flight-lessons" },
  { href: "/about.html", label: "About Us", page: "about" },
  { href: "/contact.html", label: "Contact Us", page: "contact" },
];

const LOGO_MARKUP = `<img class="logo-image" src="/photos/CharlotteEfoil.png" alt="CharlotteEfoil" width="220" height="52" decoding="async" fetchpriority="high" />`;

const INSTAGRAM_URL = "https://www.instagram.com/charlotteefoil";

const INSTAGRAM_SVG = `<svg class="social-link__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`;

const INSTAGRAM_LINK = `<a class="social-link" href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">${INSTAGRAM_SVG}<span>@charlotteefoil</span></a>`;

export function renderNav(activePage = "welcome") {
  const links = NAV_ITEMS.map((item) => {
    return `<li class="nav-item ${item.page === activePage ? "is-active" : ""}"><a href="${item.href}">${item.label}</a></li>`;
  }).join("");

  return `
    <header class="site-header" data-header>
      <nav class="nav container" aria-label="Main navigation">
        <a class="logo" href="/">${LOGO_MARKUP}</a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        <a class="nav-phone" href="tel:7044218778">704-421-8778</a>
      </nav>
    </header>
    <ul class="nav-links" id="nav-menu">
      ${links}
      <li class="nav-mobile-actions">
        <a class="btn btn-primary" href="tel:7044218778">Call 704-421-8778</a>
        <a class="btn btn-secondary" href="/reservation-request.html">Request Reservation</a>
      </li>
    </ul>
    <div class="nav-overlay" data-nav-overlay hidden></div>`;
}

export function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <a class="logo" href="/">${LOGO_MARKUP}</a>
          <p>The Charlotte area's only mobile eFoil experience. Carving your way to an adventure like no other.</p>
          <div class="footer-social">${INSTAGRAM_LINK}</div>
        </div>
        <div>
          <h3>Explore</h3>
          <ul>
            <li><a href="/reservation-request.html#pricing">Pricing</a></li>
            <li><a href="/flight-lessons.html">How We Operate</a></li>
            <li><a href="/reservation-request.html">Reservations</a></li>
            <li><a href="/reservation-request.html#corporate">Corporate Outings</a></li>
            <li><a href="/about.html">About Us</a></li>
            <li><a href="/contact.html">Contact</a></li>
          </ul>
        </div>
        <div>
          <h3>Contact</h3>
          <ul>
            <li><a href="tel:7044218778">704-421-8778</a></li>
            <li><a href="mailto:hello@CharlotteEfoil.com">hello@CharlotteEfoil.com</a></li>
            <li><a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">Instagram @charlotteefoil</a></li>
            <li>Charlotte, NC</li>
          </ul>
        </div>
      </div>
      <div class="container footer-bottom">
        <p>&copy; <span data-year></span> CharlotteEfoil. All rights reserved.</p>
        <p>Serving Lake Norman, Mountain Island Lake, Lake Wylie &amp; beyond.</p>
      </div>
    </footer>`;
}

export function initShell(activePage) {
  const headerMount = document.querySelector("[data-site-header]");
  const footerMount = document.querySelector("[data-site-footer]");
  if (headerMount) headerMount.innerHTML = renderNav(activePage);
  if (footerMount) footerMount.innerHTML = renderFooter();

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  initNavigation();
  initHeaderScroll();
  initForms();
  initReveal();
  initMobileActionBar();
  initDesktopNavPlacement();
  initAnalytics();
}

function initDesktopNavPlacement() {
  const nav = document.querySelector(".nav");
  const menu = document.querySelector(".nav-links");
  const overlay = document.querySelector("[data-nav-overlay]");
  const phone = document.querySelector(".nav-phone");
  if (!nav || !menu || !overlay || !phone) return;

  const mq = window.matchMedia("(min-width: 861px)");

  const apply = () => {
    if (mq.matches) {
      if (!nav.contains(menu)) {
        nav.insertBefore(menu, phone);
        nav.insertBefore(overlay, phone);
      }
      return;
    }

    if (menu.parentElement !== document.body) {
      document.body.appendChild(overlay);
      document.body.appendChild(menu);
    }
  };

  apply();
  mq.addEventListener("change", apply);
}

function initMobileActionBar() {
  if (document.querySelector("[data-mobile-bar]")) return;

  const bar = document.createElement("div");
  bar.className = "mobile-action-bar";
  bar.dataset.mobileBar = "";
  bar.setAttribute("aria-label", "Quick actions");
  bar.innerHTML = `
    <a class="mobile-action-bar__call" href="tel:7044218778">Call</a>
    <a class="mobile-action-bar__book" href="/reservation-request.html">Book Now</a>
  `;
  document.body.appendChild(bar);
}

function initNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-links");
  const overlay = document.querySelector("[data-nav-overlay]");
  const header = document.querySelector("[data-header]");
  if (!toggle || !menu) return;

  const setMenuOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    header?.classList.toggle("nav-menu-open", open);
    overlay?.toggleAttribute("hidden", !open);
    if (open) {
      menu.scrollTop = 0;
    }
  };

  toggle.addEventListener("click", () => {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  overlay?.addEventListener("click", () => setMenuOpen(false));

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });
}

function initHeaderScroll() {
  const header = document.querySelector("[data-header]");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

const API_BASE = window.CE_API_BASE || "/api";
const FORM_ENDPOINTS = {
  contact: `${API_BASE}/contact`,
  reservation: `${API_BASE}/reservations`,
};

function buildContactPayload(form) {
  const data = new FormData(form);
  return {
    name: data.get("name") || "",
    email: data.get("email") || "",
    message: data.get("message") || "",
    company: data.get("company") || "", // honeypot
  };
}

function buildReservationPayload(form) {
  const data = new FormData(form);
  return {
    first_name: data.get("firstName") || "",
    last_name: data.get("lastName") || "",
    email: data.get("email") || "",
    phone: data.get("phone") || "",
    session_time: data.get("sessionTime") || "",
    launch_location: data.get("launchLocation") || "",
    preferred_date: data.get("preferredDate") || "",
    interests: data.getAll("interest"),
    terms_accepted: data.get("terms") === "on",
    company: data.get("company") || "", // honeypot
  };
}

function initForms() {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    const type = form.dataset.formType || "contact";
    let startedTracked = false;

    form.addEventListener(
      "focusin",
      () => {
        if (startedTracked) return;
        startedTracked = true;
        trackEvent("form_start", type);
      },
      { once: false }
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!form.checkValidity()) {
        if (status) {
          status.textContent = "Please complete all required fields.";
          status.classList.add("is-error");
        }
        form.reportValidity();
        return;
      }

      const endpoint = FORM_ENDPOINTS[type] || FORM_ENDPOINTS.contact;
      const payload =
        type === "reservation" ? buildReservationPayload(form) : buildContactPayload(form);

      payload.source_path = window.location.pathname;
      payload.referrer = document.referrer || "";

      if (submitBtn) submitBtn.disabled = true;
      if (status) {
        status.textContent = "Sending…";
        status.classList.remove("is-error");
      }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || result.error) {
          throw new Error(result.error || "Request failed");
        }

        form.reset();
        if (status) {
          status.textContent =
            form.dataset.success || "Thanks for submitting! We'll be in touch soon.";
          status.classList.remove("is-error");
        }
        trackEvent("form_submit", type);
      } catch (err) {
        if (status) {
          status.textContent =
            "We couldn't submit your request. Please try again or call 704-421-8778.";
          status.classList.add("is-error");
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}

function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
}

export function initParallax() {
  const hero = document.querySelector("[data-parallax-hero]");
  if (!hero) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 860px), (hover: none) and (pointer: coarse)").matches;

  if (prefersReducedMotion || isMobile) {
    hero.classList.add("parallax-disabled");
    return;
  }

  const videoWrap = hero.querySelector(".hero-video-wrap");
  const content = hero.querySelector(".hero-content");
  const layers = document.querySelectorAll("[data-parallax-layer]");

  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const heroHeight = hero.offsetHeight;

      if (scrollY <= heroHeight) {
        const progress = scrollY / heroHeight;
        if (videoWrap) {
          videoWrap.style.transform = `translate3d(0, ${scrollY * 0.45}px, 0) scale(${1 + progress * 0.08})`;
        }
        if (content) {
          content.style.transform = `translate3d(0, ${scrollY * 0.2}px, 0)`;
          content.style.opacity = String(Math.max(0, 1 - progress * 1.4));
        }
      }

      layers.forEach((layer) => {
        const speed = Number(layer.dataset.parallaxLayer) || 0.15;
        const rect = layer.getBoundingClientRect();
        const offset = (window.innerHeight - rect.top) * speed;
        layer.style.transform = `translate3d(0, ${offset}px, 0)`;
      });

      ticking = false;
    });
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

export function initHeroVideo() {
  const video = document.querySelector("[data-hero-video]");
  if (!video) return;

  const markReady = () => {
    video.classList.add("is-ready");
  };

  video.addEventListener("canplay", markReady, { once: true });
  if (video.readyState >= 3) markReady();

  video.play().catch(() => {
    /* autoplay blocked — still show first frame once data is available */
    video.addEventListener("loadeddata", markReady, { once: true });
  });

  const volumeBtn = document.querySelector("[data-hero-volume]");
  if (!volumeBtn) return;

  const iconMuted = volumeBtn.querySelector(".hero-video-volume__icon--muted");
  const iconOn = volumeBtn.querySelector(".hero-video-volume__icon--on");

  const syncVolumeUi = () => {
    const muted = video.muted;
    volumeBtn.setAttribute("aria-pressed", String(!muted));
    volumeBtn.setAttribute("aria-label", muted ? "Unmute video" : "Mute video");
    iconMuted?.classList.toggle("is-visible", muted);
    iconOn?.classList.toggle("is-visible", !muted);
  };

  volumeBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    if (!video.muted) video.volume = 1;
    syncVolumeUi();
  });

  syncVolumeUi();
}
