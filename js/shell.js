const NAV_ITEMS = [
  { href: "index.html", label: "Welcome", page: "welcome" },
  { href: "pricing.html", label: "Pricing", page: "pricing" },
  { href: "reservation-details.html", label: "Reservation Details", page: "reservation-details" },
  { href: "flight-lessons.html", label: "Flight Lesson Details", page: "flight-lessons" },
  { href: "reservation-request.html", label: "Reservation Requests", page: "reservation-request" },
  {
    href: "more.html",
    label: "More",
    page: "more",
    children: [
      { href: "corporate.html", label: "Corporate Outings" },
      { href: "about.html", label: "About Us" },
      { href: "contact.html", label: "Contact Us" },
    ],
  },
];

const LOGO_MARKUP = `<img class="logo-image" src="/photos/CharlotteEfoil.png" alt="CharlotteEfoil" width="220" height="52" decoding="async" />`;

export function renderNav(activePage = "welcome") {
  const links = NAV_ITEMS.map((item) => {
    if (item.children) {
      const isActive = item.page === activePage || item.children.some((c) => c.href.replace(".html", "") === activePage);
      return `
        <li class="nav-item nav-item--dropdown ${isActive ? "is-active" : ""}">
          <a class="nav-dropdown-link" href="${item.href}">${item.label}</a>
          <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-label="Open ${item.label} menu">
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
          <ul class="nav-dropdown">
            ${item.children.map((child) => {
              const childPage = child.href.replace(".html", "");
              return `<li><a href="${child.href}" ${childPage === activePage ? 'class="is-active"' : ""}>${child.label}</a></li>`;
            }).join("")}
          </ul>
        </li>`;
    }

    const pageKey = item.href === "index.html" ? "welcome" : item.href.replace(".html", "");
    return `<li class="nav-item ${pageKey === activePage ? "is-active" : ""}"><a href="${item.href}">${item.label}</a></li>`;
  }).join("");

  return `
    <header class="site-header" data-header>
      <nav class="nav container" aria-label="Main navigation">
        <a class="logo" href="index.html">${LOGO_MARKUP}</a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
        <ul class="nav-links" id="nav-menu">
          ${links}
          <li class="nav-mobile-actions">
            <a class="btn btn-primary" href="tel:7044218778">Call 704-421-8778</a>
            <a class="btn btn-secondary" href="reservation-request.html">Request Reservation</a>
          </li>
        </ul>
        <div class="nav-overlay" data-nav-overlay hidden></div>
        <a class="nav-phone" href="tel:7044218778">704-421-8778</a>
      </nav>
    </header>`;
}

export function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <a class="logo" href="index.html">${LOGO_MARKUP}</a>
          <p>The Charlotte area's only mobile eFoil experience. Carving your way to an adventure like no other.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <ul>
            <li><a href="pricing.html">Pricing</a></li>
            <li><a href="flight-lessons.html">Flight Lessons</a></li>
            <li><a href="reservation-details.html">Reservation Details</a></li>
            <li><a href="reservation-request.html">Request a Reservation</a></li>
          </ul>
        </div>
        <div>
          <h3>More</h3>
          <ul>
            <li><a href="corporate.html">Corporate Outings</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div>
          <h3>Contact</h3>
          <ul>
            <li><a href="tel:7044218778">704-421-8778</a></li>
            <li><a href="mailto:hello@CharlotteEfoil.com">hello@CharlotteEfoil.com</a></li>
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
}

function initMobileActionBar() {
  if (document.querySelector("[data-mobile-bar]")) return;

  const bar = document.createElement("div");
  bar.className = "mobile-action-bar";
  bar.dataset.mobileBar = "";
  bar.setAttribute("aria-label", "Quick actions");
  bar.innerHTML = `
    <a class="mobile-action-bar__call" href="tel:7044218778">Call</a>
    <a class="mobile-action-bar__book" href="reservation-request.html">Book Now</a>
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

  document.querySelectorAll(".nav-dropdown-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      document.querySelectorAll(".nav-dropdown-toggle").forEach((other) => {
        if (other !== btn) {
          other.setAttribute("aria-expanded", "false");
          other.closest(".nav-item--dropdown")?.classList.remove("is-open");
        }
      });
      btn.setAttribute("aria-expanded", String(!expanded));
      btn.closest(".nav-item--dropdown")?.classList.toggle("is-open", !expanded);
    });
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

function initForms() {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      if (!form.checkValidity()) {
        if (status) {
          status.textContent = "Please complete all required fields.";
          status.classList.add("is-error");
        }
        form.reportValidity();
        return;
      }
      form.reset();
      if (status) {
        status.textContent = form.dataset.success || "Thanks for submitting! We'll be in touch soon.";
        status.classList.remove("is-error");
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
  const placeholder = document.querySelector("[data-video-placeholder]");
  if (!video) return;

  video.addEventListener("loadeddata", () => {
    video.classList.add("is-ready");
    placeholder?.classList.add("is-hidden");
  });

  video.addEventListener("error", () => {
    placeholder?.classList.remove("is-hidden");
  });

  if (video.readyState >= 2) {
    video.classList.add("is-ready");
    placeholder?.classList.add("is-hidden");
  }
}
