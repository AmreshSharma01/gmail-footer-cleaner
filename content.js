(function () {
  "use strict";

  // Markers to avoid re-hiding the same nodes over and over
  const MARK_ATTR = "data-gm-hidden";
  const PREV_STYLE_ATTR = "data-gm-prev-style";
  let obs;

  const hide = (el) => {
    if (!el || el.getAttribute(MARK_ATTR) === "1") return;
    el.setAttribute(MARK_ATTR, "1");
    // Remember previous inline style so we don't break layout if Gmail mutates
    const prev = el.getAttribute("style") || "";
    el.setAttribute(PREV_STYLE_ATTR, prev);
    el.style.display = "none";
  };

  // Try to be resilient to UI changes: check role + common class buckets
  const hideFooterBits = () => {
    const footer = document.querySelector('div[role="contentinfo"]');
    if (!footer) return;

    // Known Gmail footer buckets (may change occasionally)
    [".aeV", ".aeU", ".ae3"].forEach((sel) => {
      const el = footer.querySelector(sel);
      if (el) hide(el);
    });

    // Remove common text items (Terms, Privacy, Program Policies, storage meter)
    footer.querySelectorAll("a, span, div").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (!t) return;

      // Legal links
      if (/^(terms|privacy|program policies|details)$/i.test(t)) {
        hide(el);
        return;
      }
      // Storage: "0% of 15 GB" or "12.3 GB used"
      if (/\b\d+(\.\d+)?\s*%?\s*of\s*\d+(\.\d+)?\s*GB\b/i.test(t)) {
        hide(el);
        return;
      }
      if (/\bGB\s+used\b/i.test(t)) {
        hide(el);
        return;
      }
    });
  };

  const hideUpgradeAnywhere = () => {
    // Look for "Upgrade" by visible text or aria-label
    document.querySelectorAll("button, span, div, a").forEach((el) => {
      const txt = (el.textContent || "").trim();
      const aria = (el.getAttribute("aria-label") || "").trim();

      // Match exact "Upgrade" (case-insensitive); safer than partials
      if (/^upgrade$/i.test(txt) || /^upgrade$/i.test(aria)) {
        hide(el);
      }
    });
  };

  const apply = () => {
    hideFooterBits();
    hideUpgradeAnywhere();
  };

  // Apply once ASAP (idle is fine; DOM is heavy on Gmail)
  if ("requestIdleCallback" in window) {
    requestIdleCallback(apply, { timeout: 1000 });
  } else {
    setTimeout(apply, 0);
  }

  // Observe dynamic mutations (Gmail updates UI frequently)
  obs?.disconnect();
  obs = new MutationObserver(() => {
    // Avoid thrashing—batch into next frame
    requestAnimationFrame(apply);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // Re-assert when tab becomes visible (Gmail can re-render on visibility change)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) apply();
  });

  // Clean up if the page unloads (not strictly necessary but tidy)
  window.addEventListener("pagehide", () => {
    try {
      obs?.disconnect();
    } catch {}
  });
})();
