/** Default site copy and media paths — source of truth for CMS + public fallbacks. */

export const CONTENT_SLUGS = ["global", "home", "about", "contact", "lessons", "reservations"];

export const CONTENT_PAGE_LABELS = {
  global: "Global",
  home: "Home page",
  about: "About page",
  contact: "Contact page",
  lessons: "How we operate",
  reservations: "Reservations page",
};

export const DEFAULT_SITE_CONTENT = {
  global: {
    phone: "704-421-8778",
    email: "hello@CharlotteEfoil.com",
    instagram_url: "https://www.instagram.com/charlotteefoil",
    instagram_handle: "@charlotteefoil",
    logo_src: "/photos/CharlotteEfoil.png",
    footer_tagline:
      "The Charlotte area's only mobile eFoil experience. Carving your way to an adventure like no other.",
    service_area: "Serving Lake Norman, Mountain Island Lake, Lake Wylie & beyond.",
    location_city: "Charlotte, NC",
  },
  home: {
    seo_description:
      "CharlotteEfoil. The Charlotte area's only mobile eFoil rental and lesson experience on Lake Norman, Lake Wylie, and beyond. Call 704-421-8778.",
    hero: {
      eyebrow: "Carving your way to an experience like no other",
      title: "Come fly with us over the water.",
      lead:
        "You can't buy happiness but you can rent it. Private eFoil lessons, family outings, and corporate adventures across the Charlotte lakes and beyond.",
      video_src: "/videos/hero-efoil.mp4",
      cta_primary_label: "Request a Reservation",
      cta_primary_href: "/reservation-request.html",
    },
    wave: {
      eyebrow: "Wave Hello",
      title: "The Charlotte area's only place to experience flight over water.",
      body:
        "Our goal is to make this unique experience accessible to everyone with low hourly lesson pricing, location adaptability, and expert guided instruction on top of the line Waydoo Flyer EVO products.",
      checklist: [
        "Low hourly lesson pricing",
        "Location adaptability",
        "Guided instruction",
        "Private lessons & full day family outings",
        "eFoil sales & purchase demonstrations",
      ],
      image_src: "/photos/lakenorman.jpg",
      image_alt: "Lake Norman shoreline",
      pricing_link_label: "View pricing →",
      pricing_link_href: "/reservation-request.html#pricing",
    },
    fleet_intro: {
      eyebrow: "Our Fleet",
      title: "Waydoo Flyer EVO boards built for every rider",
      body:
        "We ride the Waydoo Flyer EVO series, modular eFoils with Smart Flight Assistance, tuned for beginners, progression, and pure exhilaration.",
    },
    fleet: [
      {
        tag: "Beginner",
        title: "Flyer EVO Max Plus",
        body:
          "Stable, family friendly, and built for first flights. The 130L board delivers high buoyancy and smooth takeoffs with Smart Flight Assistance.",
        bullets: ["130L board for stability", "6000W propulsion", "Up to 135 min ride time"],
        image_src: "/photos/waydoo-evo-max-plus.webp",
        image_alt: "Waydoo Flyer EVO Max Plus eFoil board",
      },
      {
        tag: "All riders",
        title: "Flyer EVO Pro Plus",
        body:
          "Balanced control for every skill level. The 90L Pro Plus combines responsive handling with intelligent ride support for smooth progression.",
        bullets: ["90L board volume", "Smart Flight Assistance System", "Up to 32 mph top speed"],
        image_src: "/photos/waydoo-evo-pro-plus.webp",
        image_alt: "Waydoo Flyer EVO Pro Plus eFoil board",
      },
      {
        tag: "Progression",
        title: "Flyer EVO Lite",
        body:
          "Accessible and agile for riders building confidence. A lighter, more nimble platform that makes skill progression feel natural on the water.",
        bullets: ["90L lightweight board", "4000W propulsion", "Ideal for skill progression"],
        image_src: "/photos/waydoo-evo-lite.png",
        image_alt: "Waydoo Flyer EVO Lite eFoil board",
      },
    ],
    experiences_intro: {
      eyebrow: "Experiences",
      title: "Choose your adventure",
    },
    experiences: [
      {
        title: "Private Efoil Lessons",
        body: "90 minute one on one sessions with expert instruction through our 4 step learning process.",
        href: "/flight-lessons.html",
        link_label: "Learn how it works →",
      },
      {
        title: "Full Day Family Outings",
        body: "Morning and afternoon sessions, flexible scheduling, and up to 24 riders for weekend gatherings.",
        href: "/reservation-request.html",
        link_label: "See reservation details →",
      },
      {
        title: "Corporate Outings",
        body: "Half day and full day team experiences with pontoon support, lunch, and up to 5 eFoils.",
        href: "/reservation-request.html#corporate",
        link_label: "Explore corporate packages →",
      },
    ],
    locations: {
      eyebrow: "Where We Fly",
      title: "Serving Charlotte lakes & East Coast destinations",
      body:
        "Lake Norman, Mountain Island Lake, Lake Wylie, and other destinations per request. We travel up to 6 hours one way from Charlotte, NC including Hilton Head, Myrtle Beach, and Atlantic Ocean launches.",
      public_launch: "Public launch: Ramsey Creek Park, 18441 Nantz Rd, Cornelius, NC 28078",
      stats: [
        { value: "90+", label: "Minute sessions" },
        { value: "7", label: "Days a week" },
        { value: "6hr", label: "Travel radius" },
        { value: "Waydoo", label: "Flyer EVO fleet" },
      ],
    },
    cta: {
      eyebrow: "Ready to fly?",
      title: "We are committed to adventure. Are you?",
      primary_label: "Request a Reservation",
      primary_href: "/reservation-request.html",
      secondary_label: "Contact Us",
      secondary_href: "/contact.html",
    },
  },
  about: {
    hero: {
      eyebrow: "About Us",
      title: "Meet your flight crew.",
      lead: "Led by Daniel, we believe in safe family fun and are committed to you and yours.",
    },
    video_src: "/videos/dan.mov",
    quote: "Are you ready to fly?",
    quote_cite: "Daniel, Fearless Leader",
    heading: "Your fearless leader, Daniel",
    paragraphs: [
      "CharlotteEfoil is the only mobile eFoil rental business in the Charlotte area. We live, work, and play here. We're grateful for the responsibility of producing a safe, fun experience for everyone to enjoy.",
      "We look forward to this fun challenge and can't wait to see many of you out foiling. Carving a way to an experience like no other!",
    ],
    crew_name: "Daniel",
    crew_role: "Fearless Leader",
    cta_label: "Come Fly With Us",
    cta_href: "/reservation-request.html",
    banner_title: "We are committed to adventure. Are you?",
    banner_href: "/contact.html",
    banner_label: "Contact Us",
  },
  contact: {
    hero: {
      eyebrow: "Contact Us",
      title: "We love helping our customers.",
      lead: "Contact us with any questions or for more information. We're based in Charlotte, NC.",
    },
    location: "Charlotte, NC<br />Serving Lake Norman & surrounding areas",
    form_success: "Thanks! We'll be in touch soon.",
  },
  lessons: {
    hero: {
      eyebrow: "How We Operate",
      title: "Learn to fly.",
      lead:
        "How we teach every session. From equipment intro through four steps to get you foiling. Your safety is our priority.",
    },
    steps: [
      {
        label: "Step One",
        title: "Foiling from your stomach",
        body:
          "Glide on the board while lying flat, becoming comfortable with the hand control and moving across the water. Make turns slower then faster while building confidence. Your first experience of flight over water.",
      },
      {
        label: "Step Two",
        title: "Foiling from your knees",
        body:
          "Move from your stomach to kneeling on the board, continuing to build awareness of how the board, student, and hand controller work in unison.",
      },
      {
        label: "Step Three",
        title: "Foiling standing up",
        body:
          "A big step that's easily obtainable once you're comfortable with the hand control and balance. Take your time, stay in the moment, and you'll move quickly to the next level.",
      },
      {
        label: "Step Four",
        title: "Foiling",
        body:
          "As confidence builds, add power and adjust your weight and foot placement to truly FOIL, consistently flying over water for long periods. You've done it.",
      },
    ],
    safety_banner:
      "Life jackets and helmets are provided by CharlotteEfoil (or bring your own). All students must have the ability to swim. A waiver form must be signed before your first flight. We'll send it once we receive your reservation.",
    cta_title: "Ready for your first flight?",
  },
  reservations: {
    request: {
      eyebrow: "Reservation Request",
      title: "Request your reservation",
      lead:
        "Fill out the form and we'll contact you to schedule your lesson, demonstration, or event. This is a request, we'll confirm dates, locations, and details with you directly.",
    },
    pricing: [
      {
        title: "Private lesson",
        subtitle: "One student · ~90 minutes",
        price: "$150",
      },
      {
        title: "Second rider",
        subtitle: "Own board · ~90 minutes",
        price: "$100",
      },
      {
        title: "Group sessions",
        subtitle: "Up to 10 riders · instructor rotation",
        price_label: "Call for 3+",
      },
    ],
    pricing_note:
      "Destination trips and purchase demos available. Call 704-421-8778 for custom quotes.",
    corporate: {
      eyebrow: "Corporate Outings",
      title: "Carve your way to an experience like no other.",
      lead:
        "A full or half day company outing your group will talk about for years. Flying over water with your peers. CharlotteEfoil is redefining how teams come together.",
    },
    corporate_packages: [
      {
        title: "Full Day Experience",
        price: "$2,800",
        subtitle: "7 hours · Up to 10 participants",
        bullets: [
          "Pontoon adventure",
          "Lunch & beverages",
          "5 eFoils & up to 14 batteries",
          "Instructor guide & CharlotteEfoil swag",
        ],
      },
      {
        title: "Half Day Experience",
        price: "$2,400",
        subtitle: "4 hours · Up to 10 participants",
        bullets: ["Pontoon, lunch & beverages", "5 eFoils & up to 10 batteries", "Instructor guide"],
      },
      {
        title: "Half Day, 10 Riders",
        price: "$1,500",
        subtitle: "5 hours · Instructor, 5 eFoils, 14 batteries",
        bullets: [],
      },
      {
        title: "Half Day, 5 Riders",
        price: "$750",
        subtitle: "4 hours · Instructor, 5 eFoils, 10 batteries",
        bullets: [],
      },
    ],
  },
};

export function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === "object" ? deepMerge({}, item) : item
      );
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMerge(out[key] && typeof out[key] === "object" ? out[key] : {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function mergePageContent(slug, stored = {}) {
  const defaults = DEFAULT_SITE_CONTENT[slug];
  if (!defaults) return null;
  return deepMerge(structuredClone(defaults), stored);
}

export function resolveContentPath(obj, path) {
  if (!obj || !path) return undefined;
  let cur = obj;
  for (const part of String(path).split(".")) {
    if (cur == null) return undefined;
    if (/^\d+$/.test(part)) cur = cur[Number(part)];
    else cur = cur[part];
  }
  return cur;
}

export function isContentSlug(slug) {
  return CONTENT_SLUGS.includes(String(slug || "").trim());
}

/** Digits only — used for tel: links from the display phone field. */
export function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}
