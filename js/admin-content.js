import {
  CONTENT_SLUGS,
  CONTENT_PAGE_LABELS,
  DEFAULT_SITE_CONTENT,
  resolveContentPath,
} from "./site-content-schema.js";

const MEDIA_KEY_RE = /(_src$|^src$|logo|video|image|_url$)/i;
const MEDIA_EXT_RE = /\.(jpe?g|png|webp|gif|svg|mp4|webm|mov)(\?|$)/i;

function humanizeKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fieldType(key, value) {
  if (typeof value === "string" && (MEDIA_KEY_RE.test(key) || MEDIA_EXT_RE.test(value))) return "media";
  if (typeof value === "string" && value.length > 100) return "textarea";
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return "lines";
  if (Array.isArray(value) && value.every((v) => v && typeof v === "object")) return "repeater";
  if (value && typeof value === "object") return "group";
  return "text";
}

function setAtPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const idx = /^\d+$/.test(p) ? Number(p) : p;
    if (cur[idx] == null || typeof cur[idx] !== "object") {
      cur[idx] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    cur = cur[idx];
  }
  const last = parts[parts.length - 1];
  cur[/^\d+$/.test(last) ? Number(last) : last] = value;
}

function renderField(path, key, value, depth, esc) {
  const fullPath = path ? `${path}.${key}` : key;
  const type = fieldType(key, value);
  const label = humanizeKey(key);

  if (type === "group") {
    return `<fieldset class="cms-group" style="--depth:${depth}">
      <legend>${esc(label)}</legend>
      ${Object.entries(value)
        .map(([k, v]) => renderField(fullPath, k, v, depth + 1, esc))
        .join("")}
    </fieldset>`;
  }

  if (type === "repeater") {
    return `<div class="cms-repeater" data-cms-path="${esc(fullPath)}">
      <div class="cms-repeater-head"><h3>${esc(label)}</h3></div>
      ${value
        .map(
          (item, i) => `<details class="cms-card" open>
          <summary>${esc(label)} ${i + 1}</summary>
          ${Object.entries(item)
            .map(([k, v]) => renderField(`${fullPath}.${i}`, k, v, depth + 1, esc))
            .join("")}
        </details>`
        )
        .join("")}
    </div>`;
  }

  if (type === "lines") {
    const lines = value.join("\n");
    return `<label class="cms-field">
      <span>${esc(label)}</span>
      <textarea rows="${Math.min(8, value.length + 1)}" data-cms-input="${esc(fullPath)}" data-cms-lines="1">${esc(lines)}</textarea>
      <span class="cms-hint">One item per line</span>
    </label>`;
  }

  if (type === "media") {
    const preview = value
      ? `<img src="${esc(value)}" alt="" class="cms-media-preview" loading="lazy" />`
      : "";
    return `<label class="cms-field cms-field-media">
      <span>${esc(label)}</span>
      <div class="cms-media-row">
        <input type="text" data-cms-input="${esc(fullPath)}" value="${esc(value || "")}" />
        <button type="button" class="btn btn-ghost" data-cms-pick="${esc(fullPath)}">Choose…</button>
      </div>
      ${preview}
    </label>`;
  }

  if (type === "textarea") {
    return `<label class="cms-field">
      <span>${esc(label)}</span>
      <textarea rows="4" data-cms-input="${esc(fullPath)}">${esc(value || "")}</textarea>
    </label>`;
  }

  return `<label class="cms-field">
    <span>${esc(label)}</span>
    <input type="text" data-cms-input="${esc(fullPath)}" value="${esc(value || "")}" />
  </label>`;
}

