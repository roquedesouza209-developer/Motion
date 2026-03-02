"use client";

import { useEffect, useRef, useState } from "react";

export default function SplashScreen({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [phase, setPhase] = useState<"visible" | "leaving" | "hidden">("visible");
  const splashRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setPhase("leaving");
    }, 900);
    const hideTimer = window.setTimeout(() => {
      setPhase("hidden");
    }, 1450);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (phase === "hidden") {
      return;
    }

    const splashNode = splashRef.current;

    if (!splashNode || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    let frameId: number | null = null;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;

    const applyDepth = () => {
      const xRatio = pointerX / window.innerWidth - 0.5;
      const yRatio = pointerY / window.innerHeight - 0.5;

      splashNode.style.setProperty("--splash-scene-rotate-x", `${(-yRatio * 4).toFixed(2)}deg`);
      splashNode.style.setProperty("--splash-scene-rotate-y", `${(xRatio * 6).toFixed(2)}deg`);
      splashNode.style.setProperty("--splash-scene-shift-x", `${(xRatio * 12).toFixed(2)}px`);
      splashNode.style.setProperty("--splash-scene-shift-y", `${(yRatio * 10).toFixed(2)}px`);
      splashNode.style.setProperty("--splash-panel-rotate-x", `${(-yRatio * 3.4).toFixed(2)}deg`);
      splashNode.style.setProperty("--splash-panel-rotate-y", `${(xRatio * 5.2).toFixed(2)}deg`);
      splashNode.style.setProperty("--splash-panel-shift-x", `${(xRatio * -9).toFixed(2)}px`);
      splashNode.style.setProperty("--splash-panel-shift-y", `${(-12 + yRatio * -7).toFixed(2)}px`);
      splashNode.style.setProperty("--splash-glow-shift-x", `${(xRatio * 24).toFixed(2)}px`);
      splashNode.style.setProperty("--splash-glow-shift-y", `${(yRatio * 18).toFixed(2)}px`);
      frameId = null;
    };

    const scheduleDepth = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(applyDepth);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      scheduleDepth();
    };

    const resetDepth = () => {
      pointerX = window.innerWidth / 2;
      pointerY = window.innerHeight / 2;
      scheduleDepth();
    };

    resetDepth();
    window.addEventListener("pointermove", handlePointerMove);
    splashNode.addEventListener("pointerleave", resetDepth);
    window.addEventListener("blur", resetDepth);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      splashNode.removeEventListener("pointerleave", resetDepth);
      window.removeEventListener("blur", resetDepth);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [phase]);

  return (
    <>
      {children}
      {phase !== "hidden" ? (
        <div
          ref={splashRef}
          className={`motion-splash ${phase === "leaving" ? "is-leaving" : ""}`}
          aria-hidden="true"
        >
          <div className="motion-splash-scene">
            <div className="motion-splash-beam motion-splash-beam-left" />
            <div className="motion-splash-beam motion-splash-beam-right" />
            <div className="motion-splash-float-card motion-splash-float-card-left">
              <span className="motion-splash-float-pill" />
              <span className="motion-splash-float-line" />
              <span className="motion-splash-float-line motion-splash-float-line-short" />
            </div>
            <div className="motion-splash-float-card motion-splash-float-card-right">
              <span className="motion-splash-float-preview" />
              <span className="motion-splash-float-line" />
              <span className="motion-splash-float-line motion-splash-float-line-short" />
            </div>
            <div className="motion-splash-platform" />
          </div>
          <div className="motion-splash-panel">
            <div className="motion-splash-badge">MO</div>
            <div className="motion-splash-copy">
              <p className="motion-splash-kicker">Motion</p>
              <h1 className="motion-splash-title">Capture. Share. Discover.</h1>
              <p className="motion-splash-text">
                Loading your flow, cuts, moves, and threads.
              </p>
            </div>
            <div className="motion-splash-bar">
              <span className="motion-splash-bar-fill" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
