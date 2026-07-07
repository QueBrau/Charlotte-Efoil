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

export function initFlyerEditor(container, { hiddenInput, uploadFlyer } = {}) {
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
      uploadFile: async (files) => {
        const file = files?.[0];
        if (!file || !uploadFlyer) return { data: [] };
        const result = await uploadFlyer(file);
        if (!result?.url) return { data: [] };
        return { data: [{ src: result.url, type: "image" }] };
      },
    },
  });

  editor.setComponents(PLACEHOLDER_FLYER);

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
