import { useEffect, useRef } from "react";

/**
 * Anti-screenshot / anti-screen-recording hook.
 * Only apply for students & guests — never for admins/supervisors.
 *
 * Techniques:
 * 1.  Floating watermark with user identity (traceable screenshots)
 * 2.  Blank-screen flash on PrintScreen key (content hidden before OS captures)
 * 3.  Blur overlay when window loses focus / tab switches
 * 4.  Block getDisplayMedia entirely (browser screen-share rejected)
 * 5.  Disable right-click, text selection, copy, drag
 * 6.  Block common keyboard shortcuts (PrtScn, Ctrl+Shift+S, etc.)
 * 7.  Print-block CSS
 */
export function useAntiScreenshot(enabled: boolean, watermark?: string) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const wmRef = useRef<HTMLDivElement | null>(null);
  const origGetDisplayMedia = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // ── 1. Print-block + user-select CSS ────────────────────────────────────
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
      body.__exam_active * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(printStyle);
    document.body.classList.add("__exam_active");

    // ── 2. Watermark overlay ─────────────────────────────────────────────────
    const wm = document.createElement("div");
    wm.id = "__exam_watermark";
    const wmText = watermark || "امتحانات توجيهي";
    const tile = `<span style="display:inline-block;margin:28px 40px;white-space:nowrap">${wmText}</span>`;
    wm.innerHTML = tile.repeat(120);
    Object.assign(wm.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99990",
      pointerEvents: "none",
      overflow: "hidden",
      display: "flex",
      flexWrap: "wrap",
      alignContent: "flex-start",
      opacity: "0.055",
      color: "#000",
      fontSize: "13px",
      fontFamily: "sans-serif",
      fontWeight: "600",
      transform: "rotate(-30deg) scale(1.4)",
      transformOrigin: "center center",
      userSelect: "none",
    });
    document.body.appendChild(wm);
    wmRef.current = wm;

    // ── 3. Black blur overlay (focus-loss / screenshot) ──────────────────────
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
      <div style="font-size:52px">🔒</div>
      <div style="font-size:24px;font-weight:bold">الاختبار محمي</div>
      <div style="font-size:14px;opacity:0.75;max-width:340px;line-height:1.8">
        عُدْ إلى هذه النافذة لمتابعة الاختبار.<br/>
        تصوير الشاشة أو التقاطها غير مسموح.<br/>
        <span style="font-size:12px;opacity:0.6">${wmText}</span>
      </div>
    `;
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    const showOverlay = () => { overlay.style.display = "flex"; };
    const hideOverlay = () => { overlay.style.display = "none"; };

    // Helper: flash screen black for ~300ms to defeat OS screenshot timing
    const flashBlack = () => {
      document.body.style.opacity = "0";
      showOverlay();
      setTimeout(() => {
        document.body.style.opacity = "1";
        setTimeout(hideOverlay, 1800);
      }, 300);
    };

    // ── 4. Visibility / focus events ─────────────────────────────────────────
    const onVisibility = () => { document.hidden ? showOverlay() : hideOverlay(); };
    const onBlur  = () => showOverlay();
    const onFocus = () => setTimeout(hideOverlay, 300);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur",  onBlur);
    window.addEventListener("focus", onFocus);

    // ── 5. Disable right-click, copy, drag ──────────────────────────────────
    const noCtxMenu   = (e: MouseEvent)    => e.preventDefault();
    const noCopy      = (e: ClipboardEvent) => e.preventDefault();
    const noDrag      = (e: DragEvent)     => e.preventDefault();
    const noSelect    = (e: Event)         => { (e as any).returnValue = false; };
    document.addEventListener("contextmenu",    noCtxMenu,  true);
    document.addEventListener("copy",           noCopy,     true);
    document.addEventListener("cut",            noCopy,     true);
    document.addEventListener("dragstart",      noDrag,     true);
    document.addEventListener("selectstart",    noSelect,   true);

    // ── 6. Block keyboard shortcuts ──────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      const { key, code, ctrlKey, metaKey, shiftKey } = e;

      // PrintScreen — flash black before OS captures
      if (code === "PrintScreen" || key === "PrintScreen") {
        e.preventDefault();
        flashBlack();
        return;
      }

      // Win+Shift+S / Ctrl+Shift+S (snipping tools)
      if ((ctrlKey || metaKey) && shiftKey && (key === "s" || key === "S")) {
        e.preventDefault(); flashBlack(); return;
      }

      // macOS: Cmd+Shift+3/4/5/6
      if (metaKey && shiftKey && ["3","4","5","6"].includes(key)) {
        e.preventDefault(); flashBlack(); return;
      }

      // Ctrl+C / Cmd+C
      if ((ctrlKey || metaKey) && (key === "c" || key === "C") && !shiftKey) {
        e.preventDefault(); return;
      }

      // F12 / DevTools
      if (key === "F12") { e.preventDefault(); return; }

      // Ctrl+Shift+I / J / U
      if ((ctrlKey || metaKey) && shiftKey &&
          ["i","I","j","J"].includes(key)) { e.preventDefault(); return; }
      if ((ctrlKey || metaKey) && (key === "u" || key === "U") && !shiftKey) {
        e.preventDefault(); return;
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    // ── 7. Block getDisplayMedia (browser screen-share) ──────────────────────
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
      origGetDisplayMedia.current = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      (navigator.mediaDevices as any).getDisplayMedia = async () => {
        showOverlay();
        throw new DOMException("Screen capture is not allowed during the exam.", "NotAllowedError");
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur",  onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("contextmenu",    noCtxMenu,  true);
      document.removeEventListener("copy",           noCopy,     true);
      document.removeEventListener("cut",            noCopy,     true);
      document.removeEventListener("dragstart",      noDrag,     true);
      document.removeEventListener("selectstart",    noSelect,   true);
      document.removeEventListener("keydown",        onKeyDown,  true);
      document.body.classList.remove("__exam_active");
      document.body.style.opacity = "1";
      if (document.head.contains(printStyle)) document.head.removeChild(printStyle);
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
      if (document.body.contains(wm)) document.body.removeChild(wm);
      overlayRef.current = null;
      wmRef.current = null;
      // Restore original getDisplayMedia
      if (origGetDisplayMedia.current && navigator.mediaDevices) {
        (navigator.mediaDevices as any).getDisplayMedia = origGetDisplayMedia.current;
        origGetDisplayMedia.current = null;
      }
    };
  }, [enabled, watermark]);
}
