import { useEffect, useRef } from "react";

/**
 * Anti-screenshot / anti-screen-recording hook.
 * Only apply for students & guests — never for admins/supervisors.
 */
export function useAntiScreenshot(enabled: boolean) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
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

    // ── 2. Black overlay ─────────────────────────────────────────────────────
    const overlay = document.createElement("div");
    overlay.id = "__exam_overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      background: "#000",
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
      <div style="font-size:14px;opacity:0.7;max-width:320px;line-height:1.8">
        عُدْ إلى هذه النافذة لمتابعة الاختبار.<br/>
        تصوير الشاشة أو التقاطها غير مسموح.
      </div>
    `;
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    const showOverlay = () => { overlay.style.display = "flex"; };
    const hideOverlay = () => { overlay.style.display = "none"; };

    // Flash black INSTANTLY — hides content before OS captures frame
    const flashBlack = () => {
      // visibility:hidden removes from render tree immediately (faster than opacity)
      document.body.style.visibility = "hidden";
      overlay.style.display = "flex";
      // Next animation frame: show overlay, restore body visibility
      requestAnimationFrame(() => {
        document.body.style.visibility = "visible";
        // Keep overlay visible for a moment then fade out
        setTimeout(hideOverlay, 2000);
      });
    };

    // ── 3. Visibility / focus events ─────────────────────────────────────────
    const onVisibility = () => { document.hidden ? showOverlay() : hideOverlay(); };
    const onBlur  = () => showOverlay();
    const onFocus = () => setTimeout(hideOverlay, 300);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur",  onBlur);
    window.addEventListener("focus", onFocus);

    // ── 4. Disable right-click, copy, drag, select ───────────────────────────
    const noCtxMenu = (e: MouseEvent)     => e.preventDefault();
    const noCopy    = (e: ClipboardEvent) => e.preventDefault();
    const noDrag    = (e: DragEvent)      => e.preventDefault();
    const noSelect  = (e: Event)          => { (e as any).returnValue = false; };
    document.addEventListener("contextmenu", noCtxMenu, true);
    document.addEventListener("copy",        noCopy,    true);
    document.addEventListener("cut",         noCopy,    true);
    document.addEventListener("dragstart",   noDrag,    true);
    document.addEventListener("selectstart", noSelect,  true);

    // ── 5. Block keyboard shortcuts ──────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      const { key, code, ctrlKey, metaKey, shiftKey } = e;

      // PrintScreen — flash black immediately
      if (code === "PrintScreen" || key === "PrintScreen") {
        e.preventDefault();
        flashBlack();
        return;
      }
      // Win+Shift+S / Ctrl+Shift+S
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
      // F12
      if (key === "F12") { e.preventDefault(); return; }
      // DevTools
      if ((ctrlKey || metaKey) && shiftKey && ["i","I","j","J"].includes(key)) {
        e.preventDefault(); return;
      }
      if ((ctrlKey || metaKey) && (key === "u" || key === "U") && !shiftKey) {
        e.preventDefault(); return;
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    // ── 6. Block getDisplayMedia (browser screen-share) ──────────────────────
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
      document.removeEventListener("contextmenu", noCtxMenu, true);
      document.removeEventListener("copy",        noCopy,    true);
      document.removeEventListener("cut",         noCopy,    true);
      document.removeEventListener("dragstart",   noDrag,    true);
      document.removeEventListener("selectstart", noSelect,  true);
      document.removeEventListener("keydown",     onKeyDown, true);
      document.body.classList.remove("__exam_active");
      document.body.style.visibility = "visible";
      if (document.head.contains(printStyle)) document.head.removeChild(printStyle);
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
      overlayRef.current = null;
      if (origGetDisplayMedia.current && navigator.mediaDevices) {
        (navigator.mediaDevices as any).getDisplayMedia = origGetDisplayMedia.current;
        origGetDisplayMedia.current = null;
      }
    };
  }, [enabled]);
}
