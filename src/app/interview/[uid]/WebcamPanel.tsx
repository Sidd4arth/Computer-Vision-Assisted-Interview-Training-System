"use client";

import { useEffect, useRef, useState } from "react";

interface WebcamEvent {
  timestamp: number;
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
}

interface WebcamPanelProps {
  isStarted: boolean;
  onEventsUpdate: (events: WebcamEvent[]) => void;
  onWarning: (msg: string, severity: "low" | "medium" | "high", type: string) => void;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

export default function WebcamPanel({ isStarted, onEventsUpdate, onWarning }: WebcamPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const eventsRef = useRef<WebcamEvent[]>([]);

  const [camStatus, setCamStatus] = useState<"off" | "requesting" | "live" | "denied" | "unavailable">("off");
  const [simTime, setSimTime] = useState(0);

  const cameraRef = useRef<any>(null);
  const poseRef = useRef<any>(null);

  // Warning throttle storage
  const lastWarningTimes = useRef<Record<string, number>>({});
  
  // Consecutive frame counters to avoid false positives
  const noFaceFrames = useRef(0);
  const slouchFrames = useRef(0);
  const tiltFrames = useRef(0);
  const lookAwayFrames = useRef(0);
  const handMoveFrames = useRef(0);
  
  // Keep track of previous wrist positions to calculate velocity
  const prevLeftWrist = useRef<{ x: number; y: number } | null>(null);
  const prevRightWrist = useRef<{ x: number; y: number } | null>(null);

  const triggerWarning = (type: string, message: string, severity: "low" | "medium" | "high") => {
    const now = Date.now();
    const lastTime = lastWarningTimes.current[type] || 0;
    if (now - lastTime < 10000) return; // 10-second throttle per warning type

    // Avoid firing warnings too close to each other overall (e.g. within 3 seconds)
    const lastAnyTime = Math.max(0, ...Object.values(lastWarningTimes.current));
    if (now - lastAnyTime < 3500) return;

    lastWarningTimes.current[type] = now;

    const evt: WebcamEvent = { timestamp: now, type, message, severity };
    eventsRef.current = [...eventsRef.current, evt];
    onEventsUpdate(eventsRef.current);
    onWarning(message, severity, type);
  };

  const onPoseResults = (results: any) => {
    const landmarks = results.poseLandmarks;

    if (!landmarks || landmarks.length === 0) {
      noFaceFrames.current = Math.min(50, noFaceFrames.current + 1);
      if (noFaceFrames.current >= 20) { // ~1s
        triggerWarning("no_face", "No face detected", "high");
        noFaceFrames.current = 0;
      }
      return;
    }

    const nose = landmarks[0];
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    // 1. Face visibility check
    const faceVisible = nose.visibility > 0.5 && leftEye.visibility > 0.5 && rightEye.visibility > 0.5;
    if (!faceVisible) {
      noFaceFrames.current = Math.min(50, noFaceFrames.current + 1);
      if (noFaceFrames.current >= 20) {
        triggerWarning("no_face", "No face detected", "high");
        noFaceFrames.current = 0;
      }
      return;
    } else {
      noFaceFrames.current = Math.max(0, noFaceFrames.current - 1);
    }

    // 2. Slouching check (nose vertically too close to shoulder center relative to shoulder width)
    const shoulderWidth = Math.sqrt(
      Math.pow(leftShoulder.x - rightShoulder.x, 2) + 
      Math.pow(leftShoulder.y - rightShoulder.y, 2)
    );
    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
    const noseToShoulderVert = shoulderCenterY - nose.y;
    const slouchRatio = noseToShoulderVert / (shoulderWidth || 0.001);

    if (slouchRatio < 0.65) {
      slouchFrames.current = Math.min(50, slouchFrames.current + 1);
      if (slouchFrames.current >= 20) { // ~1s
        triggerWarning("slouching", "Slouching detected - sit upright", "medium");
        slouchFrames.current = 0;
      }
    } else {
      slouchFrames.current = Math.max(0, slouchFrames.current - 2);
    }

    // 3. Posture tilt check
    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y) / (shoulderWidth || 0.001);
    if (shoulderTilt > 0.10) {
      tiltFrames.current = Math.min(50, tiltFrames.current + 1);
      if (tiltFrames.current >= 20) { // ~1s
        triggerWarning("bad_posture", "Poor posture - keep shoulders level", "low");
        tiltFrames.current = 0;
      }
    } else {
      tiltFrames.current = Math.max(0, tiltFrames.current - 2);
    }

    // 4. Looking away check (head rotation symmetry)
    const leftDist = Math.abs(nose.x - leftEar.x);
    const rightDist = Math.abs(nose.x - rightEar.x);
    const earRatio = leftDist / (rightDist || 0.0001);

    if (earRatio < 0.6 || earRatio > 1.6) {
      lookAwayFrames.current = Math.min(50, lookAwayFrames.current + 1);
      if (lookAwayFrames.current >= 15) { // ~0.75s
        triggerWarning("looking_away", "Eyes off screen / Distracted", "medium");
        lookAwayFrames.current = 0;
      }
    } else {
      lookAwayFrames.current = Math.max(0, lookAwayFrames.current - 2);
    }

    // 5. Hand movement/Excessive movement check
    let handMovementTriggered = false;
    
    // Check raised hands near or above shoulders
    if (leftWrist.visibility > 0.5 && leftWrist.y < leftShoulder.y) {
      handMovementTriggered = true;
    }
    if (rightWrist.visibility > 0.5 && rightWrist.y < rightShoulder.y) {
      handMovementTriggered = true;
    }

    // Check high velocity
    if (prevLeftWrist.current && leftWrist.visibility > 0.5) {
      const velL = Math.sqrt(
        Math.pow(leftWrist.x - prevLeftWrist.current.x, 2) +
        Math.pow(leftWrist.y - prevLeftWrist.current.y, 2)
      );
      if (velL > 0.04) handMovementTriggered = true;
    }
    if (prevRightWrist.current && rightWrist.visibility > 0.5) {
      const velR = Math.sqrt(
        Math.pow(rightWrist.x - prevRightWrist.current.x, 2) +
        Math.pow(rightWrist.y - prevRightWrist.current.y, 2)
      );
      if (velR > 0.04) handMovementTriggered = true;
    }

    prevLeftWrist.current = { x: leftWrist.x, y: leftWrist.y };
    prevRightWrist.current = { x: rightWrist.x, y: rightWrist.y };

    if (handMovementTriggered) {
      handMoveFrames.current = Math.min(50, handMoveFrames.current + 1);
      if (handMoveFrames.current >= 15) { // ~0.75s
        triggerWarning("head_movement", "Excessive hand/body movement", "low");
        handMoveFrames.current = 0;
      }
    } else {
      handMoveFrames.current = Math.max(0, handMoveFrames.current - 2);
    }

    // Diagnostic console logging (only occasionally to prevent browser log-lag)
    if (process.env.NODE_ENV !== "production" && Math.random() < 0.01) {
      console.log("[MediaPipe Diagnostic]", {
        slouchRatio: slouchRatio.toFixed(2),
        shoulderTilt: shoulderTilt.toFixed(2),
        earRatio: earRatio.toFixed(2),
        noFaceFrames: noFaceFrames.current,
        slouchFrames: slouchFrames.current,
        lookAwayFrames: lookAwayFrames.current,
        handMoveFrames: handMoveFrames.current
      });
    }
  };

