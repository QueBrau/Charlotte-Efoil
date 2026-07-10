import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import newsletterPlugin from "grapesjs-preset-newsletter";

const editors = new WeakMap();

const PLACEHOLDER_FLYER =
  '<table width="100%"><tr><td style="padding:28px 16px;text-align:center;color:#8a9aa3;font-family:system-ui,Arial,sans-serif;font-size:14px">Optional — drag blocks from the left panel to design a flyer</td></tr></table>';

function hasFlyerContent(html) {
  const stripped = String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  if (!stripped) return false;
  if (/optional — drag blocks from the left panel/i.test(stripped)) return false;
  return true;
}

function grapesAssetType(item) {
  if (item.kind === "video" || String(item.content_type || "").startsWith("video/")) return "video";
  return "image";
}

export function mediaToGrapesAssets(items = []) {
  return items
    .filter((item) => item?.url)
    .map((item) => ({
      type: grapesAssetType(item),
      src: item.url,
      name: item.name || item.original_filename || "Media",
      height: item.kind === "video" ? 120 : 80,
      width: item.kind === "video" ? 200 : 120,
    }));
}

export function getFlyerHtml(editor) {
  if (!editor) return "";
  try {
    const html = editor.runCommand("gjs-get-inlined-html");
    return hasFlyerContent(html) ? String(html).trim() : "";
  } catch {
    const html = editor.getHtml();
    const css = editor.getCss();
    const combined = css ? `<style>${css}</style>${html}` : html;
    return hasFlyerContent(combined) ? combined.trim() : "";
  }
}

export function getFlyerEditor(container) {
  return editors.get(container) || null;
}

export function setFlyerAssets(container, items = []) {
  const editor = editors.get(container);
  if (!editor) return;
  const assets = mediaToGrapesAssets(items);
  const manager = editor.AssetManager;
  manager.getAll().reset(assets);
}

export function addFlyerAssets(container, items = []) {
  const editor = editors.get(container);
  if (!editor) return;
  const assets = mediaToGrapesAssets(items);
  if (assets.length) editor.AssetManager.add(assets);
}

export async function initFlyerEditor(container, { hiddenInput, uploadFlyer, loadAssets } = {}) {
  if (!container || editors.has(container)) return editors.get(container);

  const editor = grapesjs.init({
    container,
    height: "440px",
    width: "auto",
    storageManager: false,
    fromElement: false,
    noticeOnUnload: false,
    plugins: [newsletterPlugin],
    pluginsOpts: {
      [newsletterPlugin]: {
        inlineCss: true,
      },
    },
    assetManager: {
      autoAdd: true,
      upload: false,
      uploadFile: async (files) => {
        const file = files?.[0];
        if (!file || !uploadFlyer) return { data: [] };
        const result = await uploadFlyer(file);
        if (!result?.url) return { data: [] };
        const item = result.item || result;
        const assets = mediaToGrapesAssets([item]);
        return { data: assets };
      },
    },
  });

  editor.setComponents(PLACEHOLDER_FLYER);

  if (loadAssets) {
    try {
      const items = await loadAssets();
      setFlyerAssets(container, items);
    } catch (err) {
      console.warn("flyer assets load failed:", err);
    }
  }

  const sync = () => {
    if (hiddenInput) hiddenInput.value = getFlyerHtml(editor);
  };

  editor.on("update", sync);
  editor.on("component:add", sync);
  editor.on("component:remove", sync);

  editors.set(container, editor);
  return editor;
}

export function syncFlyerInput(container, hiddenInput) {
  const editor = editors.get(container);
  if (hiddenInput) hiddenInput.value = getFlyerHtml(editor);
}

export function clearFlyerEditor(container, hiddenInput) {
  const editor = editors.get(container);
  if (editor) {
    editor.setComponents(PLACEHOLDER_FLYER);
    editor.setStyle("");
  }
  if (hiddenInput) hiddenInput.value = "";
}

export function loadFlyerEditor(container, html, hiddenInput) {
  const editor = editors.get(container);
  if (!editor) return;
  if (html && html.trim()) {
    editor.setComponents(html);
  } else {
    editor.setComponents(PLACEHOLDER_FLYER);
  }
  if (hiddenInput) hiddenInput.value = getFlyerHtml(editor);
}
