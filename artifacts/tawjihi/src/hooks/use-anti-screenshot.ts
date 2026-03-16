import { useEffect, useRef } from "react";

/**
 * Anti-screenshot / anti-screen-recording hook.
 * Only apply this on the exam page — not for admin users.
 *
 * Techniques used:
 * 1. Blur overlay when page loses focus (visibilitychange / blur)
 * 2. Disable right-click context menu
 * 3. Block common keyboard shortcuts (PrtScn, Ctrl+Shift+S, etc.)
 * 4. user-select: none on body during exam
 * 5. Print media query (blank page when printing)
 * 6. Screen sharing detection via mediaDevices
 */
export function useAntiScreenshot(enabled: boolean) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // ── 1. Inject print-block style ────────────────────────────────────────
    const printStyle = document.createElement("style");
    printStyle.id = "__exam_print_block";
    printStyle.textContent = `
      @media print {
        body > * { display: none !important; }
        body::after {
          content: "لا يمكن طباعة صفحة الامتحان";
          display: block !important;
          text-align: center;
          padding: 40px;
          font-size: 24px;
          font-family: sans-serif;
        }
      }
      body.__exam_active {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(printStyle);
    document.body.classList.add("__exam_active");

    // ── 2. Blur overlay element ────────────────────────────────────────────
    const overlay = document.createElement("div");
    overlay.id = "__exam_overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      background: "rgba(0,0,0,0.97)",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "16px",
      color: "#fff",
      fontFamily: "sans-serif",
      textAlign: "center",
      padding: "32px",
    });
    overlay.innerHTML = `
      <div style="font-size:48px">🔒</div>
      <div style="font-size:22px;font-weight:bold">الاختبار متوقف مؤقتاً</div>
      <div style="font-size:14px;opacity:0.75;max-width:320px;line-height:1.6">
        عُدْ إلى هذه النافذة لمتابعة الاختبار.<br/>
        التقاط الشاشة أثناء الاختبار غير مسموح.
      </div>
    `;
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    const showOverlay = () => { overlay.style.display = "flex"; };
    const hideOverlay = () => { overlay.style.display = "none"; };

    // ── 3. Visibility change ───────────────────────────────────────────────
    const onVisibility = () => {
      if (document.hidden) showOverlay();
      else hideOverlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ── 4. Window blur/focus ───────────────────────────────────────────────
    const onBlur = () => showOverlay();
    const onFocus = () => {
      setTimeout(hideOverlay, 300); // small delay to prevent flicker
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    // ── 5. Disable right-click ────────────────────────────────────────────
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", onContextMenu);

    // ── 6. Block keyboard screenshot shortcuts ────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      const { key, code, ctrlKey, metaKey, shiftKey, altKey } = e;

      // PrintScreen
      if (code === "PrintScreen" || key === "PrintScreen") {
        e.preventDefault();
        showOverlay();
        setTimeout(hideOverlay, 2000);
        return;
      }

      // Windows Snipping Tool: Win+Shift+S (we can't catch Win key, but Shift+S combos)
      // Ctrl+Shift+S (some OS)
      if ((ctrlKey || metaKey) && shiftKey && (key === "s" || key === "S")) {
        e.preventDefault();
        return;
      }

      // macOS: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5, Cmd+Shift+6
      if (metaKey && shiftKey && ["3", "4", "5", "6"].includes(key)) {
        e.preventDefault();
        return;
      }

      // Ctrl+C (copy)
      if ((ctrlKey || metaKey) && key === "c") {
        e.preventDefault();
        return;
      }

      // F12 DevTools
      if (key === "F12") {
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U (DevTools / view source)
      if ((ctrlKey || metaKey) && shiftKey && (key === "i" || key === "I" || key === "j" || key === "J")) {
        e.preventDefault();
        return;
      }
      if ((ctrlKey || metaKey) && (key === "u" || key === "U") && !shiftKey) {
        e.preventDefault();
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    // ── 7. Screen capture detection (getDisplayMedia) ─────────────────────
    let captureCheckInterval: ReturnType<typeof setInterval> | null = null;
    if (typeof navigator !== "undefined" && (navigator as any).mediaDevices) {
      // Patch getDisplayMedia to show warning
      const origGetDisplayMedia = (navigator.mediaDevices as any).getDisplayMedia?.bind(navigator.mediaDevices);
      if (origGetDisplayMedia) {
        (navigator.mediaDevices as any).getDisplayMedia = async (...args: any[]) => {
          showOverlay();
          setTimeout(hideOverlay, 3000);
          // Still call the original — we can't fully block it, but we can warn
          return origGetDisplayMedia(...args);
        };
      }
    }

    return () => {
      // Cleanup
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.classList.remove("__exam_active");
      document.head.removeChild(printStyle);
      document.body.removeChild(overlay);
      overlayRef.current = null;
      if (captureCheckInterval) clearInterval(captureCheckInterval);
    };
  }, [enabled]);
}