  useEffect(() => {
    if (!isStarted) return;

    let active = true;

    async function initMediaPipe() {
      setCamStatus("requesting");
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js");

        if (!active) return;

        const video = videoRef.current;
        if (!video) return;

        const pose = new (window as any).Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults(onPoseResults);
        poseRef.current = pose;

        const camera = new (window as any).Camera(video, {
          onFrame: async () => {
            if (video && active) {
              await pose.send({ image: video });
            }
          },
          width: 320,
          height: 240,
        });

        await camera.start();
        cameraRef.current = camera;
        setCamStatus("live");
      } catch (err) {
        console.error("MediaPipe camera initialization failed:", err);
        setCamStatus("unavailable");
      }
    }

    initMediaPipe();

    return () => {
      active = false;
      if (cameraRef.current) {
        try { cameraRef.current.stop(); } catch {}
      }
      if (poseRef.current) {
        try { poseRef.current.close(); } catch {}
      }
    };
  }, [isStarted]);

  // Canvas simulation (runs only when camera is not live or starts up)
  useEffect(() => {
    if (!isStarted || camStatus === "live") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const draw = () => {
      frame++;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      const breathe = Math.sin(frame * 0.03) * 2;
      const sway = Math.sin(frame * 0.015) * 3;
      const cx = w / 2 + sway, cy = h / 2 + breathe - 10;

      // Body
      ctx.beginPath();
      ctx.ellipse(cx, cy + 65, 55, 30, 0, Math.PI, 0, true);
      ctx.fillStyle = "#1a1a1a";
      ctx.fill();

      // Neck
      ctx.fillStyle = "#262626";
      ctx.fillRect(cx - 8, cy + 28, 16, 12);

      // Head
      ctx.beginPath();
      ctx.ellipse(cx, cy, 28, 32, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#262626";
      ctx.fill();

      // Eyes
      const blink = frame % 180 < 5 ? 1 : 4;
      ctx.beginPath();
      ctx.ellipse(cx - 10, cy - 4, 3, blink, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#555";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 10, cy - 4, 3, blink, 0, 0, Math.PI * 2);
      ctx.fill();

      // Scan line
      const scanY = (frame * 2) % h;
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();

      // SIM label
      ctx.fillStyle = "#333";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText("SIM", w - 8, 14);

      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isStarted, camStatus]);

  useEffect(() => {
    if (!isStarted) return;
    const id = setInterval(() => setSimTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isStarted]);

  if (!isStarted) return null;

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col">
      <div className="relative bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)", display: camStatus === "live" ? "block" : "none" }} />
        <canvas ref={canvasRef} width={320} height={240}
          className="absolute inset-0 w-full h-full"
          style={{ display: camStatus === "live" ? "none" : "block" }} />
        <div className="absolute top-2 left-2">
          <span className="font-mono text-[9px] text-neutral-600 bg-black/40 px-1.5 py-0.5 rounded">
            {camStatus === "live" ? "LIVE" : "SIM"} · {fmt(simTime)}
          </span>
        </div>
      </div>
      {(camStatus === "denied" || camStatus === "unavailable") && (
        <button onClick={() => setCamStatus("off")} className="mt-1.5 font-mono text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors">
          retry camera
        </button>
      )}
    </div>
  );
}
