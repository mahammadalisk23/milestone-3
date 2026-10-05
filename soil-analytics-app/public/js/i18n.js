/* Simple i18n loader for English / Hindi / Kannada */
const I18N = (() => {
  const SUPPORTED = ["en", "hi", "kn"];
  const VOICE_LANG = { en: "en-IN", hi: "hi-IN", kn: "kn-IN" };
  let current = "en";
  let dict = {};
  const cache = {};

  async function load(lang) {
    if (!SUPPORTED.includes(lang)) lang = "en";
    if (!cache[lang]) {
      const res = await fetch(`locales/${lang}.json`);
      cache[lang] = await res.json();
    }
    dict = cache[lang];
    current = lang;
    document.documentElement.lang = lang;
    applyToDOM();
  }

  function t(key) {
    return (dict && dict[key]) || key;
  }

  function applyToDOM() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      el.setAttribute("title", t(key));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.setAttribute("placeholder", t(key));
    });
    document.dispatchEvent(new CustomEvent("i18n:applied", { detail: { lang: current } }));
  }

  function getLang() { return current; }
  function getVoiceLang() { return VOICE_LANG[current] || "en-IN"; }

  return { load, t, getLang, getVoiceLang, SUPPORTED };
})();