export function initContentPanel(deps) {
  const { api, apiPost, fetchMediaLibrary, mediaDisplayUrl, esc, fmtDate } = deps;
  const root = document.querySelector("[data-content-panel]");
  const formMount = root?.querySelector("[data-content-form]");
  const statusEl = root?.querySelector("[data-content-status]");
  const picker = root?.querySelector("[data-cms-picker]");
  const pickerGrid = root?.querySelector("[data-cms-picker-grid]");
  if (!root || !formMount || !statusEl) return () => {};

  let currentSlug = "global";
  let draft = {};
  let dirty = false;
  let pickerTarget = null;

  function syncInputsFromDraft() {
    formMount.querySelectorAll("[data-cms-input]").forEach((input) => {
      const path = input.dataset.cmsInput;
      const val = resolveContentPath(draft, path);
      if (input.dataset.cmsLines) {
        input.value = Array.isArray(val) ? val.join("\n") : "";
      } else {
        input.value = val ?? "";
      }
      const wrap = input.closest(".cms-field-media");
      if (!wrap) return;
      let preview = wrap.querySelector(".cms-media-preview");
      if (input.value) {
        if (!preview) {
          preview = document.createElement("img");
          preview.className = "cms-media-preview";
          preview.alt = "";
          preview.loading = "lazy";
          wrap.appendChild(preview);
        }
        preview.src = input.value;
      } else if (preview) {
        preview.remove();
      }
    });
  }

  function renderForm() {
    const defaults = DEFAULT_SITE_CONTENT[currentSlug];
    formMount.innerHTML = Object.entries(defaults)
      .map(([key, value]) => renderField("", key, value, 0, esc))
      .join("");

    formMount.querySelectorAll("[data-cms-input]").forEach((input) => {
      input.addEventListener("input", onInput);
    });
    formMount.querySelectorAll("[data-cms-pick]").forEach((btn) => {
      btn.addEventListener("click", () => openPicker(btn.dataset.cmsPick));
    });
    syncInputsFromDraft();
  }

  function onInput(e) {
    const input = e.target;
    const path = input.dataset.cmsInput;
    let value = input.value;
    if (input.dataset.cmsLines) {
      value = value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    setAtPath(draft, path, value);
    dirty = true;
    statusEl.textContent = "Unsaved changes";

    const wrap = input.closest(".cms-field-media");
    if (!wrap) return;
    let preview = wrap.querySelector(".cms-media-preview");
    if (value) {
      if (!preview) {
        preview = document.createElement("img");
        preview.className = "cms-media-preview";
        preview.alt = "";
        wrap.appendChild(preview);
      }
      preview.src = value;
    } else if (preview) {
      preview.remove();
    }
  }

  async function loadSlug(slug) {
    currentSlug = slug;
    dirty = false;
    root.querySelectorAll("[data-content-page]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.contentPage === slug);
    });
    statusEl.textContent = "Loading…";
    const data = await api("get_site_content", { slug });
    draft = structuredClone(data.draft || DEFAULT_SITE_CONTENT[slug]);
    renderForm();
    const pub = data.published_at ? `Published ${fmtDate(data.published_at)}` : "Not published yet";
    const upd = data.updated_at ? ` · Saved ${fmtDate(data.updated_at)}` : "";
    statusEl.textContent = pub + upd;
  }

  async function saveDraft() {
    statusEl.textContent = "Saving draft…";
    const data = await apiPost("save_site_content", { slug: currentSlug, draft });
    draft = structuredClone(data.draft);
    dirty = false;
    statusEl.textContent = `Draft saved ${fmtDate(data.updated_at)}`;
  }

  async function publishDraft() {
    if (dirty) await saveDraft();
    statusEl.textContent = "Publishing…";
    const data = await apiPost("publish_site_content", { slug: currentSlug });
    dirty = false;
    statusEl.textContent = `Published ${fmtDate(data.published_at)}`;
  }

  function closePicker() {
    pickerTarget = null;
    picker?.classList.add("hidden");
  }

  function applyPickerSelection(url) {
    if (!pickerTarget || !url) return;
    const input = formMount.querySelector(`[data-cms-input="${pickerTarget}"]`);
    if (input) {
      input.value = url;
      setAtPath(draft, pickerTarget, url);
      dirty = true;
      statusEl.textContent = "Unsaved changes";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    closePicker();
  }

  async function openPicker(path) {
    pickerTarget = path;
    if (!picker || !pickerGrid) return;
    picker.classList.remove("hidden");
    pickerGrid.innerHTML = '<p class="muted">Loading media…</p>';
    const items = await fetchMediaLibrary();
    if (!items.length) {
      pickerGrid.innerHTML = '<p class="muted">No media found. Upload files in the Media library tab first.</p>';
      return;
    }
    pickerGrid.innerHTML = `<div class="cms-picker-grid">${items
      .map((item) => {
        const src = esc(mediaDisplayUrl(item));
        const thumb =
          item.kind === "video"
            ? `<div class="cms-picker-thumb cms-picker-thumb--video"><video src="${src}" muted playsinline preload="metadata"></video></div>`
            : `<img class="cms-picker-thumb" src="${src}" alt="" loading="lazy" />`;
        return `<button type="button" class="cms-picker-item" data-cms-pick-url="${esc(item.url || src)}">
          ${thumb}
          <span>${esc(item.name || item.original_filename || "Untitled")}</span>
        </button>`;
      })
      .join("")}</div>`;
    pickerGrid.querySelectorAll("[data-cms-pick-url]").forEach((btn) => {
      btn.addEventListener("click", () => applyPickerSelection(btn.dataset.cmsPickUrl));
    });
  }

  root.querySelectorAll("[data-content-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slug = btn.dataset.contentPage;
      if (slug === currentSlug) return;
      if (dirty && !window.confirm("Discard unsaved changes?")) return;
      loadSlug(slug);
    });
  });

  root.querySelector("[data-content-save]")?.addEventListener("click", () => saveDraft().catch(onError));
  root.querySelector("[data-content-publish]")?.addEventListener("click", () => publishDraft().catch(onError));
  picker?.querySelector("[data-cms-picker-close]")?.addEventListener("click", closePicker);
  picker?.addEventListener("click", (e) => {
    if (e.target === picker) closePicker();
  });

  function onError(err) {
    if (err?.code === 401) return;
    alert(err?.message || "Could not save content.");
  }

  return () => loadSlug("global");
}

export { CONTENT_SLUGS, CONTENT_PAGE_LABELS };
