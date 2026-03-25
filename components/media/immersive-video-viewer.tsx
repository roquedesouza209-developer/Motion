"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type MouseEvent,
  type PointerEvent,
} from "react";

type MotionCapability = "unsupported" | "prompt" | "ready" | "denied";

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type ImmersiveHotspot = {
  id: string;
  title: string;
  detail?: string;
  yaw: number;
  pitch: number;
};

type ImmersiveVideoViewerProps = {
  src: string;
  hotspots?: ImmersiveHotspot[];
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  poster?: string;
  showHint?: boolean;
  showReset?: boolean;
  videoRef?: MutableRefObject<HTMLVideoElement | null>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stopEvent(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function isLandscapeOrientation() {
  if (typeof window === "undefined") {
    return false;
  }

  const angle = window.screen?.orientation?.angle;
  const normalizedAngle =
    typeof angle === "number" ? ((angle % 360) + 360) % 360 : 0;
  return normalizedAngle === 90 || normalizedAngle === 270;
}

function normalizeAngle(value: number) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function getCompassLabel(yaw: number) {
  const headings = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((yaw % 360) + 360) % 360;
  return headings[Math.round(normalized / 45) % headings.length] ?? "N";
}

export default function ImmersiveVideoViewer({
  src,
  hotspots = [],
  className = "",
  videoClassName = "",
  autoPlay = false,
  controls = true,
  loop = false,
  muted = false,
  playsInline = true,
  preload = "metadata",
  poster,
  showHint = true,
  showReset = true,
  videoRef,
}: ImmersiveVideoViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [manualYaw, setManualYaw] = useState(0);
  const [manualPitch, setManualPitch] = useState(0);
  const [gyroYaw, setGyroYaw] = useState(0);
  const [gyroPitch, setGyroPitch] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [motionCapability, setMotionCapability] = useState<MotionCapability>(() => {
    if (typeof window === "undefined" || !window.DeviceOrientationEvent) {
      return "unsupported";
    }

    const eventConstructor = window.DeviceOrientationEvent as
      | DeviceOrientationEventWithPermission
      | undefined;

    return typeof eventConstructor?.requestPermission === "function" ? "prompt" : "ready";
  });
  const [motionEnabled, setMotionEnabled] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    yaw: number;
    pitch: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const gyroBaselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const recalibrateGyroRef = useRef(false);
  const fallbackFullscreenRef = useRef(false);

  const immersiveOpen = nativeFullscreen || fallbackFullscreen;

  useEffect(() => {
    fallbackFullscreenRef.current = fallbackFullscreen;
  }, [fallbackFullscreen]);

  const disableMotionState = useCallback(() => {
    setMotionEnabled(false);
    setGyroYaw(0);
    setGyroPitch(0);
    gyroBaselineRef.current = null;
    recalibrateGyroRef.current = false;
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || !containerRef.current) {
      return;
    }

    const onFullscreenChange = () => {
      const fullscreenActive = document.fullscreenElement === containerRef.current;
      setNativeFullscreen(fullscreenActive);

      if (!fullscreenActive && !fallbackFullscreenRef.current) {
        disableMotionState();
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [disableMotionState]);

  useEffect(() => {
    if (!(motionEnabled && immersiveOpen) || typeof window === "undefined") {
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.beta !== "number" || typeof event.gamma !== "number") {
        return;
      }

      const beta = clamp(event.beta, -90, 90);
      const gamma = clamp(event.gamma, -90, 90);

      if (!gyroBaselineRef.current || recalibrateGyroRef.current) {
        gyroBaselineRef.current = { beta, gamma };
        recalibrateGyroRef.current = false;
        setGyroYaw(0);
        setGyroPitch(0);
        return;
      }

      const baseline = gyroBaselineRef.current;
      const landscape = isLandscapeOrientation();
      const yawSource = landscape ? beta - baseline.beta : gamma - baseline.gamma;
      const pitchSource = landscape ? -(gamma - baseline.gamma) : beta - baseline.beta;

      setGyroYaw(clamp(yawSource * 1.7, -64, 64));
      setGyroPitch(clamp(pitchSource * 0.85, -30, 30));
    };

    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [immersiveOpen, motionEnabled]);

  useEffect(() => {
    if (!motionEnabled || motionCapability !== "ready" || !immersiveOpen) {
      return;
    }

    recalibrateGyroRef.current = true;
  }, [immersiveOpen, motionCapability, motionEnabled]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        yaw: manualYaw,
        pitch: manualPitch,
      };
      suppressClickRef.current = false;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [manualPitch, manualYaw],
  );

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;

    if (!dragStart) {
      return;
    }

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      suppressClickRef.current = true;
    }

    setManualYaw(clamp(dragStart.yaw - deltaX * 0.24, -180, 180));
    setManualPitch(clamp(dragStart.pitch + deltaY * 0.14, -44, 44));
  }, []);

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) {
      return;
    }

    dragStartRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleClickCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) {
      return;
    }

    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const resetView = useCallback(() => {
    setManualYaw(0);
    setManualPitch(0);

    if (motionEnabled) {
      recalibrateGyroRef.current = true;
    } else {
      setGyroYaw(0);
      setGyroPitch(0);
    }
  }, [motionEnabled]);

  const requestMotion = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const eventConstructor = window.DeviceOrientationEvent as
      | DeviceOrientationEventWithPermission
      | undefined;

    if (!eventConstructor) {
      setMotionCapability("unsupported");
      return;
    }

    if (typeof eventConstructor.requestPermission === "function") {
      try {
        const result = await eventConstructor.requestPermission();
        if (result === "granted") {
          setMotionCapability("ready");
          recalibrateGyroRef.current = true;
          setMotionEnabled(true);
        } else {
          setMotionCapability("denied");
          setMotionEnabled(false);
        }
      } catch {
        setMotionCapability("denied");
        setMotionEnabled(false);
      }
      return;
    }

    recalibrateGyroRef.current = true;
    setMotionEnabled((current) => !current);
  }, []);

  const exitImmersiveMode = useCallback(async () => {
    if (typeof document !== "undefined" && document.fullscreenElement === containerRef.current) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    setFallbackFullscreen(false);
    disableMotionState();
  }, [disableMotionState]);

  const openImmersiveMode = useCallback(async () => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const requestFullscreen = container.requestFullscreen?.bind(container);

    if (requestFullscreen) {
      const entered = await requestFullscreen().then(
        () => true,
        () => false,
      );

      if (entered) {
        return;
      }
    }

    setFallbackFullscreen(true);
  }, []);

  const toggleImmersiveMode = useCallback(async () => {
    if (immersiveOpen) {
      await exitImmersiveMode();
      return;
    }

    await openImmersiveMode();
  }, [exitImmersiveMode, immersiveOpen, openImmersiveMode]);

  const yaw = manualYaw + gyroYaw;
  const pitch = manualPitch + gyroPitch;
  const compassLabel = getCompassLabel(yaw);

  const objectPosition = useMemo(() => {
    const x = clamp(50 + yaw / 3.6, 0, 100);
    const y = clamp(50 + pitch * 0.35, 18, 82);
    return `${x}% ${y}%`;
  }, [pitch, yaw]);

  const visibleHotspots = useMemo(
    () =>
      hotspots
        .map((hotspot) => {
          const deltaYaw = normalizeAngle(hotspot.yaw - yaw);
          const deltaPitch = hotspot.pitch - pitch;
          const visible = Math.abs(deltaYaw) <= 72 && Math.abs(deltaPitch) <= 42;

          if (!visible) {
            return null;
          }

          return {
            ...hotspot,
            left: clamp(50 + (deltaYaw / 72) * 42, 8, 92),
            top: clamp(50 + (deltaPitch / 42) * 34, 16, 84),
          };
        })
        .filter(
          (
            hotspot,
          ): hotspot is ImmersiveHotspot & { left: number; top: number } =>
            Boolean(hotspot),
        ),
    [hotspots, pitch, yaw],
  );

  const activeHotspot =
    hotspots.find((hotspot) => hotspot.id === activeHotspotId) ?? null;

  const containerClasses = [
    "group relative overflow-hidden bg-black select-none",
    immersiveOpen
      ? "z-[120] rounded-none"
      : "",
    fallbackFullscreen ? "fixed inset-0 h-screen w-screen" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const canShowMotionButton =
    immersiveOpen && (motionCapability === "prompt" || motionCapability === "ready");

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onClickCapture={handleClickCapture}
      style={{ touchAction: "none" }}
    >
      <video
        ref={(element) => {
          if (videoRef) {
            videoRef.current = element;
          }
        }}
        src={src}
        className={`h-full w-full object-cover transition-transform duration-150 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        } ${videoClassName}`}
        style={{
          objectPosition,
          transform: immersiveOpen ? "scale(2.05)" : "scale(1.85)",
          transformOrigin: "center center",
        }}
        autoPlay={autoPlay}
        controls={controls}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
        poster={poster}
      />

      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
        360
      </div>

      <div className="pointer-events-none absolute left-3 top-12 rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-white backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-full border border-white/20 bg-white/5">
            <div className="absolute inset-1 rounded-full border border-dashed border-white/10" />
            <div
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]"
              style={{
                left: `${clamp(50 + (yaw / 180) * 24, 12, 88)}%`,
                top: `${clamp(50 + (pitch / 45) * 18, 16, 84)}%`,
              }}
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Compass
            </p>
            <p className="text-xs font-semibold">
              {compassLabel} · {Math.round(yaw)}°
            </p>
          </div>
        </div>
      </div>

      <div className="absolute right-3 top-3 flex flex-wrap items-center justify-end gap-2">
        {showReset && (Math.abs(yaw) > 2 || Math.abs(pitch) > 2) ? (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              stopEvent(event);
              resetView();
            }}
            className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            Reset view
          </button>
        ) : null}

        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            stopEvent(event);
            void toggleImmersiveMode();
          }}
          className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          {immersiveOpen ? "Exit immersive" : "Enter immersive"}
        </button>
      </div>

      {showHint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
          {immersiveOpen ? "Drag or tilt to look around" : "Drag to look around"}
        </div>
      ) : null}

      {visibleHotspots.map((hotspot) => {
        const active = activeHotspotId === hotspot.id;

        return (
          <button
            key={hotspot.id}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              stopEvent(event);
              setActiveHotspotId((current) => (current === hotspot.id ? null : hotspot.id));
            }}
            className="absolute z-[1] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)] transition hover:scale-110"
            style={{ left: `${hotspot.left}%`, top: `${hotspot.top}%` }}
            aria-label={hotspot.title}
            title={hotspot.title}
          >
            <span
              className={`absolute inset-[-7px] rounded-full border border-cyan-200/40 ${
                active ? "animate-pulse" : ""
              }`}
            />
          </button>
        );
      })}

      {activeHotspot ? (
        <div className="absolute bottom-16 left-1/2 z-[2] w-[min(320px,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/60 p-4 text-white backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                Hotspot
              </p>
              <p className="mt-1 text-sm font-semibold">{activeHotspot.title}</p>
              {activeHotspot.detail ? (
                <p className="mt-2 text-xs leading-5 text-white/75">{activeHotspot.detail}</p>
              ) : null}
            </div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                stopEvent(event);
                setActiveHotspotId(null);
              }}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80 transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {canShowMotionButton ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            stopEvent(event);
            void requestMotion();
          }}
          className={`absolute bottom-3 right-3 rounded-full border px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm transition ${
            motionEnabled
              ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100"
              : "border-white/15 bg-black/45 text-white"
          }`}
        >
          {motionEnabled
            ? "Motion on"
            : motionCapability === "prompt"
              ? "Enable motion"
              : "Use device tilt"}
        </button>
      ) : null}

      {motionCapability === "denied" && immersiveOpen ? (
        <div className="absolute bottom-3 right-3 rounded-full border border-rose-300/30 bg-rose-400/15 px-3 py-1.5 text-[11px] font-semibold text-rose-100 backdrop-blur-sm">
          Motion permission denied
        </div>
      ) : null}
    </div>
  );
}
