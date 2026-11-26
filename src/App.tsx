import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { AuthScreen } from './components/AuthScreen';
import { CameraGuidesView } from './components/CameraGuidesView';
import { ExerciseAnglesGuideView, type GuideExerciseId } from './components/ExerciseAnglesGuideView';
import { CookieBanner, type CookieConsentState } from './components/CookieBanner';
import { LegalDocsModal, type LegalDocTab } from './components/LegalDocsModal';
import { TesterFeedbackPanel } from './components/TesterFeedbackPanel';
import {
  EXERCISES,
  getExerciseConfig,
  hasVisibleJoints,
  getTripletAngleSafe,
  extractExerciseAngleValue,
  computeRomPercent,
  analyzeExerciseGeometry,
  validateExerciseMotionAndPose,
  type ExerciseId,
  type ExerciseConfig,
  type AnalysisResult,
} from './biomechanicsEngine';
import { requestGeminiCoachAnalysis } from './geminiCoach';
import { logUserActivity } from './utils/activityLogger';

type Exercise = ExerciseId;

type PlanType = 'none' | 'trial' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
type PaidPlanType = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

type PlaybackSpeed = 1 | 0.5 | 0.25;

interface TimedLandmarkFrame {
  timeSec: number;
  landmarks: any[];
}

interface TimedTelemetryPoint {
  timeSec: number;
  angleDeg: number | null;
  romQuality: number;
  powerScore: number;
  angularSpeedDegSec: number;
  leftAngleDeg: number | null;
  rightAngleDeg: number | null;
  symmetryDiffDeg: number | null;
  torsoTiltDeg: number | null;
}

interface VideoMismatchAlert {
  title: string;
  message: string;
  detectedSubject?: string;
}

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const REPLAY_SPEEDS: PlaybackSpeed[] = [1, 0.5, 0.25];

const FALLBACK_EXERCISE_CONFIG: ExerciseConfig = {
  id: 'affondi' as Exercise,
  label: 'Affondi',
  imagePath: '/images/logo_icon.png',
  viewHint: 'Inquadratura laterale a figura intera',
  isDumbbell: false,
  isTrialAllowed: true,
  mode: 'extension_flexion',
  romMinAngle: 70,
  romMaxAngle: 155,
  primaryTriplet: {
    left: [23, 25, 27],
    right: [24, 26, 28],
  },
};

function captureKeyFrameDataUrl(
  video: HTMLVideoElement,
  maxWidth = 320,
  quality = 0.55
): string | null {
  try {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const w = Math.max(64, Math.round(video.videoWidth * scale));
    const h = Math.max(64, Math.round(video.videoHeight * scale));
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return null;
    tCtx.drawImage(video, 0, 0, w, h);
    return tempCanvas.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}

function getWorkingAngleTriplets(
  exercise: Exercise
): Array<{ label: string; triplet: [number, number, number]; fill: string; stroke: string }> {
  const cfg = getExerciseConfig(exercise);
  return [
    { label: 'SX', triplet: cfg.primaryTriplet.left, fill: 'rgba(250, 204, 21, 0.34)', stroke: '#facc15' },
    { label: 'DX', triplet: cfg.primaryTriplet.right, fill: 'rgba(56, 189, 248, 0.34)', stroke: '#38bdf8' },
  ];
}

function drawWorkingAngleSectors(
  ctx: CanvasRenderingContext2D,
  exercise: Exercise,
  landmarks: any[],
  width: number,
  height: number
) {
  if (!landmarks || !landmarks.length) return;

  const isDrawable = (lm: any) =>
    lm && isFinite(lm.x) && isFinite(lm.y) && (lm.visibility ?? 1) > 0.25;

  const triplets = getWorkingAngleTriplets(exercise);
  const sectorRadius = Math.max(22, Math.min(44, Math.round(Math.min(width, height) * 0.085)));

  ctx.save();
  for (const item of triplets) {
    const [idxA, idxB, idxC] = item.triplet;
    const pA = landmarks[idxA];
    const pB = landmarks[idxB];
    const pC = landmarks[idxC];
    if (!isDrawable(pA) || !isDrawable(pB) || !isDrawable(pC)) continue;

    const ax = pA.x * width;
    const ay = pA.y * height;
    const bx = pB.x * width;
    const by = pB.y * height;
    const cx = pC.x * width;
    const cy = pC.y * height;

    const startAngle = Math.atan2(ay - by, ax - bx);
    const endAngle = Math.atan2(cy - by, cx - bx);

    let delta = endAngle - startAngle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;

    const anticlockwise = delta < 0;
    const degValue = Math.round((Math.abs(delta) * 180) / Math.PI);

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.arc(bx, by, sectorRadius, startAngle, endAngle, anticlockwise);
    ctx.closePath();
    ctx.fillStyle = item.fill;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = item.stroke;
    ctx.stroke();

    const midAngle = startAngle + delta * 0.5;
    const labelDist = sectorRadius + 12;
    const lx = Math.max(20, Math.min(width - 28, bx + Math.cos(midAngle) * labelDist));
    const ly = Math.max(14, Math.min(height - 10, by + Math.sin(midAngle) * labelDist));

    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#090d16';
    ctx.fillText(`${degValue}°`, lx + 1, ly + 1);
    ctx.fillStyle = item.stroke;
    ctx.fillText(`${degValue}°`, lx, ly);
  }
  ctx.restore();
}

function drawStickmanOverlay(
  ctx: CanvasRenderingContext2D,
  exercise: Exercise,
  landmarks: any[],
  width: number,
  height: number,
  stickOnlyMode: boolean,
  showAngles: boolean
) {
  if (!landmarks || !landmarks.length) return;

  const isDrawable = (lm: any) =>
    lm && isFinite(lm.x) && isFinite(lm.y) && (lm.visibility ?? 1) > 0.25;

  const midpoint = (a: any, b: any) => {
    if (!isDrawable(a) || !isDrawable(b)) return null;
    return {
      x: (a.x + b.x) * 0.5,
      y: (a.y + b.y) * 0.5,
    };
  };

  if (stickOnlyMode) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  }

  if (showAngles) {
    drawWorkingAngleSectors(ctx, exercise, landmarks, width, height);
  }

  const head = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const neck = midpoint(leftShoulder, rightShoulder);
  const hips = midpoint(leftHip, rightHip);

  const lineColor = stickOnlyMode ? '#38bdf8' : '#00ffcc';
  const jointColor = stickOnlyMode ? '#f43f5e' : '#ff0055';
  const lineWidth = stickOnlyMode ? 3.8 : 3.2;
  const jointRadius = stickOnlyMode ? 4.4 : 4;

  const drawSeg = (
    p1: { x: number; y: number } | null | undefined,
    p2: { x: number; y: number } | null | undefined,
    w = lineWidth
  ) => {
    if (!p1 || !p2) return;
    if (!isFinite(p1.x) || !isFinite(p1.y) || !isFinite(p2.x) || !isFinite(p2.y)) return;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawSeg(isDrawable(head) ? head : null, neck, lineWidth);
  drawSeg(neck, hips, lineWidth);
  drawSeg(isDrawable(rightShoulder) ? rightShoulder : null, neck, lineWidth);
  drawSeg(neck, isDrawable(leftShoulder) ? leftShoulder : null, lineWidth);
  drawSeg(isDrawable(rightHip) ? rightHip : null, hips, lineWidth);
  drawSeg(hips, isDrawable(leftHip) ? leftHip : null, lineWidth);

  const limbConnections: Array<[number, number]> = [
    [12, 14], [14, 16],
    [11, 13], [13, 15],
    [24, 26], [26, 28],
    [23, 25], [25, 27],
  ];

  for (const [i, j] of limbConnections) {
    if (isDrawable(landmarks[i]) && isDrawable(landmarks[j])) {
      drawSeg(landmarks[i], landmarks[j], lineWidth);
    }
  }

  const drawJointDot = (pt: { x: number; y: number } | null | undefined, r = jointRadius) => {
    if (!pt || !isFinite(pt.x) || !isFinite(pt.y)) return;
    ctx.fillStyle = jointColor;
    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, r, 0, 2 * Math.PI);
    ctx.fill();
  };

  const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (const idx of jointIndices) {
    if (isDrawable(landmarks[idx])) {
      drawJointDot(landmarks[idx]);
    }
  }

  drawJointDot(neck);
  drawJointDot(hips);
  if (isDrawable(head)) {
    drawJointDot(head, jointRadius + 0.8);
  }

  ctx.restore();
}

function formatTimeSec(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const totalSec = Math.floor(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function clamp01(v: number): number {
  if (!isFinite(v)) return 0.5;
  return Math.max(0.02, Math.min(0.98, v));
}

function cloneLandmark(lm: any) {
  if (!lm) return null;
  return {
    x: clamp01(lm.x),
    y: clamp01(lm.y),
    z: isFinite(lm.z) ? lm.z : 0,
    visibility: typeof lm.visibility === 'number' ? lm.visibility : 0.85,
    __inferred: Boolean(lm.__inferred),
  };
}

function lerpLm(a: any, b: any, t: number, inferred = false) {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: clamp01(a.x + (b.x - a.x) * clampedT),
    y: clamp01(a.y + (b.y - a.y) * clampedT),
    z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * clampedT,
    visibility: Math.min(0.96, Math.max(0.6, ((a.visibility ?? 0.75) + (b.visibility ?? 0.75)) * 0.5)),
    __inferred: inferred,
  };
}

function segmentLength(a: any, b: any, width: number, height: number): number {
  if (!a || !b) return 0;
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
}

function constrainSegmentLength(
  proximal: any,
  distal: any,
  minLen: number,
  maxLen: number,
  fallbackAngleRad: number,
  inferredFlag: boolean
) {
  if (!proximal) return distal;
  if (!distal) {
    const len = (minLen + maxLen) * 0.5;
    return {
      x: clamp01(proximal.x + Math.cos(fallbackAngleRad) * len),
      y: clamp01(proximal.y + Math.sin(fallbackAngleRad) * len),
      z: proximal.z ?? 0,
      visibility: 0.62,
      __inferred: true,
    };
  }

  const dx = distal.x - proximal.x;
  const dy = distal.y - proximal.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-5) {
    const len = (minLen + maxLen) * 0.5;
    return {
      x: clamp01(proximal.x + Math.cos(fallbackAngleRad) * len),
      y: clamp01(proximal.y + Math.sin(fallbackAngleRad) * len),
      z: distal.z ?? proximal.z ?? 0,
      visibility: Math.max(0.55, distal.visibility ?? 0.65),
      __inferred: true,
    };
  }

  let clampedDist = dist;
  let wasClamped = false;
  if (dist < minLen) {
    clampedDist = minLen;
    wasClamped = true;
  } else if (dist > maxLen) {
    clampedDist = maxLen;
    wasClamped = true;
  }

  if (!wasClamped) {
    return {
      ...distal,
      x: clamp01(distal.x),
      y: clamp01(distal.y),
      __inferred: Boolean(distal.__inferred || inferredFlag),
    };
  }

  const scale = clampedDist / dist;
  return {
    x: clamp01(proximal.x + dx * scale),
    y: clamp01(proximal.y + dy * scale),
    z: distal.z ?? proximal.z ?? 0,
    visibility: Math.max(0.55, Math.min(0.9, distal.visibility ?? 0.7)),
    __inferred: true,
  };
}

function deduceMissingBodyLandmarks(
  rawLandmarks: any[],
  prevSmoothed: any[] | null,
  prev2Smoothed: any[] | null,
  width = 480,
  height = 360
): any[] {
  const out: any[] = new Array(33);
  const MIN_DIRECT_VIS = 0.48;
  const maxFrameJumpPx = Math.max(14, Math.hypot(width, height) * 0.085);

  for (let i = 0; i < 33; i++) {
    const raw = rawLandmarks?.[i];
    const vis = raw && typeof raw.visibility === 'number' ? raw.visibility : raw ? 0.85 : 0;
    const validRaw = raw && isFinite(raw.x) && isFinite(raw.y) && vis >= MIN_DIRECT_VIS;

    if (validRaw) {
      const candidate = cloneLandmark(raw);
      const prev = prevSmoothed?.[i];
      if (prev) {
        const jumpPx = segmentLength(candidate, prev, width, height);
        if (jumpPx > maxFrameJumpPx) {
          out[i] = lerpLm(prev, candidate, 0.25, true);
          continue;
        }
      }
      out[i] = candidate;
    } else if (prevSmoothed?.[i] && prev2Smoothed?.[i]) {
      const vx = (prevSmoothed[i].x - prev2Smoothed[i].x) * 0.35;
      const vy = (prevSmoothed[i].y - prev2Smoothed[i].y) * 0.35;
      const vz = ((prevSmoothed[i].z ?? 0) - (prev2Smoothed[i].z ?? 0)) * 0.35;
      out[i] = {
        x: clamp01(prevSmoothed[i].x + vx),
        y: clamp01(prevSmoothed[i].y + vy),
        z: (prevSmoothed[i].z ?? 0) + vz,
        visibility: Math.max(0.5, (prevSmoothed[i].visibility ?? 0.72) * 0.88),
        __inferred: true,
      };
    } else if (prevSmoothed?.[i]) {
      out[i] = cloneLandmark({
        ...prevSmoothed[i],
        visibility: Math.max(0.5, (prevSmoothed[i].visibility ?? 0.72) * 0.86),
        __inferred: true,
      });
    }
  }

  if (!out[11] && out[12]) {
    out[11] = { x: clamp01(out[12].x - 0.08), y: clamp01(out[12].y), z: out[12].z ?? 0, visibility: 0.56, __inferred: true };
  } else if (!out[12] && out[11]) {
    out[12] = { x: clamp01(out[11].x + 0.08), y: clamp01(out[11].y), z: out[11].z ?? 0, visibility: 0.56, __inferred: true };
  }

  if (!out[23] && out[24]) {
    out[23] = { x: clamp01(out[24].x - 0.07), y: clamp01(out[24].y), z: out[24].z ?? 0, visibility: 0.56, __inferred: true };
  } else if (!out[24] && out[23]) {
    out[24] = { x: clamp01(out[23].x + 0.07), y: clamp01(out[23].y), z: out[23].z ?? 0, visibility: 0.56, __inferred: true };
  }

  const hasTop = Boolean(out[11] && out[12]);
  const hasHip = Boolean(out[23] && out[24]);
  if (!hasTop && hasHip) {
    const midHipX = (out[23].x + out[24].x) * 0.5;
    const midHipY = (out[23].y + out[24].y) * 0.5;
    const prevTopLen =
      prevSmoothed?.[11] && prevSmoothed?.[23]
        ? Math.hypot(prevSmoothed[23].x - prevSmoothed[11].x, prevSmoothed[23].y - prevSmoothed[11].y)
        : 0.22;
    const estTorso = Math.max(0.14, Math.min(0.32, prevTopLen));
    out[11] = { x: clamp01(midHipX - 0.07), y: clamp01(midHipY - estTorso), z: 0, visibility: 0.55, __inferred: true };
    out[12] = { x: clamp01(midHipX + 0.07), y: clamp01(midHipY - estTorso), z: 0, visibility: 0.55, __inferred: true };
  } else if (hasTop && !hasHip) {
    const midShX = (out[11].x + out[12].x) * 0.5;
    const midShY = (out[11].y + out[12].y) * 0.5;
    const prevTopLen =
      prevSmoothed?.[11] && prevSmoothed?.[23]
        ? Math.hypot(prevSmoothed[23].x - prevSmoothed[11].x, prevSmoothed[23].y - prevSmoothed[11].y)
        : 0.22;
    const estTorso = Math.max(0.14, Math.min(0.32, prevTopLen));
    out[23] = { x: clamp01(midShX - 0.06), y: clamp01(midShY + estTorso), z: 0, visibility: 0.55, __inferred: true };
    out[24] = { x: clamp01(midShX + 0.06), y: clamp01(midShY + estTorso), z: 0, visibility: 0.55, __inferred: true };
  }

  const midShX = out[11] && out[12] ? (out[11].x + out[12].x) * 0.5 : 0.5;
  const midShY = out[11] && out[12] ? (out[11].y + out[12].y) * 0.5 : 0.35;
  const midHipX = out[23] && out[24] ? (out[23].x + out[24].x) * 0.5 : midShX;
  const midHipY = out[23] && out[24] ? (out[23].y + out[24].y) * 0.5 : midShY + 0.22;

  const spineDx = midHipX - midShX;
  const spineDy = midHipY - midShY;
  const torsoLen = Math.max(0.12, Math.min(0.36, Math.hypot(spineDx, spineDy) || 0.22));
  const spineAngle = Math.atan2(spineDy, spineDx);
  const downAngle = spineAngle;

  const armSegMin = torsoLen * 0.42;
  const armSegMax = torsoLen * 0.88;
  const legSegMin = torsoLen * 0.55;
  const legSegMax = torsoLen * 1.15;

  const applyContralateralArmGuidance = (
    visSh: any,
    visEl: any,
    visWr: any,
    occSh: any,
    occEl: any,
    occWr: any,
    rawOccEl: any,
    rawOccWr: any
  ) => {
    if (!visSh || !visEl || !visWr || !occSh) return null;
    const visReliability = Math.min(visEl.visibility ?? 0, visWr.visibility ?? 0);
    const rawOccReliability = Math.min(rawOccEl?.visibility ?? 0, rawOccWr?.visibility ?? 0);

    const visElbowElevated = visEl.y <= visSh.y + torsoLen * 0.22;
    const occElbowDropped = occEl ? occEl.y > occSh.y + torsoLen * 0.36 : true;

    if (
      visReliability >= 0.62 &&
      !visEl.__inferred &&
      visElbowElevated &&
      (rawOccReliability < 0.56 || occElbowDropped)
    ) {
      const shSpanX = occSh.x - visSh.x;
      const shSpanY = occSh.y - visSh.y;
      const relElX = visEl.x - visSh.x;
      const relElY = visEl.y - visSh.y;
      const relWrX = visWr.x - visSh.x;
      const relWrY = visWr.y - visSh.y;

      const mirrorSignX = shSpanX !== 0 ? -Math.sign(relElX) * Math.sign(shSpanX) : -1;
      const mirroredElX = occSh.x + (mirrorSignX !== 0 ? mirrorSignX * Math.abs(relElX) * 0.65 : -relElX * 0.65);
      const mirroredElY = occSh.y + relElY + shSpanY * 0.15;

      const mirroredWrX = occSh.x + (mirrorSignX !== 0 ? mirrorSignX * Math.abs(relWrX) * 0.55 : -relWrX * 0.55);
      const mirroredWrY = occSh.y + relWrY + shSpanY * 0.15;

      const blend = rawOccReliability < 0.42 ? 0.85 : 0.65;
      const nextEl = occEl
        ? lerpLm(occEl, { x: mirroredElX, y: mirroredElY, z: visEl.z ?? 0, visibility: 0.52 }, blend, true)
        : { x: clamp01(mirroredElX), y: clamp01(mirroredElY), z: visEl.z ?? 0, visibility: 0.52, __inferred: true };

      const nextWr = occWr
        ? lerpLm(occWr, { x: mirroredWrX, y: mirroredWrY, z: visWr.z ?? 0, visibility: 0.52 }, blend, true)
        : { x: clamp01(mirroredWrX), y: clamp01(mirroredWrY), z: visWr.z ?? 0, visibility: 0.52, __inferred: true };

      return { elbow: nextEl, wrist: nextWr };
    }
    return null;
  };

  out[13] = constrainSegmentLength(out[11], out[13], armSegMin, armSegMax, downAngle, Boolean(out[13]?.__inferred));
  out[15] = constrainSegmentLength(out[13], out[15], armSegMin * 0.9, armSegMax * 0.95, downAngle, Boolean(out[15]?.__inferred));

  out[14] = constrainSegmentLength(out[12], out[14], armSegMin, armSegMax, downAngle, Boolean(out[14]?.__inferred));
  out[16] = constrainSegmentLength(out[14], out[16], armSegMin * 0.9, armSegMax * 0.95, downAngle, Boolean(out[16]?.__inferred));

  const rightGuidedByLeft = applyContralateralArmGuidance(
    out[11], out[13], out[15], out[12], out[14], out[16], rawLandmarks?.[14], rawLandmarks?.[16]
  );
  if (rightGuidedByLeft) {
    out[14] = constrainSegmentLength(out[12], rightGuidedByLeft.elbow, armSegMin * 0.8, armSegMax, downAngle, true);
    out[16] = constrainSegmentLength(out[14], rightGuidedByLeft.wrist, armSegMin * 0.75, armSegMax * 0.95, downAngle, true);
  } else {
    const leftGuidedByRight = applyContralateralArmGuidance(
      out[12], out[14], out[16], out[11], out[13], out[15], rawLandmarks?.[13], rawLandmarks?.[15]
    );
    if (leftGuidedByRight) {
      out[13] = constrainSegmentLength(out[11], leftGuidedByRight.elbow, armSegMin * 0.8, armSegMax, downAngle, true);
      out[15] = constrainSegmentLength(out[13], leftGuidedByRight.wrist, armSegMin * 0.75, armSegMax * 0.95, downAngle, true);
    }
  }

  out[25] = constrainSegmentLength(out[23], out[25], legSegMin, legSegMax, downAngle, Boolean(out[25]?.__inferred));
  out[27] = constrainSegmentLength(out[25], out[27], legSegMin * 0.9, legSegMax, downAngle, Boolean(out[27]?.__inferred));

  out[26] = constrainSegmentLength(out[24], out[26], legSegMin, legSegMax, downAngle, Boolean(out[26]?.__inferred));
  out[28] = constrainSegmentLength(out[26], out[28], legSegMin * 0.9, legSegMax, downAngle, Boolean(out[28]?.__inferred));

  const headDist = Math.max(0.055, Math.min(0.13, torsoLen * 0.34));
  const headFallbackX = clamp01(midShX - Math.cos(spineAngle) * headDist);
  const headFallbackY = clamp01(midShY - Math.sin(spineAngle) * headDist);
  if (!out[0]) {
    out[0] = {
      x: headFallbackX,
      y: headFallbackY,
      z: ((out[11]?.z ?? 0) + (out[12]?.z ?? 0)) * 0.5,
      visibility: 0.68,
      __inferred: true,
    };
  } else {
    const dHead = Math.hypot(out[0].x - midShX, out[0].y - midShY);
    if (dHead < headDist * 0.45 || dHead > headDist * 1.9) {
      out[0] = {
        x: clamp01(out[0].x * 0.3 + headFallbackX * 0.7),
        y: clamp01(out[0].y * 0.3 + headFallbackY * 0.7),
        z: out[0].z ?? 0,
        visibility: 0.65,
        __inferred: true,
      };
    }
  }

  const jointsToSmooth = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (const idx of jointsToSmooth) {
    if (!out[idx]) continue;
    const curr = out[idx];
    const prev = prevSmoothed?.[idx];
    if (prev) {
      const distPx = segmentLength(curr, prev, width, height);
      const alpha = curr.__inferred ? 0.28 : distPx < 4 ? 0.32 : 0.52;
      out[idx] = {
        x: clamp01(prev.x + (curr.x - prev.x) * alpha),
        y: clamp01(prev.y + (curr.y - prev.y) * alpha),
        z: (prev.z ?? 0) * (1 - alpha) + (curr.z ?? 0) * alpha,
        visibility: curr.__inferred
          ? Math.min(0.54, curr.visibility ?? 0.52)
          : Math.max(
              0.6,
              Math.min(0.98, (prev.visibility ?? 0.8) * (1 - alpha) + (curr.visibility ?? 0.8) * alpha)
            ),
        __inferred: curr.__inferred,
      };
    }
  }

  for (let i = 0; i < 33; i++) {
    if (!out[i]) {
      out[i] = { x: midHipX, y: midHipY, z: 0, visibility: 0.5, __inferred: true };
    }
  }

  return out;
}

function interpolateTimedFrames(frames: TimedLandmarkFrame[], targetTimeSec: number): any[] | null {
  if (!frames.length) return null;
  if (frames.length === 1 || targetTimeSec <= frames[0].timeSec) {
    return frames[0].landmarks;
  }
  const lastIdx = frames.length - 1;
  if (targetTimeSec >= frames[lastIdx].timeSec) {
    return frames[lastIdx].landmarks;
  }

  let low = 0;
  let high = lastIdx;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].timeSec <= targetTimeSec) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const f1 = frames[low];
  const f2 = frames[high];
  const span = f2.timeSec - f1.timeSec;
  if (span <= 0.0001) return f1.landmarks;

  const rawAlpha = Math.max(0, Math.min(1, (targetTimeSec - f1.timeSec) / span));
  const smoothAlpha = rawAlpha * rawAlpha * (3 - 2 * rawAlpha);

  const merged: any[] = new Array(33);
  for (let i = 0; i < 33; i++) {
    const l1 = f1.landmarks?.[i];
    const l2 = f2.landmarks?.[i];
    if (l1 && l2) {
      merged[i] = lerpLm(l1, l2, smoothAlpha, Boolean(l1.__inferred || l2.__inferred));
    } else {
      merged[i] = cloneLandmark(l1 || l2);
    }
  }
  return merged;
}

function interpolateTimedTelemetry(
  samples: TimedTelemetryPoint[],
  targetTimeSec: number
): TimedTelemetryPoint | null {
  if (!samples.length) return null;
  if (samples.length === 1 || targetTimeSec <= samples[0].timeSec) {
    return samples[0];
  }
  const lastIdx = samples.length - 1;
  if (targetTimeSec >= samples[lastIdx].timeSec) {
    return samples[lastIdx];
  }

  let low = 0;
  let high = lastIdx;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (samples[mid].timeSec <= targetTimeSec) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const s1 = samples[low];
  const s2 = samples[high];
  const span = s2.timeSec - s1.timeSec;
  if (span <= 0.0001) return s1;

  const t = Math.max(0, Math.min(1, (targetTimeSec - s1.timeSec) / span));
  const lerpOpt = (a: number | null, b: number | null): number | null => {
    if (a !== null && b !== null) return Math.round(a + (b - a) * t);
    return t < 0.5 ? a : b;
  };

  return {
    timeSec: targetTimeSec,
    angleDeg: lerpOpt(s1.angleDeg, s2.angleDeg),
    romQuality: Math.round(s1.romQuality + (s2.romQuality - s1.romQuality) * t),
    powerScore: Math.round(s1.powerScore + (s2.powerScore - s1.powerScore) * t),
    angularSpeedDegSec: Math.round(
      s1.angularSpeedDegSec + (s2.angularSpeedDegSec - s1.angularSpeedDegSec) * t
    ),
    leftAngleDeg: lerpOpt(s1.leftAngleDeg, s2.leftAngleDeg),
    rightAngleDeg: lerpOpt(s1.rightAngleDeg, s2.rightAngleDeg),
    symmetryDiffDeg: lerpOpt(s1.symmetryDiffDeg, s2.symmetryDiffDeg),
    torsoTiltDeg: lerpOpt(s1.torsoTiltDeg, s2.torsoTiltDeg),
  };
}

function getLeftRightAngles(
  exercise: Exercise,
  landmarks: any[]
): { left: number | null; right: number | null; diff: number | null } {
  if (!landmarks || !landmarks.length) return { left: null, right: null, diff: null };

  const cfg = getExerciseConfig(exercise);
  const leftTriplet = cfg.primaryTriplet.left;
  const rightTriplet = cfg.primaryTriplet.right;

  const leftReadable = hasVisibleJoints(landmarks, leftTriplet, 0.48, false);
  const rightReadable = hasVisibleJoints(landmarks, rightTriplet, 0.48, false);

  const leftStrong = hasVisibleJoints(landmarks, leftTriplet, 0.58, true);
  const rightStrong = hasVisibleJoints(landmarks, rightTriplet, 0.58, true);

  const left = leftReadable
    ? getTripletAngleSafe(landmarks, leftTriplet, 0.48, false)
    : null;
  const right = rightReadable
    ? getTripletAngleSafe(landmarks, rightTriplet, 0.48, false)
    : null;

  const diff =
    left !== null && right !== null && leftStrong && rightStrong
      ? Math.abs(left - right)
      : null;

  return { left, right, diff };
}

function medianOfNumbers(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function angleToRomPercent(exerciseId: Exercise, angleDeg: number | null): number | null {
  return computeRomPercent(exerciseId, angleDeg);
}

function calculateTorsoInclinationDeg(landmarks: any[]): number | null {
  if (!landmarks || !landmarks.length) return null;
  const hasLeft = hasVisibleJoints(landmarks, [11, 23], 0.45);
  const hasRight = hasVisibleJoints(landmarks, [12, 24], 0.45);
  if (!hasLeft && !hasRight) return null;

  let shX = 0;
  let shY = 0;
  let hpX = 0;
  let hpY = 0;
  let count = 0;

  if (hasLeft) {
    shX += landmarks[11].x;
    shY += landmarks[11].y;
    hpX += landmarks[23].x;
    hpY += landmarks[23].y;
    count++;
  }
  if (hasRight) {
    shX += landmarks[12].x;
    shY += landmarks[12].y;
    hpX += landmarks[24].x;
    hpY += landmarks[24].y;
    count++;
  }
  if (count === 0) return null;

  shX /= count;
  shY /= count;
  hpX /= count;
  hpY /= count;

  const dx = shX - hpX;
  const dy = shY - hpY;
  const degFromVertical = (Math.abs(Math.atan2(Math.abs(dx), Math.abs(dy))) * 180) / Math.PI;
  return Math.max(0, Math.min(90, Math.round(degFromVertical)));
}

interface SessionBiomechanicsSummary {
  minAngle: number | null;
  maxAngle: number | null;
  romSpanDeg: number | null;
  peakRomPercent: number;
  avgRomPercent: number;
  peakPowerW: number;
  avgPowerW: number;
  peakAngularSpeedDegSec: number;
  avgAngularSpeedDegSec: number;
  maxAsymmetryDeg: number | null;
  avgAsymmetryDeg: number | null;
  minTorsoDeg: number | null;
  maxTorsoDeg: number | null;
  torsoOscillationDeg: number | null;
  sampleCount: number;
}

async function createLandmarkerWithFallback(vision: any): Promise<PoseLandmarker> {
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: './models/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  } catch (gpuErr) {
    console.warn('GPU delegate non disponibile su questo dispositivo, passo a CPU:', gpuErr);
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: './models/pose_landmarker_lite.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  }
}

async function loadPoseLandmarkerWithRetry(maxAttempts = 3): Promise<PoseLandmarker> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      return await createLandmarkerWithFallback(vision);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }
  }
  throw lastError;
}

function closeLandmarkerSafely(landmarker: PoseLandmarker | null | undefined) {
  if (!landmarker) return;
  try {
    landmarker.close();
  } catch {
    // Ignora eventuali errori di chiusura su istanze già chiuse
  }
}

function revokeBlobUrlSafely(url: string | null | undefined) {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // Ignora eventuali URL già revocati
  }
}

function getPlanLabel(plan: PlanType): string {
  switch (plan) {
    case 'trial': return 'Trial 7 Giorni';
    case 'monthly': return 'Mensile';
    case 'quarterly': return 'Trimestrale';
    case 'semiannual': return 'Semestrale';
    case 'annual': return 'Annuale';
    default: return 'Nessun piano';
  }
}

interface AppBrandHeaderProps {
  showPlanInfo?: boolean;
  currentPlan?: PlanType;
  daysRemaining?: number;
  userDisplayName?: string;
  areGuidesDisabled?: boolean;
  onOpenGuides?: () => void;
  onOpenAnglesGuide?: () => void;
  onLogout?: () => void;
}

function AppBrandHeader({
  showPlanInfo = false,
  currentPlan = 'none',
  daysRemaining = 0,
  userDisplayName,
  areGuidesDisabled = false,
  onOpenGuides,
  onOpenAnglesGuide,
  onLogout,
}: AppBrandHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: showPlanInfo ? 12 : 0,
        padding: '12px 16px',
        background: '#0f172a',
        borderBottom: '1px solid #334155',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: '8px 18px',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <img
          src="/images/logo_icon.png"
          alt="Second Opinion"
          style={{
            width: 82,
            height: 82,
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontSize: 13,
            color: '#7dd3fc',
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            paddingTop: 2,
            lineHeight: 1.2,
          }}
        >
          ANALISI BIOMECCANICA INTELLIGENTE
        </span>
      </div>

      {showPlanInfo && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px 16px',
            width: '100%',
            paddingTop: 8,
            borderTop: '1px solid rgba(51, 65, 85, 0.55)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 8,
              minWidth: 0,
              flex: '1 1 240px',
            }}
          >
            {userDisplayName && (
              <span
                style={{
                  fontSize: 12,
                  color: '#e2e8f0',
                  fontWeight: 600,
                  wordBreak: 'break-word',
                }}
              >
                👤 {userDisplayName}
              </span>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px 20px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: '#94a3b8',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  PIANO ATTIVO
                </span>
                <strong style={{ fontSize: 13, color: '#38bdf8' }}>
                  {getPlanLabel(currentPlan)}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: '#94a3b8',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  SCADENZA
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: daysRemaining <= 2 ? '#ef4444' : '#22c55e',
                  }}
                >
                  ⏱ {daysRemaining} {daysRemaining === 1 ? 'giorno' : 'giorni'}
                </span>
              </div>
            </div>

            {onLogout && (
              <div>
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    padding: '6px 11px',
                    borderRadius: 7,
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#cbd5e1',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Esci
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              flexWrap: 'wrap',
              flexShrink: 0,
              marginLeft: 'auto',
            }}
          >
            {onOpenGuides && (
              <button
                type="button"
                disabled={areGuidesDisabled}
                onClick={onOpenGuides}
                style={{
                  padding: '7px 11px',
                  borderRadius: 7,
                  border: '1px solid #38bdf8',
                  background: 'rgba(56,189,248,0.12)',
                  color: '#38bdf8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: areGuidesDisabled ? 'not-allowed' : 'pointer',
                  opacity: areGuidesDisabled ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                📷 Guide ripresa
              </button>
            )}
            {onOpenAnglesGuide && (
              <button
                type="button"
                onClick={onOpenAnglesGuide}
                style={{
                  padding: '7px 11px',
                  borderRadius: 7,
                  border: '1px solid rgba(250, 204, 21, 0.55)',
                  background: 'rgba(250, 204, 21, 0.12)',
                  color: '#fde047',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                📐 Angoli Esercizi
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);
  const [subLoading, setSubLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PlanType>('none');
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState<boolean>(false);
  const [isTester, setIsTester] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PaidPlanType | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<{ type: 'success' | 'cancelled'; text: string } | null>(null);
  const [unlockedByPlan, setUnlockedByPlan] = useState<Record<string, boolean>>({});

  const [isGuidesOpen, setIsGuidesOpen] = useState<boolean>(false);
  const [isAnglesGuideOpen, setIsAnglesGuideOpen] = useState<boolean>(false);

  const [isFormatsModalOpen, setIsFormatsModalOpen] = useState<boolean>(false);
  const [isPlayerHelpModalOpen, setIsPlayerHelpModalOpen] = useState<boolean>(false);
  const [isQuickReadHelpModalOpen, setIsQuickReadHelpModalOpen] = useState<boolean>(false);

  const [legalTab, setLegalTab] = useState<LegalDocTab | null>(null);
  const [cookieForceOpenKey, setCookieForceOpenKey] = useState<number>(0);
  const [analyticsConsent, setAnalyticsConsent] = useState<boolean>(false);

  const sortedExercises = useMemo(
    () => [...EXERCISES].sort((a, b) => a.label.localeCompare(b.label, 'it', { sensitivity: 'base' })),
    []
  );

  const defaultFirstExerciseId: Exercise = sortedExercises[0]?.id ?? FALLBACK_EXERCISE_CONFIG.id;

  const [selectedExercise, setSelectedExercise] = useState<Exercise>(defaultFirstExerciseId);
  const [weightKg, setWeightKg] = useState<number>(20);
  const [statusCode, setStatusCode] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [liveAngleDeg, setLiveAngleDeg] = useState<number | null>(null);
  const [romQuality, setRomQuality] = useState<number>(0);
  const [powerScore, setPowerScore] = useState<number>(0);
  const [peakPowerScore, setPeakPowerScore] = useState<number>(0);
  const [angularSpeedDegSec, setAngularSpeedDegSec] = useState<number>(0);
  const [leftAngleDeg, setLeftAngleDeg] = useState<number | null>(null);
  const [rightAngleDeg, setRightAngleDeg] = useState<number | null>(null);
  const [symmetryDiffDeg, setSymmetryDiffDeg] = useState<number | null>(null);
  const [torsoTiltDeg, setTorsoTiltDeg] = useState<number | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [biomechSummary, setBiomechSummary] = useState<SessionBiomechanicsSummary | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [videoMismatchAlert, setVideoMismatchAlert] = useState<VideoMismatchAlert | null>(null);

  const [stickOnlyMode, setStickOnlyMode] = useState<boolean>(false);
  const [showAnglesOverlay, setShowAnglesOverlay] = useState<boolean>(true);

  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replayCurrentTime, setReplayCurrentTime] = useState<number>(0);
  const [replayDuration, setReplayDuration] = useState<number>(0);
  const [replaySpeed, setReplaySpeed] = useState<PlaybackSpeed>(1);

  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [aiStatusCode, setAiStatusCode] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('In attesa di dati geometrici...');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const landmarksBufferRef = useRef<any[][]>([]);
  const timedLandmarksRef = useRef<TimedLandmarkFrame[]>([]);
  const timedTelemetryRef = useRef<TimedTelemetryPoint[]>([]);
  const stickOnlyModeRef = useRef<boolean>(false);
  const showAnglesOverlayRef = useRef<boolean>(true);
  const selectedExerciseRef = useRef<Exercise>(defaultFirstExerciseId);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollSyncTimeoutRef = useRef<number | null>(null);
  const lastGeomResultRef = useRef<{ exercise: Exercise; result: AnalysisResult } | null>(null);
  const activeLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const telemetrySamplesRef = useRef<{
    angles: number[];
    roms: number[];
    powers: number[];
    speeds: number[];
    asymmetries: number[];
    torsos: number[];
  }>({
    angles: [],
    roms: [],
    powers: [],
    speeds: [],
    asymmetries: [],
    torsos: [],
  });
  const loggedSessionKeyRef = useRef<string | null>(null);
  const analysisSessionIdRef = useRef<number>(0);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const isPasswordRecoveryRef = useRef<boolean>(false);

  useEffect(() => {
    isPasswordRecoveryRef.current = isPasswordRecovery;
  }, [isPasswordRecovery]);

  useEffect(() => {
    stickOnlyModeRef.current = stickOnlyMode;
  }, [stickOnlyMode]);

  useEffect(() => {
    showAnglesOverlayRef.current = showAnglesOverlay;
  }, [showAnglesOverlay]);

  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.playbackRate = statusCode === 'success' ? replaySpeed : 1;
    }
  }, [replaySpeed, statusCode]);

  const cleanupActiveRuntimeResources = useCallback(() => {
    const landmarker = activeLandmarkerRef.current;
    activeLandmarkerRef.current = null;
    closeLandmarkerSafely(landmarker);

    const blobUrl = activeBlobUrlRef.current;
    activeBlobUrlRef.current = null;
    revokeBlobUrlSafely(blobUrl);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current !== null) {
        window.clearTimeout(scrollSyncTimeoutRef.current);
      }
      cleanupActiveRuntimeResources();
    };
  }, [cleanupActiveRuntimeResources]);

  const fetchPlanExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plan_exercises')
        .select('plan_type, exercise_id, is_unlocked');

      if (error) {
        console.warn('Lettura plan_exercises non disponibile o in attesa di configurazione DB:', error.message);
        return;
      }

      if (data && Array.isArray(data)) {
        const map: Record<string, boolean> = {};
        for (const row of data) {
          if (row.plan_type && row.exercise_id) {
            map[`${row.plan_type}:${row.exercise_id}`] = Boolean(row.is_unlocked);
          }
        }
        setUnlockedByPlan(map);
      }
    } catch (err) {
      console.warn('Errore caricamento matrice plan_exercises:', err);
    }
  }, []);

  const isExerciseUnlockedForPlan = useCallback(
    (plan: PlanType, exerciseId: Exercise, fallbackTrialAllowed: boolean): boolean => {
      if (plan === 'none' || isSubscriptionExpired) {
        return false;
      }
      const key = `${plan}:${exerciseId}`;
      if (Object.prototype.hasOwnProperty.call(unlockedByPlan, key)) {
        return Boolean(unlockedByPlan[key]);
      }
      if (plan === 'trial') {
        return fallbackTrialAllowed;
      }
      return true;
    },
    [unlockedByPlan, isSubscriptionExpired]
  );

  const resetAnalysisSession = useCallback(
    (options?: { preserveExerciseAndWeight?: boolean }) => {
      cleanupActiveRuntimeResources();
      if (!options?.preserveExerciseAndWeight) {
        setSelectedExercise(defaultFirstExerciseId);
        selectedExerciseRef.current = defaultFirstExerciseId;
        setWeightKg(20);
      }
      setStatusCode('idle');
      setIsProcessing(false);
      setProgressPercent(0);
      setLiveAngleDeg(null);
      setRomQuality(0);
      setPowerScore(0);
      setPeakPowerScore(0);
      setAngularSpeedDegSec(0);
      setLeftAngleDeg(null);
      setRightAngleDeg(null);
      setSymmetryDiffDeg(null);
      setTorsoTiltDeg(null);
      setShowTechnicalDetails(false);
      setAnalysisResult(null);
      setBiomechSummary(null);
      setIsAnalysisOpen(false);
      setLastUploadedFile(null);
      setVideoMismatchAlert(null);
      setIsReplayPlaying(false);
      setReplayCurrentTime(0);
      setReplayDuration(0);
      setReplaySpeed(1);
      setAiFeedback('');
      setAiStatusCode('idle');
      setAiStatusMessage('In attesa di dati geometrici...');

      landmarksBufferRef.current = [];
      timedLandmarksRef.current = [];
      timedTelemetryRef.current = [];
      lastGeomResultRef.current = null;
      telemetrySamplesRef.current = {
        angles: [],
        roms: [],
        powers: [],
        speeds: [],
        asymmetries: [],
        torsos: [],
      };

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        videoRef.current.playbackRate = 1;
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    },
    [cleanupActiveRuntimeResources, defaultFirstExerciseId]
  );

  useEffect(() => {
    const hasRecoveryHash =
      typeof window !== 'undefined' &&
      (window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery'));

    if (hasRecoveryHash) {
      setIsPasswordRecovery(true);
      isPasswordRecoveryRef.current = true;
    }

    const recordLoginIfNew = async (sessionUserId?: string, accessToken?: string) => {
      if (!sessionUserId || !accessToken) return;
      if (isPasswordRecoveryRef.current) return;
      const sessionKey = `${sessionUserId}:${accessToken.slice(-16)}`;
      if (loggedSessionKeyRef.current === sessionKey) return;

      loggedSessionKeyRef.current = sessionKey;
      await logUserActivity({
        eventType: 'login',
        exerciseAnalyzed: null,
        aiResponse: null,
      });
    };

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
      if (!hasRecoveryHash) {
        void recordLoginIfNew(data.session?.user?.id, data.session?.access_token);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        isPasswordRecoveryRef.current = true;
        if (typeof window !== 'undefined' && window.location.hash) {
          try {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch {
            // Ignora eventuali limitazioni history
          }
        }
      } else if (event === 'SIGNED_IN') {
        if (!isPasswordRecoveryRef.current) {
          void recordLoginIfNew(session?.user?.id, session?.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        isPasswordRecoveryRef.current = false;
        loggedSessionKeyRef.current = null;
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    analysisSessionIdRef.current += 1;
    setSelectedExercise(defaultFirstExerciseId);
    selectedExerciseRef.current = defaultFirstExerciseId;
    resetAnalysisSession({ preserveExerciseAndWeight: true });
    if (carouselRef.current) {
      isProgrammaticScrollRef.current = true;
      carouselRef.current.scrollLeft = 0;
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 150);
    }
  }, [user?.id, defaultFirstExerciseId, resetAnalysisSession]);

  useEffect(() => {
    if (isGuidesOpen || isAnglesGuideOpen || !carouselRef.current) return;
    const idx = sortedExercises.findIndex((ex) => ex.id === selectedExercise);
    if (idx < 0) return;

    const container = carouselRef.current;
    const targetLeft = idx * container.clientWidth;
    if (Math.abs(container.scrollLeft - targetLeft) > 4) {
      isProgrammaticScrollRef.current = true;
      container.scrollTo({
        left: targetLeft,
        behavior: 'auto',
      });
      container.scrollLeft = targetLeft;
      window.setTimeout(() => {
        if (carouselRef.current) {
          carouselRef.current.scrollLeft = targetLeft;
        }
        isProgrammaticScrollRef.current = false;
      }, 60);
    }
  }, [selectedExercise, isGuidesOpen, isAnglesGuideOpen, sortedExercises]);

  useEffect(() => {
    if (statusCode !== 'success') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    video.muted = true;
    video.playbackRate = replaySpeed;
    let rafId: number | null = null;
    let lastUiSyncMs = 0;
    let lastDrawnTime = -1;
    let lastDrawnStickOnly = stickOnlyModeRef.current;
    let lastDrawnShowAngles = showAnglesOverlayRef.current;

    const syncDuration = () => {
      if (video.duration && isFinite(video.duration)) {
        setReplayDuration(video.duration);
      }
    };

    const syncUiAndTelemetryAtTime = (timeSec: number, force = false) => {
      const now = performance.now();
      if (!force && now - lastUiSyncMs < 65) return;
      lastUiSyncMs = now;

      setReplayCurrentTime(timeSec);
      const point = interpolateTimedTelemetry(timedTelemetryRef.current, timeSec);
      if (!point) return;
      setLiveAngleDeg(point.angleDeg);
      setRomQuality(point.romQuality);
      setPowerScore(point.powerScore);
      setAngularSpeedDegSec(point.angularSpeedDegSec);
      setLeftAngleDeg(point.leftAngleDeg);
      setRightAngleDeg(point.rightAngleDeg);
      setSymmetryDiffDeg(point.symmetryDiffDeg);
      setTorsoTiltDeg(point.torsoTiltDeg);
    };

    const drawCurrentFrame = (forceSyncUi = false) => {
      const w = canvas.width || video.videoWidth || 480;
      const h = canvas.height || video.videoHeight || 360;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const currentVideoTime = video.currentTime || 0;
      const exId = selectedExerciseRef.current;
      const isStickOnly = stickOnlyModeRef.current;
      const withAngles = showAnglesOverlayRef.current;
      const overlayChanged =
        isStickOnly !== lastDrawnStickOnly || withAngles !== lastDrawnShowAngles;

      if (isStickOnly) {
        const nearestLandmarks = interpolateTimedFrames(timedLandmarksRef.current, currentVideoTime);
        if (nearestLandmarks) {
          drawStickmanOverlay(ctx, exId, nearestLandmarks, w, h, true, withAngles);
        } else {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);
        }
        lastDrawnTime = currentVideoTime;
        lastDrawnStickOnly = isStickOnly;
        lastDrawnShowAngles = withAngles;
      } else if (video.readyState >= 2) {
        if (
          Math.abs(currentVideoTime - lastDrawnTime) > 0.0005 ||
          forceSyncUi ||
          video.paused ||
          overlayChanged
        ) {
          lastDrawnTime = currentVideoTime;
          lastDrawnStickOnly = isStickOnly;
          lastDrawnShowAngles = withAngles;
          ctx.drawImage(video, 0, 0, w, h);
          const nearestLandmarks = interpolateTimedFrames(timedLandmarksRef.current, currentVideoTime);
          if (nearestLandmarks) {
            drawStickmanOverlay(ctx, exId, nearestLandmarks, w, h, false, withAngles);
          }
        }
      }

      syncUiAndTelemetryAtTime(currentVideoTime, forceSyncUi || overlayChanged);
    };

    const tick = () => {
      if (statusCode !== 'success') return;
      drawCurrentFrame(false);
      if (!video.paused && !video.ended) {
        rafId = requestAnimationFrame(tick);
      } else {
        setIsReplayPlaying(false);
        drawCurrentFrame(true);
      }
    };

    const handleLoadedMetadata = () => {
      syncDuration();
      drawCurrentFrame(true);
    };

    const handlePlay = () => {
      video.muted = true;
      video.playbackRate = replaySpeed;
      setIsReplayPlaying(true);
      syncDuration();
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    };

    const handlePauseOrEnded = () => {
      setIsReplayPlaying(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      drawCurrentFrame(true);
    };

    const handleSeeked = () => {
      lastDrawnTime = -1;
      drawCurrentFrame(true);
    };

    syncDuration();
    drawCurrentFrame(true);
    if (!video.paused && !video.ended) {
      setIsReplayPlaying(true);
      rafId = requestAnimationFrame(tick);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', syncDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePauseOrEnded);
    video.addEventListener('ended', handlePauseOrEnded);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', syncDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePauseOrEnded);
      video.removeEventListener('ended', handlePauseOrEnded);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [statusCode, replaySpeed]);

  useEffect(() => {
    if (statusCode !== 'success') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width || video.videoWidth || 480;
    const h = canvas.height || video.videoHeight || 360;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const currentVideoTime = video.currentTime || 0;
    const exId = selectedExerciseRef.current;

    if (stickOnlyMode) {
      const nearestLandmarks = interpolateTimedFrames(timedLandmarksRef.current, currentVideoTime);
      if (nearestLandmarks) {
        drawStickmanOverlay(ctx, exId, nearestLandmarks, w, h, true, showAnglesOverlay);
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
      }
    } else if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, w, h);
      const nearestLandmarks = interpolateTimedFrames(timedLandmarksRef.current, currentVideoTime);
      if (nearestLandmarks) {
        drawStickmanOverlay(ctx, exId, nearestLandmarks, w, h, false, showAnglesOverlay);
      }
    }
  }, [statusCode, stickOnlyMode, showAnglesOverlay]);

  const fetchUserSubscription = useCallback(
    async (userId: string) => {
      setSubLoading(true);
      setPlanError(null);
      try {
        await fetchPlanExercises();

        const { data, error } = await supabase
          .from('subscriptions')
          .select('plan_type, status, end_date, is_tester')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setCurrentPlan('none');
          setDaysRemaining(0);
          setIsSubscriptionExpired(false);
          setIsTester(false);
          return;
        }

        const endDate = new Date(data.end_date);
        const now = new Date();
        const diffMs = endDate.getTime() - now.getTime();
        const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const expired = diffMs <= 0 || data.status === 'expired';

        setCurrentPlan(data.plan_type as PlanType);
        setDaysRemaining(diffDays);
        setIsSubscriptionExpired(expired);
        setIsTester(Boolean(data.is_tester) && !expired && data.status === 'active');
      } catch (err: any) {
        console.error('Errore lettura abbonamento:', err);
        setPlanError(err?.message || 'Impossibile verificare lo stato dell’abbonamento.');
        setIsTester(false);
      } finally {
        setSubLoading(false);
      }
    },
    [fetchPlanExercises]
  );

  useEffect(() => {
    if (user?.id) {
      void fetchUserSubscription(user.id);
    } else {
      setCurrentPlan('none');
      setDaysRemaining(0);
      setIsSubscriptionExpired(false);
      setIsTester(false);
      setUnlockedByPlan({});
    }
  }, [user?.id, fetchUserSubscription]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    if (!checkoutState) return;

    params.delete('checkout');
    const cleanSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl);

    if (checkoutState === 'cancelled') {
      setCheckoutNotice({
        type: 'cancelled',
        text: 'Pagamento annullato. Puoi selezionare un piano in qualsiasi momento.',
      });
      return;
    }

    if (checkoutState === 'success') {
      setCheckoutNotice({
        type: 'success',
        text: 'Pagamento completato! Attivazione abbonamento in corso...',
      });

      void fetchUserSubscription(user.id);
      const retryTimer = window.setTimeout(() => {
        void fetchUserSubscription(user.id);
      }, 2500);

      return () => window.clearTimeout(retryTimer);
    }
  }, [user?.id, fetchUserSubscription]);

  const handleActivateTrial = async () => {
    if (!user) return;
    setSubLoading(true);
    setPlanError(null);
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_type: 'trial',
        status: 'active',
        end_date: endDate.toISOString(),
      });

      if (error) throw error;
      await fetchUserSubscription(user.id);
    } catch (err: any) {
      setPlanError(err?.message || 'Errore durante attivazione del Trial.');
      setSubLoading(false);
    }
  };

  const handleSelectPaidPlan = async (plan: PaidPlanType) => {
    if (!user || checkoutLoadingPlan) return;
    setCheckoutLoadingPlan(plan);
    setPlanError(null);
    setCheckoutNotice(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Sessione scaduta. Effettua nuovamente il login.');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planType: plan },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Errore durante la creazione della sessione di pagamento.');
      }

      if (!data?.url) {
        throw new Error('URL di pagamento Stripe non ricevuto dal server.');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('Errore checkout Stripe:', err);
      setPlanError(err?.message || 'Impossibile avviare il pagamento con Stripe.');
      setCheckoutLoadingPlan(null);
    }
  };

  const handleLogout = async () => {
    analysisSessionIdRef.current += 1;
    setIsGuidesOpen(false);
    setIsAnglesGuideOpen(false);
    setIsFormatsModalOpen(false);
    setIsPlayerHelpModalOpen(false);
    setIsQuickReadHelpModalOpen(false);
    setLegalTab(null);
    setIsTester(false);
    setIsPasswordRecovery(false);
    isPasswordRecoveryRef.current = false;
    loggedSessionKeyRef.current = null;
    resetAnalysisSession();
    await supabase.auth.signOut();
  };

  const handleInterruptAnalysis = () => {
    analysisSessionIdRef.current += 1;
    resetAnalysisSession({ preserveExerciseAndWeight: true });
    if (carouselRef.current) {
      isProgrammaticScrollRef.current = true;
      carouselRef.current.scrollLeft = 0;
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 250);
    }
  };

  const scrollCarouselToStart = () => {
    if (!carouselRef.current) return;
    isProgrammaticScrollRef.current = true;
    carouselRef.current.scrollTo({ left: 0, behavior: 'auto' });
    carouselRef.current.scrollLeft = 0;
    window.setTimeout(() => {
      if (carouselRef.current) {
        carouselRef.current.scrollLeft = 0;
      }
      isProgrammaticScrollRef.current = false;
    }, 300);
  };

  const handleStartNewAnalysis = () => {
    analysisSessionIdRef.current += 1;
    resetAnalysisSession();
    scrollCarouselToStart();
  };

  const handleOpenCookiePreferences = () => {
    try {
      localStorage.removeItem('cookie_consent_v1');
    } catch {
      // Ignora eventuali blocchi storage
    }
    setCookieForceOpenKey((prev) => prev + 1);
  };

  const renderLegalOverlays = () => (
    <>
      <CookieBanner
        key={cookieForceOpenKey}
        onOpenCookiePolicy={() => setLegalTab('cookies')}
        onConsentChange={(consent: CookieConsentState) => {
          setAnalyticsConsent(consent.analytics);
        }}
      />
      {legalTab && (
        <LegalDocsModal
          activeTab={legalTab}
          onChangeTab={setLegalTab}
          onClose={() => setLegalTab(null)}
        />
      )}
    </>
  );

  const selectedExerciseIndex = Math.max(
    0,
    sortedExercises.findIndex((ex) => ex.id === selectedExercise)
  );
  const selectedExerciseObj: ExerciseConfig =
    sortedExercises[selectedExerciseIndex] ?? sortedExercises[0] ?? FALLBACK_EXERCISE_CONFIG;
  const isExerciseLocked = !isExerciseUnlockedForPlan(
    currentPlan,
    selectedExerciseObj.id,
    selectedExerciseObj.isTrialAllowed
  );

  const hasActiveOrCompletedSession =
    isProcessing || statusCode === 'success' || statusCode === 'error' || Boolean(analysisResult);
  const areExerciseAndWeightLocked = isProcessing || hasActiveOrCompletedSession;

  const isNewAnalysisEnabled =
    !isProcessing && statusCode === 'success' && aiStatusCode === 'success';

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current || areExerciseAndWeightLocked || !sortedExercises.length) return;
    const delta = direction === 'left' ? -1 : 1;
    const targetIndex = Math.max(0, Math.min(sortedExercises.length - 1, selectedExerciseIndex + delta));
    setSelectedExercise(sortedExercises[targetIndex].id);
  };

  const handleExerciseSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (areExerciseAndWeightLocked) return;
    const chosenId = e.target.value as Exercise;
    const matched = sortedExercises.find((ex) => ex.id === chosenId);
    if (matched) {
      setSelectedExercise(matched.id);
    }
  };

  const handleCarouselScroll = () => {
    if (
      isProgrammaticScrollRef.current ||
      areExerciseAndWeightLocked ||
      !carouselRef.current ||
      !sortedExercises.length
    ) {
      return;
    }
    if (scrollSyncTimeoutRef.current !== null) {
      window.clearTimeout(scrollSyncTimeoutRef.current);
    }
    scrollSyncTimeoutRef.current = window.setTimeout(() => {
      if (!carouselRef.current || isProgrammaticScrollRef.current) return;
      const container = carouselRef.current;
      const itemWidth = container.clientWidth;
      if (itemWidth <= 0) return;
      const idx = Math.round(container.scrollLeft / itemWidth);
      const clampedIdx = Math.max(0, Math.min(sortedExercises.length - 1, idx));
      const targetExercise = sortedExercises[clampedIdx]?.id;
      if (targetExercise && targetExercise !== selectedExercise) {
        setSelectedExercise(targetExercise);
      }
    }, 90);
  };

  const handleWeightChange = (delta: number) => {
    if (areExerciseAndWeightLocked) return;
    setWeightKg((prev) => Math.max(0, prev + delta));
  };

  const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (areExerciseAndWeightLocked) return;
    const val = parseInt(e.target.value, 10);
    setWeightKg(isNaN(val) ? 0 : Math.max(0, val));
  };

  const triggerAiCoach = (
    geomResult: AnalysisResult,
    exerciseForCoach: Exercise,
    sessionIdAtStart?: number,
    telemetryPayload?: {
      weightKg: number;
      isDumbbell: boolean;
      peakRomPercent: number;
      avgRomPercent: number;
      peakPowerW: number;
      avgPowerW: number;
      maxAsymmetryDeg: number | null;
      torsoOscillationDeg: number | null;
      keyframes?: string[];
      validateExerciseMatch?: boolean;
    }
  ) => {
    if (sessionIdAtStart !== undefined && analysisSessionIdRef.current !== sessionIdAtStart) {
      return;
    }
    setAiStatusCode('processing');
    setAiStatusMessage('Il server sta interrogando Gemini con i dati geometrici...');
    setAiFeedback('');

    const exerciseLabel = getExerciseConfig(exerciseForCoach).label;

    requestGeminiCoachAnalysis(
      exerciseLabel,
      geomResult.minAngle,
      geomResult.maxAngle,
      geomResult.trendSummary,
      telemetryPayload
    )
      .then(async (res) => {
        if (sessionIdAtStart !== undefined && analysisSessionIdRef.current !== sessionIdAtStart) {
          return;
        }

        if (!res.isExerciseMatch) {
          const reasonMsg =
            res.mismatchReason ||
            `Il video caricato non corrisponde all'esercizio selezionato (${exerciseLabel}).`;
          setVideoMismatchAlert({
            title: `Video non coerente con "${exerciseLabel}"`,
            message: reasonMsg,
            detectedSubject: res.detectedSubject,
          });
          setAnalysisResult(null);
          setBiomechSummary(null);
          setStatusCode('error');
          setAiFeedback(reasonMsg);
          setAiStatusCode('error');
          setAiStatusMessage('Video non coerente con l’esercizio selezionato');
          return;
        }

        setAiFeedback(res.feedback);
        setAiStatusCode('success');
        setAiStatusMessage('Risposta generata con successo');

        await logUserActivity({
          eventType: 'exercise_analysis',
          exerciseAnalyzed: exerciseForCoach,
          aiResponse: res.feedback,
        });
      })
      .catch((err) => {
        if (sessionIdAtStart !== undefined && analysisSessionIdRef.current !== sessionIdAtStart) {
          return;
        }
        const errMsg = err instanceof Error ? err.message : String(err ?? 'errore sconosciuto');
        setAiFeedback(`Errore AI: ${errMsg}`);
        setAiStatusCode('error');
        setAiStatusMessage(`Errore IA: ${errMsg}`);
      });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExerciseLocked) {
      e.target.value = '';
      setPlanError('Questo esercizio è riservato agli abbonati. Passa a un piano completo per sbloccarlo!');
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !videoRef.current || !canvasRef.current) return;

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      analysisSessionIdRef.current += 1;
      resetAnalysisSession({ preserveExerciseAndWeight: true });
      setStatusCode('error');
      e.target.value = '';
      return;
    }

    analysisSessionIdRef.current += 1;
    const currentSessionId = analysisSessionIdRef.current;
    const sessionExerciseConfig = selectedExerciseObj;
    const sessionExerciseId = sessionExerciseConfig.id;
    const sessionWeightKg = weightKg;

    let fileBuffer: ArrayBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
    } catch {
      if (analysisSessionIdRef.current !== currentSessionId) return;
      resetAnalysisSession({ preserveExerciseAndWeight: true });
      setStatusCode('error');
      return;
    }

    if (analysisSessionIdRef.current !== currentSessionId) return;

    const persistentMemoryFile = new File([fileBuffer], file.name || `video_${Date.now()}.mp4`, {
      type: file.type || 'video/mp4',
      lastModified: file.lastModified || Date.now(),
    });

    resetAnalysisSession({ preserveExerciseAndWeight: true });
    setLastUploadedFile(persistentMemoryFile);
    setIsProcessing(true);
    setStatusCode('processing');

    try {
      const localVideoBlob = new Blob([fileBuffer], { type: file.type || 'video/mp4' });
      const localVideoUrl = URL.createObjectURL(localVideoBlob);
      activeBlobUrlRef.current = localVideoUrl;

      const landmarker = await loadPoseLandmarkerWithRetry(3);
      if (analysisSessionIdRef.current !== currentSessionId) {
        closeLandmarkerSafely(landmarker);
        if (activeBlobUrlRef.current === localVideoUrl) {
          revokeBlobUrlSafely(localVideoUrl);
          activeBlobUrlRef.current = null;
        }
        return;
      }

      activeLandmarkerRef.current = landmarker;

      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');

      video.muted = true;
      video.playsInline = true;
      video.playbackRate = 1;
      video.src = localVideoUrl;
      video.load();

      const MAX_WIDTH = 480;
      const FRAME_SKIP = 3;
      let frameCounter = 0;
      let sampledFramesCount = 0;
      let rawDetectedFramesCount = 0;
      const capturedKeyFrames: string[] = [];
      let targetWidth = 640;
      let targetHeight = 480;
      let rafId: number | null = null;
      let hasFinished = false;
      let metadataTimeoutId: number | null = null;

      const angleHistory: number[] = [];
      const powerHistory: number[] = [];
      const speedHistory: number[] = [];
      const asymHistory: number[] = [];
      let hasStarted = false;
      let latestKnownLandmarks: any[] | null = null;
      let prev2KnownLandmarks: any[] | null = null;
      let prevSampleAngle: number | null = null;
      let prevSampleTimeSec: number | null = null;
      let sessionPeakPower = 0;

      const effectiveMass = sessionExerciseConfig.isDumbbell ? sessionWeightKg * 2 : sessionWeightKg;

      const finalizeAnalysis = () => {
        if (hasFinished || analysisSessionIdRef.current !== currentSessionId) return;
        hasFinished = true;
        if (metadataTimeoutId !== null) {
          window.clearTimeout(metadataTimeoutId);
          metadataTimeoutId = null;
        }
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        const endFrame = captureKeyFrameDataUrl(video);
        if (endFrame && capturedKeyFrames.length < 3) {
          capturedKeyFrames.push(endFrame);
        }

        video.pause();
        video.muted = true;
        video.playbackRate = 1;
        video.currentTime = 0;

        setIsReplayPlaying(false);
        setReplayCurrentTime(0);
        if (video.duration && isFinite(video.duration)) {
          setReplayDuration(video.duration);
        }

        const validation = validateExerciseMotionAndPose(
          sessionExerciseId,
          landmarksBufferRef.current,
          sampledFramesCount,
          rawDetectedFramesCount
        );

        if (activeLandmarkerRef.current === landmarker) {
          activeLandmarkerRef.current = null;
          closeLandmarkerSafely(landmarker);
        }

        setIsProcessing(false);
        setProgressPercent(100);

        if (!validation.isValid) {
          setVideoMismatchAlert({
            title: `Video non coerente con "${sessionExerciseConfig.label}"`,
            message: validation.reason,
            detectedSubject: validation.detectedSubject,
          });
          setStatusCode('error');
          setAiStatusCode('error');
          setAiStatusMessage('Video non coerente con l’esercizio selezionato');
          setAiFeedback(validation.reason);
          return;
        }

        const startTelemetry = interpolateTimedTelemetry(timedTelemetryRef.current, 0);
        if (startTelemetry) {
          setLiveAngleDeg(startTelemetry.angleDeg);
          setRomQuality(startTelemetry.romQuality);
          setPowerScore(startTelemetry.powerScore);
          setAngularSpeedDegSec(startTelemetry.angularSpeedDegSec);
          setLeftAngleDeg(startTelemetry.leftAngleDeg);
          setRightAngleDeg(startTelemetry.rightAngleDeg);
          setSymmetryDiffDeg(startTelemetry.symmetryDiffDeg);
          setTorsoTiltDeg(startTelemetry.torsoTiltDeg);
        } else {
          setPowerScore(0);
          setAngularSpeedDegSec(0);
        }

        if (ctx) {
          const w = canvas.width || targetWidth;
          const h = canvas.height || targetHeight;
          const startLandmarks = interpolateTimedFrames(timedLandmarksRef.current, 0);
          if (stickOnlyModeRef.current) {
            if (startLandmarks) {
              drawStickmanOverlay(
                ctx,
                sessionExerciseId,
                startLandmarks,
                w,
                h,
                true,
                showAnglesOverlayRef.current
              );
            } else {
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, w, h);
            }
          } else if (video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, w, h);
            if (startLandmarks) {
              drawStickmanOverlay(
                ctx,
                sessionExerciseId,
                startLandmarks,
                w,
                h,
                false,
                showAnglesOverlayRef.current
              );
            }
          }
        }

        setStatusCode('success');

        const geomResult = analyzeExerciseGeometry(sessionExerciseId, landmarksBufferRef.current);
        setAnalysisResult(geomResult);
        lastGeomResultRef.current = { exercise: sessionExerciseId, result: geomResult };

        const samples = telemetrySamplesRef.current;
        const avgOf = (arr: number[]) =>
          arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
        const maxOf = (arr: number[]) => (arr.length ? Math.max(...arr) : null);
        const minOf = (arr: number[]) => (arr.length ? Math.min(...arr) : null);

        const minAng = samples.angles.length ? minOf(samples.angles)! : (geomResult?.minAngle ?? null);
        const maxAng = samples.angles.length ? maxOf(samples.angles)! : (geomResult?.maxAngle ?? null);
        const spanDeg = minAng !== null && maxAng !== null ? Math.abs(maxAng - minAng) : null;

        const minTorso = minOf(samples.torsos);
        const maxTorso = maxOf(samples.torsos);
        const torsoOsc =
          minTorso !== null && maxTorso !== null ? Math.abs(maxTorso - minTorso) : null;

        const peakRom = maxOf(samples.roms) ?? 0;
        const avgRom = avgOf(samples.roms) ?? 0;
        const peakPow = Math.max(sessionPeakPower, maxOf(samples.powers) ?? 0);
        const avgPow = avgOf(samples.powers) ?? 0;
        const maxAsym = maxOf(samples.asymmetries);

        setPeakPowerScore(peakPow);
        setBiomechSummary({
          minAngle: minAng,
          maxAngle: maxAng,
          romSpanDeg: spanDeg,
          peakRomPercent: peakRom,
          avgRomPercent: avgRom,
          peakPowerW: peakPow,
          avgPowerW: avgPow,
          peakAngularSpeedDegSec: maxOf(samples.speeds) ?? 0,
          avgAngularSpeedDegSec: avgOf(samples.speeds) ?? 0,
          maxAsymmetryDeg: maxAsym,
          avgAsymmetryDeg: avgOf(samples.asymmetries),
          minTorsoDeg: minTorso,
          maxTorsoDeg: maxTorso,
          torsoOscillationDeg: torsoOsc,
          sampleCount: samples.angles.length,
        });

        triggerAiCoach(geomResult, sessionExerciseId, currentSessionId, {
          weightKg: sessionWeightKg,
          isDumbbell: sessionExerciseConfig.isDumbbell,
          peakRomPercent: peakRom,
          avgRomPercent: avgRom,
          peakPowerW: peakPow,
          avgPowerW: avgPow,
          maxAsymmetryDeg: maxAsym,
          torsoOscillationDeg: torsoOsc,
          keyframes: capturedKeyFrames,
          validateExerciseMatch: true,
        });
      };

      const startProcessingWhenReady = () => {
        if (analysisSessionIdRef.current !== currentSessionId || hasFinished) {
          return;
        }
        if (hasStarted) return;

        const originalWidth = video.videoWidth || 0;
        const originalHeight = video.videoHeight || 0;

        if (originalWidth === 0 || originalHeight === 0) {
          metadataTimeoutId = window.setTimeout(startProcessingWhenReady, 100);
          return;
        }

        hasStarted = true;

        const scale = MAX_WIDTH / originalWidth;
        targetWidth = MAX_WIDTH;
        targetHeight = Math.round(originalHeight * scale);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        setStatusCode('processing');

        video.addEventListener('ended', finalizeAnalysis, { once: true });

        video.play().then(() => {
          const processFrame = () => {
            if (analysisSessionIdRef.current !== currentSessionId || hasFinished) {
              return;
            }

            if (video.duration && isFinite(video.duration) && video.duration > 0) {
              const currentProgress = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
              setProgressPercent(currentProgress);
              if (currentProgress >= 35 && currentProgress <= 65 && capturedKeyFrames.length < 2) {
                const midFrame = captureKeyFrameDataUrl(video);
                if (midFrame) capturedKeyFrames.push(midFrame);
              }
            }

            if (video.ended) {
              finalizeAnalysis();
              return;
            }

            if (video.paused) {
              rafId = requestAnimationFrame(processFrame);
              return;
            }

            frameCounter++;
            let currentLandmarks: any = null;

            if (frameCounter % FRAME_SKIP === 0) {
              sampledFramesCount++;
              if (sampledFramesCount === 1 && capturedKeyFrames.length === 0) {
                const startFrame = captureKeyFrameDataUrl(video);
                if (startFrame) capturedKeyFrames.push(startFrame);
              }

              try {
                const nowMs = performance.now();
                const result = landmarker.detectForVideo(video, nowMs);
                const rawPose =
                  result.landmarks && result.landmarks.length > 0 ? result.landmarks[0] : null;
                if (rawPose) {
                  rawDetectedFramesCount++;
                }

                const deducedLandmarks = deduceMissingBodyLandmarks(
                  rawPose || latestKnownLandmarks || [],
                  latestKnownLandmarks,
                  prev2KnownLandmarks,
                  targetWidth,
                  targetHeight
                );
                prev2KnownLandmarks = latestKnownLandmarks;
                latestKnownLandmarks = deducedLandmarks;
                currentLandmarks = deducedLandmarks;

                if (rawPose || latestKnownLandmarks) {
                  landmarksBufferRef.current.push(deducedLandmarks);
                  timedLandmarksRef.current.push({
                    timeSec: video.currentTime,
                    landmarks: deducedLandmarks,
                  });

                  const rawAngle = extractExerciseAngleValue(sessionExerciseId, currentLandmarks, 0.45);
                  const { left, right, diff: rawAsymDiff } = getLeftRightAngles(
                    sessionExerciseId,
                    currentLandmarks
                  );
                  const torsoTilt = calculateTorsoInclinationDeg(currentLandmarks);

                  setLeftAngleDeg(left);
                  setRightAngleDeg(right);

                  let filteredAsymDiff: number | null = null;
                  if (rawAsymDiff !== null) {
                    asymHistory.push(rawAsymDiff);
                    if (asymHistory.length > 5) asymHistory.shift();
                    filteredAsymDiff = medianOfNumbers(asymHistory);
                    setSymmetryDiffDeg(filteredAsymDiff);
                    telemetrySamplesRef.current.asymmetries.push(filteredAsymDiff);
                  } else {
                    setSymmetryDiffDeg(null);
                  }

                  if (torsoTilt !== null) {
                    setTorsoTiltDeg(torsoTilt);
                    telemetrySamplesRef.current.torsos.push(torsoTilt);
                  }

                  let frameSmoothAngle: number | null = null;
                  let frameRom = 0;
                  let framePower = 0;
                  let frameSpeed = 0;

                  if (rawAngle !== null) {
                    const prevSmoothAngle =
                      angleHistory.length > 0 ? angleHistory[angleHistory.length - 1] : null;

                    angleHistory.push(rawAngle);
                    if (angleHistory.length > 3) angleHistory.shift();
                    const smoothAngle = Math.round(
                      angleHistory.reduce((acc, v) => acc + v, 0) / angleHistory.length
                    );
                    frameSmoothAngle = smoothAngle;
                    setLiveAngleDeg(smoothAngle);
                    telemetrySamplesRef.current.angles.push(smoothAngle);

                    const currentTimeSec = video.currentTime;
                    let dtSec = 0;
                    if (prevSampleAngle !== null && prevSampleTimeSec !== null) {
                      const rawDt = currentTimeSec - prevSampleTimeSec;
                      if (rawDt > 0.008 && rawDt < 1.5) {
                        dtSec = rawDt;
                        const rawAngularSpeed = Math.min(
                          Math.abs(smoothAngle - prevSampleAngle) / rawDt,
                          420
                        );
                        speedHistory.push(rawAngularSpeed);
                        if (speedHistory.length > 5) speedHistory.shift();
                      }
                    }
                    prevSampleAngle = smoothAngle;
                    prevSampleTimeSec = currentTimeSec;

                    const smoothAngularSpeed = speedHistory.length
                      ? Math.round(speedHistory.reduce((acc, v) => acc + v, 0) / speedHistory.length)
                      : 0;
                    frameSpeed = smoothAngularSpeed;
                    setAngularSpeedDegSec(smoothAngularSpeed);
                    telemetrySamplesRef.current.speeds.push(smoothAngularSpeed);

                    const rom = angleToRomPercent(sessionExerciseId, smoothAngle) ?? 0;
                    frameRom = rom;
                    setRomQuality(rom);
                    telemetrySamplesRef.current.roms.push(rom);

                    let instantPower = 0;
                    const angleDelta =
                      prevSmoothAngle !== null ? Math.abs(smoothAngle - prevSmoothAngle) : 0;
                    const MOVEMENT_DEADZONE = 1.5;

                    if (angleDelta >= MOVEMENT_DEADZONE && dtSec > 0) {
                      const safeDeltaAngle = Math.min(angleDelta, 6.0);
                      const velocityFactor = safeDeltaAngle / (dtSec * 10);
                      instantPower = Math.min(effectiveMass * velocityFactor * 1.2, 850);
                    }

                    powerHistory.push(instantPower);
                    if (powerHistory.length > 8) powerHistory.shift();

                    const smoothedPower = Math.round(
                      powerHistory.reduce((acc, v) => acc + v, 0) / powerHistory.length
                    );
                    framePower = smoothedPower;

                    setPowerScore(smoothedPower);
                    telemetrySamplesRef.current.powers.push(smoothedPower);
                    if (smoothedPower > sessionPeakPower) {
                      sessionPeakPower = smoothedPower;
                      setPeakPowerScore(sessionPeakPower);
                    }
                  }

                  timedTelemetryRef.current.push({
                    timeSec: video.currentTime,
                    angleDeg: frameSmoothAngle,
                    romQuality: frameRom,
                    powerScore: framePower,
                    angularSpeedDegSec: frameSpeed,
                    leftAngleDeg: left,
                    rightAngleDeg: right,
                    symmetryDiffDeg: filteredAsymDiff,
                    torsoTiltDeg: torsoTilt,
                  });
                }
              } catch {
                // Ignora frame non decodificabili e prosegue
              }
            }

            if (ctx) {
              const isStickOnly = stickOnlyModeRef.current;
              const withAngles = showAnglesOverlayRef.current;
              const landmarksToDraw = currentLandmarks || latestKnownLandmarks;

              if (isStickOnly) {
                if (landmarksToDraw) {
                  drawStickmanOverlay(
                    ctx,
                    sessionExerciseId,
                    landmarksToDraw,
                    targetWidth,
                    targetHeight,
                    true,
                    withAngles
                  );
                } else {
                  ctx.fillStyle = '#000000';
                  ctx.fillRect(0, 0, targetWidth, targetHeight);
                }
              } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                if (currentLandmarks) {
                  drawStickmanOverlay(
                    ctx,
                    sessionExerciseId,
                    currentLandmarks,
                    targetWidth,
                    targetHeight,
                    false,
                    withAngles
                  );
                }
              }
            }

            rafId = requestAnimationFrame(processFrame);
          };

          rafId = requestAnimationFrame(processFrame);
        }).catch(() => {
          if (metadataTimeoutId !== null) {
            window.clearTimeout(metadataTimeoutId);
            metadataTimeoutId = null;
          }
          if (analysisSessionIdRef.current !== currentSessionId) return;
          cleanupActiveRuntimeResources();
          setIsProcessing(false);
          setStatusCode('error');
        });
      };

      video.onloadedmetadata = startProcessingWhenReady;
      video.oncanplay = startProcessingWhenReady;
      metadataTimeoutId = window.setTimeout(startProcessingWhenReady, 500);
    } catch {
      cleanupActiveRuntimeResources();
      if (analysisSessionIdRef.current !== currentSessionId) return;
      setIsProcessing(false);
      setStatusCode('error');
    }
  };

  const getRomColor = (val: number) => {
    if (val >= 85) return '#22c55e';
    if (val >= 65) return '#eab308';
    return '#ef4444';
  };

  const getRomLabel = (val: number, hasData: boolean) => {
    if (!hasData && val === 0) return 'In attesa';
    if (val >= 85) return 'Ampiezza ottima';
    if (val >= 65) return 'Parziale';
    return 'Ridotta';
  };

  const getRhythmBadge = (speedDegSec: number, hasData: boolean) => {
    if (!hasData || speedDegSec <= 1) {
      return {
        label: 'In pausa',
        shortLabel: 'Pausa',
        detail: 'Fermo o stabile',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.14)',
        percent: 15,
      };
    }
    if (speedDegSec <= 220) {
      return {
        label: 'Controllato',
        shortLabel: 'OK',
        detail: 'Ritmo fluido',
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.14)',
        percent: Math.min(72, Math.max(25, Math.round((speedDegSec / 220) * 70))),
      };
    }
    return {
      label: 'Un po’ veloce',
      shortLabel: 'Veloce',
      detail: 'Cerca più controllo',
      color: '#eab308',
      bg: 'rgba(234, 179, 8, 0.16)',
      percent: 100,
    };
  };

  const getBalanceBadge = (
    asymDeg: number | null,
    torsoDeg: number | null
  ): { label: string; shortLabel: string; detail: string; color: string; bg: string } | null => {
    if (asymDeg !== null) {
      if (asymDeg <= 8) {
        return {
          label: 'Equilibrio ok',
          shortLabel: 'Equilibrio OK',
          detail: 'Lati allineati',
          color: '#22c55e',
          bg: 'rgba(34, 197, 94, 0.14)',
        };
      }
      if (asymDeg <= 16) {
        return {
          label: 'Leggero sbilanciamento',
          shortLabel: 'Sbilanc. lieve',
          detail: 'Controlla i due lati',
          color: '#eab308',
          bg: 'rgba(234, 179, 8, 0.16)',
        };
      }
      return {
        label: 'Sbilanciamento',
        shortLabel: 'Sbilanciato',
        detail: 'Un lato lavora di più',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.16)',
      };
    }

    if (torsoDeg !== null) {
      if (torsoDeg <= 35) {
        return {
          label: 'Assetto composto',
          shortLabel: 'Assetto OK',
          detail: 'Busto ben tenuto',
          color: '#22c55e',
          bg: 'rgba(34, 197, 94, 0.14)',
        };
      }
      if (torsoDeg <= 55) {
        return {
          label: 'Busto inclinato',
          shortLabel: 'Busto inclin.',
          detail: 'Inclinazione moderata',
          color: '#eab308',
          bg: 'rgba(234, 179, 8, 0.16)',
        };
      }
      return {
        label: 'Molto inclinato',
        shortLabel: 'Busto alto',
        detail: 'Attenzione alla schiena',
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.16)',
      };
    }

    return null;
  };

  const getTrafficLightColor = (code: 'idle' | 'processing' | 'success' | 'error') => {
    switch (code) {
      case 'processing': return '#eab308';
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  if (!authReady) {
    return (
      <>
        <AppBrandHeader />
        <div style={{ minHeight: 'calc(100vh - 107px)', background: '#090d16', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Caricamento...
        </div>
        {renderLegalOverlays()}
      </>
    );
  }

  if (!user || isPasswordRecovery) {
    return (
      <>
        <AppBrandHeader />
        <AuthScreen
          forcePasswordRecovery={isPasswordRecovery}
          onPasswordRecoveryComplete={() => {
            setIsPasswordRecovery(false);
            isPasswordRecoveryRef.current = false;
          }}
        />
        {renderLegalOverlays()}
      </>
    );
  }

  if (subLoading) {
    return (
      <>
        <AppBrandHeader />
        <div style={{ minHeight: 'calc(100vh - 107px)', background: '#090d16', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Verifica abbonamento in corso...
        </div>
        {renderLegalOverlays()}
      </>
    );
  }

  if (currentPlan === 'none' || isSubscriptionExpired) {
    const isRedirecting = checkoutLoadingPlan !== null;

    return (
      <>
        <AppBrandHeader />
        <div style={{ minHeight: 'calc(100vh - 107px)', background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)', color: '#f8fafc', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ maxWidth: 460, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isRedirecting}
                style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: isRedirecting ? 'not-allowed' : 'pointer' }}
              >
                Esci
              </button>
            </div>

            <h2 style={{ textAlign: 'center', color: '#38bdf8', marginBottom: 6 }}>
              {isSubscriptionExpired ? 'Il tuo piano è scaduto' : 'Scegli il tuo piano'}
            </h2>
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Video illimitati su tutti i piani · Disdici quando vuoi
            </p>

            {checkoutNotice && (
              <div
                style={{
                  padding: 12,
                  marginBottom: 14,
                  borderRadius: 8,
                  background: checkoutNotice.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                  border: `1px solid ${checkoutNotice.type === 'success' ? '#22c55e' : '#eab308'}`,
                  color: checkoutNotice.type === 'success' ? '#86efac' : '#fde047',
                  fontSize: 13,
                }}
              >
                {checkoutNotice.text}
              </div>
            )}

            {planError && (
              <div style={{ padding: 12, marginBottom: 14, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f43f5e', fontSize: 13 }}>
                {planError}
              </div>
            )}

            {currentPlan === 'none' && (
              <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #38bdf8', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <h3 style={{ margin: 0, color: '#38bdf8' }}>Trial 7 Giorni</h3>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>Gratis</span>
                </div>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                  Accesso agli esercizi inclusi nel piano Trial. Analisi video illimitate per 7 giorni.
                </p>
                <button
                  type="button"
                  onClick={handleActivateTrial}
                  disabled={isRedirecting}
                  style={{ width: '100%', padding: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: 8, fontWeight: 'bold', cursor: isRedirecting ? 'not-allowed' : 'pointer', opacity: isRedirecting ? 0.6 : 1 }}
                >
                  Attiva Trial Gratuito
                </button>
              </div>
            )}

            <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #334155', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Abbonamento Mensile</h3>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>11,90 € <small style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>/ mese</small></span>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Tutti i 40 esercizi sbloccati. Video illimitati con rinnovo mensile.
              </p>
              <button
                type="button"
                onClick={() => handleSelectPaidPlan('monthly')}
                disabled={isRedirecting}
                style={{ width: '100%', padding: 10, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: isRedirecting ? 'not-allowed' : 'pointer', opacity: isRedirecting && checkoutLoadingPlan !== 'monthly' ? 0.6 : 1 }}
              >
                {checkoutLoadingPlan === 'monthly' ? 'Reindirizzamento a Stripe...' : 'Scegli Mensile'}
              </button>
            </div>

            <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #334155', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Abbonamento Trimestrale</h3>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>24,90 € <small style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>/ 3 mesi</small></span>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Tutti i 40 esercizi sbloccati. Video illimitati per 3 mesi.
              </p>
              <button
                type="button"
                onClick={() => handleSelectPaidPlan('quarterly')}
                disabled={isRedirecting}
                style={{ width: '100%', padding: 10, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: isRedirecting ? 'not-allowed' : 'pointer', opacity: isRedirecting && checkoutLoadingPlan !== 'quarterly' ? 0.6 : 1 }}
              >
                {checkoutLoadingPlan === 'quarterly' ? 'Reindirizzamento a Stripe...' : 'Scegli Trimestrale'}
              </button>
            </div>

            <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #334155', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Abbonamento Semestrale</h3>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>39,90 € <small style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>/ 6 mesi</small></span>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Tutti i 40 esercizi sbloccati. Video illimitati per 6 mesi.
              </p>
              <button
                type="button"
                onClick={() => handleSelectPaidPlan('semiannual')}
                disabled={isRedirecting}
                style={{ width: '100%', padding: 10, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: isRedirecting ? 'not-allowed' : 'pointer', opacity: isRedirecting && checkoutLoadingPlan !== 'semiannual' ? 0.6 : 1 }}
              >
                {checkoutLoadingPlan === 'semiannual' ? 'Reindirizzamento a Stripe...' : 'Scegli Semestrale'}
              </button>
            </div>

            <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #22c55e' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h3 style={{ margin: 0, color: '#22c55e' }}>Abbonamento Annuale (Miglior Valore)</h3>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>69,90 € <small style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>/ anno</small></span>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Tutti i 40 esercizi sbloccati. Video illimitati per 12 mesi.
              </p>
              <button
                type="button"
                onClick={() => handleSelectPaidPlan('annual')}
                disabled={isRedirecting}
                style={{ width: '100%', padding: 10, background: '#22c55e', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: isRedirecting ? 'not-allowed' : 'pointer', opacity: isRedirecting && checkoutLoadingPlan !== 'annual' ? 0.6 : 1 }}
              >
                {checkoutLoadingPlan === 'annual' ? 'Reindirizzamento a Stripe...' : 'Scegli Annuale'}
              </button>
            </div>
          </div>
        </div>
        {renderLegalOverlays()}
      </>
    );
  }

  if (isGuidesOpen) {
    return (
      <>
        <AppBrandHeader />
        <CameraGuidesView
          initialExerciseId={selectedExercise as GuideExerciseId}
          readOnlySelection={areExerciseAndWeightLocked}
          onSelectExercise={(exId) => {
            const matched = sortedExercises.find((ex) => ex.id === exId);
            if (matched && !areExerciseAndWeightLocked) {
              setSelectedExercise(matched.id);
            }
          }}
          onClose={(chosenExerciseId) => {
            setIsGuidesOpen(false);
            if (!areExerciseAndWeightLocked) {
              const targetId = chosenExerciseId ?? selectedExercise;
              const matched = sortedExercises.find((ex) => ex.id === targetId);
              if (matched) {
                setSelectedExercise(matched.id);
              }
            }
          }}
        />
        {renderLegalOverlays()}
      </>
    );
  }

  if (isAnglesGuideOpen) {
    return (
      <>
        <AppBrandHeader />
        <ExerciseAnglesGuideView
          initialExerciseId={selectedExercise as GuideExerciseId}
          readOnlySelection={areExerciseAndWeightLocked}
          onSelectExercise={(exId: GuideExerciseId) => {
            const matched = sortedExercises.find((ex) => ex.id === exId);
            if (matched && !areExerciseAndWeightLocked) {
              setSelectedExercise(matched.id);
            }
          }}
          onClose={(chosenExerciseId) => {
            setIsAnglesGuideOpen(false);
            if (!areExerciseAndWeightLocked && chosenExerciseId) {
              const matched = sortedExercises.find((ex) => ex.id === chosenExerciseId);
              if (matched) {
                setSelectedExercise(matched.id);
              }
            }
          }}
        />
        {renderLegalOverlays()}
      </>
    );
  }

  const loggedUserLabel =
    (user.user_metadata?.username as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    '';

  const hasTelemetryActivity = hasActiveOrCompletedSession && (liveAngleDeg !== null || romQuality > 0);
  const romColor = getRomColor(romQuality);
  const romLabel = getRomLabel(romQuality, hasTelemetryActivity);
  const rhythmBadge = getRhythmBadge(angularSpeedDegSec, hasTelemetryActivity);
  const balanceBadge = hasTelemetryActivity ? getBalanceBadge(symmetryDiffDeg, torsoTiltDeg) : null;

  const leftRomPct = angleToRomPercent(selectedExercise, leftAngleDeg);
  const rightRomPct = angleToRomPercent(selectedExercise, rightAngleDeg);

  const asymColor =
    symmetryDiffDeg === null
      ? '#64748b'
      : symmetryDiffDeg <= 8
      ? '#22c55e'
      : symmetryDiffDeg <= 16
      ? '#eab308'
      : '#ef4444';

  const sideBarColor = symmetryDiffDeg === null ? '#475569' : asymColor;

  const trafficLightColor = getTrafficLightColor(statusCode);

  return (
    <>
      <AppBrandHeader
        showPlanInfo
        currentPlan={currentPlan}
        daysRemaining={daysRemaining}
        userDisplayName={loggedUserLabel}
        areGuidesDisabled={isProcessing}
        onOpenGuides={() => {
          setIsGuidesOpen(true);
        }}
        onOpenAnglesGuide={() => {
          setIsAnglesGuideOpen(true);
        }}
        onLogout={handleLogout}
      />

      <div
        style={{
          minHeight: 'calc(100vh - 107px)',
          background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
          color: '#f8fafc',
          paddingBottom: 40,
        }}
      >
        <div
          style={{
            maxWidth: 500,
            margin: '0 auto',
            padding: 20,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {videoMismatchAlert && (
            <div
              role="alert"
              style={{
                padding: 14,
                marginBottom: 14,
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid #ef4444',
                color: '#fecaca',
                fontSize: 13,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxShadow: '0 8px 16px -4px rgba(239, 68, 68, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 14, color: '#f87171' }}>
                  ⚠️ {videoMismatchAlert.title}
                </strong>
                <button
                  type="button"
                  onClick={() => setVideoMismatchAlert(null)}
                  aria-label="Chiudi avviso incoerenza video"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fca5a5',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
              {videoMismatchAlert.detectedSubject && (
                <div style={{ fontSize: 11.5, color: '#fda4af', fontWeight: 700 }}>
                  Rilevato: {videoMismatchAlert.detectedSubject}
                </div>
              )}
              <p style={{ margin: 0, lineHeight: 1.45, color: '#fee2e2' }}>
                {videoMismatchAlert.message}
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    analysisSessionIdRef.current += 1;
                    resetAnalysisSession({ preserveExerciseAndWeight: true });
                    window.setTimeout(() => {
                      fileInputRef.current?.click();
                    }, 50);
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 7,
                    border: '1px solid #f87171',
                    background: 'rgba(248, 113, 113, 0.18)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📤 Carica un altro video
                </button>
              </div>
            </div>
          )}

          {planError && (
            <div
              style={{
                padding: 12,
                marginBottom: 14,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{planError}</span>
              <button
                type="button"
                onClick={() => setPlanError(null)}
                aria-label="Chiudi avviso"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fca5a5',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. SELEZIONA L'ESERCIZIO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label htmlFor="exercise-select-dropdown" style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
              1. Seleziona l'esercizio
            </label>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
              {sortedExercises.length ? `${selectedExerciseIndex + 1} / ${sortedExercises.length}` : '0 / 0'}
            </span>
          </div>

          <div
            style={{
              marginBottom: 10,
              opacity: areExerciseAndWeightLocked ? 0.65 : 1,
            }}
          >
            <select
              id="exercise-select-dropdown"
              aria-label="Seleziona esercizio"
              value={selectedExercise}
              disabled={areExerciseAndWeightLocked}
              onChange={handleExerciseSelectChange}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: 14,
                fontWeight: 700,
                outline: 'none',
                cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.25)',
              }}
            >
              {sortedExercises.map((ex, idx) => {
                const locked = !isExerciseUnlockedForPlan(currentPlan, ex.id, ex.isTrialAllowed);
                return (
                  <option key={ex.id} value={ex.id}>
                    {idx + 1}. {ex.label}
                    {locked ? ' 🔒' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: areExerciseAndWeightLocked ? 0.65 : 1 }}>
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              disabled={areExerciseAndWeightLocked}
              aria-label="Esercizio precedente"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
              }}
            >
              ◀
            </button>

            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              style={{
                flex: 1,
                display: 'flex',
                overflowX: areExerciseAndWeightLocked ? 'hidden' : 'auto',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'auto',
                scrollbarWidth: 'none',
                borderRadius: 14,
              }}
            >
              {sortedExercises.map((ex) => {
                const isSelected = selectedExercise === ex.id;
                const locked = !isExerciseUnlockedForPlan(currentPlan, ex.id, ex.isTrialAllowed);
                return (
                  <div
                    key={ex.id}
                    style={{
                      flex: '0 0 100%',
                      scrollSnapAlign: 'center',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      borderRadius: 14,
                      border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                      background: isSelected ? '#1e293b' : '#0f172a',
                      cursor: 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      opacity: locked ? 0.55 : 1,
                      boxShadow: isSelected ? '0 10px 15px -3px rgba(56, 189, 248, 0.15)' : 'none',
                    }}
                  >
                    {locked && (
                      <span style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        🔒 Abbonati
                      </span>
                    )}
                    <img
                      src={ex.imagePath}
                      alt={ex.label}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (!img.dataset.fallbackApplied) {
                          img.dataset.fallbackApplied = '1';
                          img.src = '/images/logo_icon.png';
                        }
                      }}
                      style={{ width: 110, height: 110, objectFit: 'contain', borderRadius: 8 }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#38bdf8' : '#cbd5e1', textAlign: 'center' }}>
                      {ex.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              disabled={areExerciseAndWeightLocked}
              aria-label="Esercizio successivo"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
              }}
            >
              ▶
            </button>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: '14px 16px',
              borderRadius: 10,
              background: '#1e293b',
              border: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: areExerciseAndWeightLocked ? 0.65 : 1,
            }}
          >
            <div>
              <label htmlFor="weight-kg-input" style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', display: 'block' }}>
                Carico utilizzato
              </label>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {selectedExerciseObj.isDumbbell ? 'Peso del singolo manubrio (kg)' : 'Peso totale (kg)'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleWeightChange(-5)}
                disabled={areExerciseAndWeightLocked}
                aria-label="Riduci carico di 5 kg"
                style={{ width: 32, height: 36, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#38bdf8', fontSize: 16, fontWeight: 'bold', cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer' }}
              >
                -
              </button>
              <input
                id="weight-kg-input"
                type="number"
                value={weightKg}
                onChange={handleWeightInputChange}
                disabled={areExerciseAndWeightLocked}
                style={{
                  width: 55,
                  height: 36,
                  textAlign: 'center',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#f8fafc',
                  fontSize: 16,
                  fontWeight: 800,
                  outline: 'none',
                  cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'text',
                }}
              />
              <button
                type="button"
                onClick={() => handleWeightChange(5)}
                disabled={areExerciseAndWeightLocked}
                aria-label="Aumenta carico di 5 kg"
                style={{ width: 32, height: 36, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#38bdf8', fontSize: 16, fontWeight: 'bold', cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer' }}
              >
                +
              </button>
            </div>
          </div>

          {/* 2. CARICA VIDEO */}
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
                  2. Carica video
                </span>
                <button
                  type="button"
                  aria-label="Informazioni formati video supportati"
                  onClick={() => setIsFormatsModalOpen(true)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '1px solid #38bdf8',
                    background: 'rgba(56, 189, 248, 0.14)',
                    color: '#38bdf8',
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ?
                </button>
              </div>

              <span
                aria-label="Semaforo analisi video"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: trafficLightColor,
                  boxShadow: `0 0 8px ${trafficLightColor}`,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
            </div>

            <input
              type="file"
              accept="video/*"
              ref={fileInputRef}
              onChange={handleVideoUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              disabled={hasActiveOrCompletedSession || isExerciseLocked}
              onClick={() => {
                if (!hasActiveOrCompletedSession && !isExerciseLocked) {
                  fileInputRef.current?.click();
                }
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '22px 16px',
                borderRadius: 12,
                border: isExerciseLocked || hasActiveOrCompletedSession ? '2px dashed #64748b' : '2px dashed #38bdf8',
                background: isExerciseLocked ? '#0f172a' : isProcessing ? '#1e293b' : 'rgba(56, 189, 248, 0.05)',
                color: '#f8fafc',
                textAlign: 'center',
                cursor: hasActiveOrCompletedSession || isExerciseLocked ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                opacity: hasActiveOrCompletedSession && !isProcessing ? 0.65 : 1,
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>{isExerciseLocked ? '🔒' : '📤'}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: isExerciseLocked ? '#94a3b8' : '#38bdf8' }}>
                {isExerciseLocked
                  ? 'Esercizio bloccato per questo piano'
                  : isProcessing
                  ? 'Elaborazione in corso...'
                  : hasActiveOrCompletedSession
                  ? 'Usa "Nuova analisi" per caricare un altro video'
                  : 'Seleziona file video'}
              </span>
            </button>

            {isProcessing && (
              <div style={{ marginTop: 14, padding: 14, background: '#1e293b', borderRadius: 10, border: '1px solid #334155', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: '#94a3b8' }}>Avanzamento analisi:</span>
                  <span style={{ fontWeight: 800, color: '#38bdf8' }}>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', background: '#0f172a', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, background: '#38bdf8', height: '100%', transition: 'width 0.1s linear' }} />
                </div>
              </div>
            )}
          </div>

          {/* 3. TASTO INTERROMPI ANALISI */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              disabled={!isProcessing}
              onClick={handleInterruptAnalysis}
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                border: isProcessing ? '1px solid #f43f5e' : '1px solid #334155',
                background: isProcessing ? 'rgba(244, 63, 94, 0.12)' : '#0f172a',
                color: isProcessing ? '#fda4af' : '#64748b',
                fontSize: 13,
                fontWeight: 700,
                cursor: isProcessing ? 'pointer' : 'not-allowed',
                opacity: isProcessing ? 1 : 0.65,
                transition: 'all 0.2s ease',
              }}
            >
              ⏹ Interrompi analisi
            </button>
          </div>

          {/* 4. CONTROLLI PLAYER */}
          <div
            style={{
              marginTop: 16,
              padding: '8px 10px',
              background: '#1e293b',
              borderRadius: 10,
              border: '1px solid #334155',
              display: 'flex',
              flexWrap: 'nowrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 6,
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                aria-label="Spiegazione controlli player: Angoli, Video + Hs e Solo Hs"
                onClick={() => setIsPlayerHelpModalOpen(true)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: '1px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.14)',
                  color: '#38bdf8',
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                ?
              </button>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 7px',
                  borderRadius: 6,
                  background: showAnglesOverlay ? 'rgba(250, 204, 21, 0.14)' : '#0f172a',
                  border: showAnglesOverlay ? '1px solid rgba(250, 204, 21, 0.55)' : '1px solid #334155',
                  color: showAnglesOverlay ? '#fde047' : '#94a3b8',
                  fontSize: 10.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={showAnglesOverlay}
                  onChange={(e) => setShowAnglesOverlay(e.target.checked)}
                  style={{ margin: 0, accentColor: '#facc15', cursor: 'pointer' }}
                />
                Angoli
              </label>
            </div>

            <div
              style={{
                display: 'inline-flex',
                background: '#0f172a',
                borderRadius: 8,
                padding: 2,
                border: '1px solid #334155',
                gap: 3,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setStickOnlyMode(false)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: !stickOnlyMode ? '#38bdf8' : 'transparent',
                  color: !stickOnlyMode ? '#0f172a' : '#94a3b8',
                  fontSize: 10.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                🎥 Video + Hs
              </button>
              <button
                type="button"
                onClick={() => setStickOnlyMode(true)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: stickOnlyMode ? '#38bdf8' : 'transparent',
                  color: stickOnlyMode ? '#0f172a' : '#94a3b8',
                  fontSize: 10.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                🦴 Solo Hs
              </button>
            </div>
          </div>

          {/* 5. SEZIONE VIDEO E VELOCITÀ */}
          {statusCode === 'success' && (
            <div
              aria-label="Sintesi movimento durante il replay"
              style={{
                position: 'sticky',
                top: 8,
                zIndex: 25,
                marginTop: 10,
                padding: '7px 8px',
                borderRadius: 10,
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid #38bdf8',
                boxShadow: '0 8px 18px -4px rgba(0, 0, 0, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              <span
                style={{
                  padding: '3px 7px',
                  borderRadius: 7,
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: hasTelemetryActivity ? romColor : '#94a3b8',
                  background: hasTelemetryActivity ? `${romColor}22` : 'rgba(148, 163, 184, 0.14)',
                  border: `1px solid ${hasTelemetryActivity ? `${romColor}66` : '#334155'}`,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                ROM {hasTelemetryActivity ? `${romQuality}%` : '—'}
              </span>

              <span
                style={{
                  padding: '3px 7px',
                  borderRadius: 7,
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: rhythmBadge.color,
                  background: rhythmBadge.bg,
                  border: '1px solid rgba(51, 65, 85, 0.8)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Ritmo: {rhythmBadge.shortLabel}
              </span>

              {balanceBadge && (
                <span
                  style={{
                    padding: '3px 7px',
                    borderRadius: 7,
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: balanceBadge.color,
                    background: balanceBadge.bg,
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {balanceBadge.shortLabel}
                </span>
              )}

              {showTechnicalDetails && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: '#38bdf8',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {liveAngleDeg !== null ? `${liveAngleDeg}°` : '—'} · <span style={{ color: '#f43f5e' }}>{powerScore}W</span>
                </span>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 10,
              width: '100%',
              background: '#0f172a',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #334155',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ position: 'relative', width: '100%', background: '#000' }}>
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  background: '#000',
                }}
              />
              <video
                ref={videoRef}
                controls={false}
                style={{
                  display: 'none',
                  width: '100%',
                  height: 'auto',
                  background: '#000',
                }}
                muted
                playsInline
                preload="auto"
              />
            </div>

            {statusCode === 'success' && (
              <div
                style={{
                  padding: '10px 12px',
                  background: '#1e293b',
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    aria-label={isReplayPlaying ? 'Metti in pausa' : 'Riproduci video'}
                    onClick={() => {
                      const vid = videoRef.current;
                      if (!vid) return;
                      if (vid.paused || vid.ended) {
                        if (vid.ended) {
                          vid.currentTime = 0;
                        }
                        vid.muted = true;
                        vid.playbackRate = replaySpeed;
                        void vid.play();
                      } else {
                        vid.pause();
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #38bdf8',
                      background: 'rgba(56, 189, 248, 0.16)',
                      color: '#38bdf8',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      flexShrink: 0,
                      touchAction: 'manipulation',
                    }}
                  >
                    {isReplayPlaying ? '⏸ Pausa' : '▶ Play'}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={replayDuration > 0 ? replayDuration : 100}
                    step={0.05}
                    value={Math.min(replayCurrentTime, replayDuration > 0 ? replayDuration : 100)}
                    aria-label="Posizione riproduzione video"
                    onChange={(e) => {
                      const vid = videoRef.current;
                      if (!vid) return;
                      const nextTime = parseFloat(e.target.value);
                      if (!isNaN(nextTime)) {
                        vid.currentTime = nextTime;
                        setReplayCurrentTime(nextTime);
                      }
                    }}
                    style={{
                      flex: 1,
                      accentColor: '#38bdf8',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                  />

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#cbd5e1',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTimeSec(replayCurrentTime)} / {formatTimeSec(replayDuration)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingTop: 6,
                    borderTop: '1px solid rgba(51, 65, 85, 0.7)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                    Velocità replay (sincronizzata con i dati):
                  </span>
                  <div
                    role="group"
                    aria-label="Velocità di riproduzione replay"
                    style={{
                      display: 'inline-flex',
                      background: '#0f172a',
                      borderRadius: 7,
                      padding: 2,
                      border: '1px solid #334155',
                      gap: 3,
                    }}
                  >
                    {REPLAY_SPEEDS.map((spd) => {
                      const active = replaySpeed === spd;
                      return (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => {
                            setReplaySpeed(spd);
                            if (videoRef.current) {
                              videoRef.current.playbackRate = spd;
                            }
                          }}
                          style={{
                            padding: '4px 9px',
                            borderRadius: 5,
                            border: 'none',
                            background: active ? '#38bdf8' : 'transparent',
                            color: active ? '#0f172a' : '#94a3b8',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {spd === 1 ? '1x' : `${spd}x`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. LETTURA RAPIDA MOVIMENTO */}
          <div style={{ marginTop: 16, padding: 16, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                  Lettura Rapida Movimento
                </span>
                <button
                  type="button"
                  aria-label="Significato dati Lettura Rapida Movimento e Dettagli tecnici"
                  onClick={() => setIsQuickReadHelpModalOpen(true)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '1px solid #38bdf8',
                    background: 'rgba(56, 189, 248, 0.14)',
                    color: '#38bdf8',
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  ?
                </button>
              </div>
              {statusCode === 'success' && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                  Sincronizzato al video
                </span>
              )}
            </div>

            {/* 1. AMPIEZZA DEL MOVIMENTO (ROM %) */}
            <div style={{ padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                    Ampiezza del movimento
                  </span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: hasTelemetryActivity ? romColor : '#94a3b8', lineHeight: 1.15 }}>
                    {hasTelemetryActivity ? `${romQuality}%` : '—'}
                  </span>
                </div>
                <span
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    color: hasTelemetryActivity ? romColor : '#94a3b8',
                    background: hasTelemetryActivity ? `${romColor}22` : 'rgba(148, 163, 184, 0.14)',
                    border: `1px solid ${hasTelemetryActivity ? `${romColor}66` : '#334155'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {romLabel}
                </span>
              </div>

              <div style={{ width: '100%', height: 10, background: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${hasTelemetryActivity ? romQuality : 0}%`,
                    height: '100%',
                    background: romColor,
                    transition: 'width 0.12s ease, background 0.2s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 5 }}>
                <span>Ridotta</span>
                <span>Parziale (65%+)</span>
                <span>Completa (85%+)</span>
              </div>
            </div>

            {/* 2. RITMO / CONTROLLO + 3. ASSETTO / EQUILIBRIO */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: balanceBadge ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                gap: 10,
              }}
            >
              <div style={{ padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase', marginBottom: 6 }}>
                  Ritmo esecuzione
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 9px',
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 800,
                    color: rhythmBadge.color,
                    background: rhythmBadge.bg,
                    marginBottom: 6,
                  }}
                >
                  {rhythmBadge.label}
                </span>
                <div style={{ width: '100%', height: 6, background: '#1e293b', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
                  <div
                    style={{
                      width: `${rhythmBadge.percent}%`,
                      height: '100%',
                      background: rhythmBadge.color,
                      transition: 'width 0.15s ease, background 0.2s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>
                  {rhythmBadge.detail}
                </span>
              </div>

              {balanceBadge && (
                <div style={{ padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase', marginBottom: 6 }}>
                    Assetto / Equilibrio
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 9px',
                      borderRadius: 7,
                      fontSize: 13,
                      fontWeight: 800,
                      color: balanceBadge.color,
                      background: balanceBadge.bg,
                      marginBottom: 6,
                    }}
                  >
                    {balanceBadge.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', lineHeight: 1.35 }}>
                    {balanceBadge.detail}
                  </span>
                </div>
              )}
            </div>

            {/* TOGGLE DETTAGLI TECNICI */}
            <div style={{ marginTop: 12, borderTop: '1px solid #334155', paddingTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowTechnicalDetails((prev) => !prev)}
                aria-expanded={showTechnicalDetails}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>⚙️ Dettagli tecnici (angolo, W, °/s, assetto)</span>
                <span style={{ color: '#38bdf8' }}>{showTechnicalDetails ? '▲ Nascondi' : '▼ Espandi'}</span>
              </button>

              {showTechnicalDetails && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: 10, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Angolo Articolare
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 900, color: '#38bdf8', lineHeight: 1.1 }}>
                        {liveAngleDeg !== null ? `${liveAngleDeg}°` : '—'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Potenza Istantanea
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: '#f43f5e', lineHeight: 1.1 }}>
                        {powerScore} W
                      </span>
                      <span style={{ fontSize: 11, color: '#cbd5e1', display: 'block', marginTop: 2 }}>
                        Picco: <strong style={{ color: '#fda4af' }}>{peakPowerScore} W</strong>
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>Andamento Potenza</span>
                      <span style={{ color: '#f43f5e' }}>{powerScore} W / {Math.max(peakPowerScore, 100)} W</span>
                    </div>
                    <div style={{ width: '100%', height: 9, background: '#0f172a', borderRadius: 5, overflow: 'hidden', border: '1px solid #334155' }}>
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, Math.round((powerScore / Math.max(peakPowerScore, 150)) * 100)))}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #fb7185, #f43f5e)',
                          transition: 'width 0.1s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>Velocità Angolare / Ritmo</span>
                      <span style={{ color: angularSpeedDegSec > 240 ? '#eab308' : '#38bdf8' }}>
                        {angularSpeedDegSec} °/s
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 9, background: '#0f172a', borderRadius: 5, overflow: 'hidden', border: '1px solid #334155' }}>
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, Math.round((angularSpeedDegSec / 300) * 100)))}%`,
                          height: '100%',
                          background: angularSpeedDegSec > 240 ? '#eab308' : '#38bdf8',
                          transition: 'width 0.1s ease, background 0.2s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8' }}>Simmetria SX / DX (ROM)</span>
                      <span style={{ color: asymColor }}>
                        {symmetryDiffDeg !== null ? `Asimmetria Δ ${symmetryDiffDeg}°` : 'Lato coperto / N/D'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#cbd5e1', marginBottom: 2 }}>
                          <span>SX</span>
                          <span>
                            {leftAngleDeg !== null && leftRomPct !== null
                              ? `ROM ${leftRomPct}% (${leftAngleDeg}°)`
                              : 'N/D'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden', border: '1px solid #334155' }}>
                          <div
                            style={{
                              width: `${leftRomPct !== null ? leftRomPct : 0}%`,
                              height: '100%',
                              background: sideBarColor,
                              transition: 'width 0.1s ease, background 0.2s ease',
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#cbd5e1', marginBottom: 2 }}>
                          <span>DX</span>
                          <span>
                            {rightAngleDeg !== null && rightRomPct !== null
                              ? `ROM ${rightRomPct}% (${rightAngleDeg}°)`
                              : 'N/D'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden', border: '1px solid #334155' }}>
                          <div
                            style={{
                              width: `${rightRomPct !== null ? rightRomPct : 0}%`,
                              height: '100%',
                              background: sideBarColor,
                              transition: 'width 0.1s ease, background 0.2s ease',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>Inclinazione Busto (vs verticale)</span>
                      <span
                        style={{
                          color:
                            torsoTiltDeg === null
                              ? '#64748b'
                              : torsoTiltDeg <= 35
                              ? '#22c55e'
                              : torsoTiltDeg <= 55
                              ? '#eab308'
                              : '#f97316',
                        }}
                      >
                        {torsoTiltDeg !== null ? `${torsoTiltDeg}°` : 'N/D'}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 9, background: '#0f172a', borderRadius: 5, overflow: 'hidden', border: '1px solid #334155' }}>
                      <div
                        style={{
                          width: `${torsoTiltDeg !== null ? Math.max(4, Math.min(100, Math.round((torsoTiltDeg / 90) * 100))) : 0}%`,
                          height: '100%',
                          background:
                            torsoTiltDeg === null
                              ? '#475569'
                              : torsoTiltDeg <= 35
                              ? '#22c55e'
                              : torsoTiltDeg <= 55
                              ? '#eab308'
                              : '#f97316',
                          transition: 'width 0.1s ease, background 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 7. AI COACH */}
          <div style={{ marginTop: 16, padding: 18, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: getTrafficLightColor(aiStatusCode),
                    boxShadow: `0 0 8px ${getTrafficLightColor(aiStatusCode)}`,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <h4 style={{ margin: 0, color: '#f43f5e', fontSize: 16, fontWeight: 800 }}>AI Coach</h4>
              </div>

              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                {aiStatusCode === 'idle' && isProcessing
                  ? 'In attesa del completamento analisi video...'
                  : aiStatusMessage}
              </span>
            </div>

            {aiStatusCode === 'idle' && (
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                {isProcessing
                  ? 'Analisi video in corso: il feedback AI Coach partirà al termine dell’analisi.'
                  : 'Avvia l’analisi di un video per ricevere il feedback dell’AI Coach.'}
              </p>
            )}

            {aiStatusCode === 'processing' && (
              <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: '#94a3b8' }}>Elaborazione feedback IA in corso...</p>
            )}

            {aiStatusCode === 'success' && (
              <div style={{ padding: 14, background: '#0f172a', borderRadius: 10, borderLeft: '4px solid #f43f5e', border: '1px solid #334155' }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#f8fafc' }}>{aiFeedback}</p>
              </div>
            )}

            {aiStatusCode === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: 14, background: '#0f172a', borderRadius: 10, borderLeft: '4px solid #ef4444', border: '1px solid #334155' }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#f43f5e' }}>{aiFeedback}</p>
                </div>
                {!videoMismatchAlert && (
                  <button
                    type="button"
                    onClick={() => {
                      if (lastGeomResultRef.current) {
                        triggerAiCoach(
                          lastGeomResultRef.current.result,
                          lastGeomResultRef.current.exercise,
                          analysisSessionIdRef.current,
                          {
                            weightKg,
                            isDumbbell: selectedExerciseObj.isDumbbell,
                            peakRomPercent: biomechSummary?.peakRomPercent ?? 0,
                            avgRomPercent: biomechSummary?.avgRomPercent ?? 0,
                            peakPowerW: biomechSummary?.peakPowerW ?? 0,
                            avgPowerW: biomechSummary?.avgPowerW ?? 0,
                            maxAsymmetryDeg: biomechSummary?.maxAsymmetryDeg ?? null,
                            torsoOscillationDeg: biomechSummary?.torsoOscillationDeg ?? null,
                          }
                        );
                      }
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    🔄 Riprova IA
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 8. RIEPILOGO BIOMECCANICO DI SESSIONE */}
          {analysisResult && (
            <div style={{ marginTop: 16, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
                aria-expanded={isAnalysisOpen}
                style={{
                  width: '100%',
                  border: 'none',
                  padding: '16px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: '#1e293b',
                  userSelect: 'none',
                }}
              >
                <span style={{ margin: 0, color: '#38bdf8', fontSize: 16, fontWeight: 800 }}>
                  📊 Riepilogo Biomeccanico di Sessione
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
                  {isAnalysisOpen ? '▲ Chiudi' : '▼ Espandi'}
                </span>
              </button>

              {isAnalysisOpen && (
                <div style={{ padding: '0 18px 18px 18px', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ margin: '12px 0 0 0', fontSize: 13, color: '#cbd5e1', lineHeight: 1.45 }}>
                    {analysisResult.trendSummary}
                  </p>

                  <div style={{ padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Escursione Angolare & ROM</span>
                      <span style={{ color: getRomColor(biomechSummary?.peakRomPercent ?? 0) }}>
                        ROM Max {biomechSummary?.peakRomPercent ?? 0}% · Media {biomechSummary?.avgRomPercent ?? 0}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 9, background: '#1e293b', borderRadius: 5, overflow: 'hidden', marginBottom: 8 }}>
                      <div
                        style={{
                          width: `${biomechSummary?.peakRomPercent ?? 0}%`,
                          height: '100%',
                          background: getRomColor(biomechSummary?.peakRomPercent ?? 0),
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                      <span>Min / Max: <strong>{biomechSummary?.minAngle ?? analysisResult.minAngle}° / {biomechSummary?.maxAngle ?? analysisResult.maxAngle}°</strong></span>
                      <span>Ampiezza (°): <strong>{biomechSummary?.romSpanDeg ?? Math.abs(analysisResult.maxAngle - analysisResult.minAngle)}°</strong></span>
                    </div>
                  </div>

                  <div style={{ padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Potenza di Sessione</span>
                      <span style={{ color: '#f43f5e' }}>
                        Picco {biomechSummary?.peakPowerW ?? 0} W · Media {biomechSummary?.avgPowerW ?? 0} W
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 9, background: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(4, Math.min(100, Math.round(((biomechSummary?.peakPowerW ?? 0) / 850) * 100)))}%`,
                          height: '100%',
                          background: '#f43f5e',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Ritmo & Velocità Angolare</span>
                      <span style={{ color: '#38bdf8' }}>
                        Picco {biomechSummary?.peakAngularSpeedDegSec ?? 0} °/s · Media {biomechSummary?.avgAngularSpeedDegSec ?? 0} °/s
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 9, background: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(4, Math.min(100, Math.round(((biomechSummary?.peakAngularSpeedDegSec ?? 0) / 300) * 100)))}%`,
                          height: '100%',
                          background: '#38bdf8',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Simmetria Sinistra / Destra</span>
                      <span style={{ color: '#22c55e' }}>
                        {biomechSummary?.maxAsymmetryDeg !== null && biomechSummary?.maxAsymmetryDeg !== undefined
                          ? `Max Δ ${biomechSummary.maxAsymmetryDeg}° · Media Δ ${biomechSummary.avgAsymmetryDeg}°`
                          : 'Lati non simultanei'}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 9, background: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${biomechSummary?.maxAsymmetryDeg !== null && biomechSummary?.maxAsymmetryDeg !== undefined ? Math.max(4, Math.min(100, Math.round((biomechSummary.maxAsymmetryDeg / 25) * 100))) : 0}%`,
                          height: '100%',
                          background: '#22c55e',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Stabilità & Inclinazione Busto</span>
                      <span style={{ color: '#eab308' }}>
                        {biomechSummary?.minTorsoDeg !== null && biomechSummary?.minTorsoDeg !== undefined
                          ? `Range ${biomechSummary.minTorsoDeg}°–${biomechSummary.maxTorsoDeg}° (Oscillazione Δ ${biomechSummary.torsoOscillationDeg}°)`
                          : 'Busto non rilevato'}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 9, background: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${biomechSummary?.torsoOscillationDeg !== null && biomechSummary?.torsoOscillationDeg !== undefined ? Math.max(4, Math.min(100, Math.round((biomechSummary.torsoOscillationDeg / 45) * 100))) : 0}%`,
                          height: '100%',
                          background: '#eab308',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 9. SEGNALA PROBLEMATICA ANALISI */}
          {isTester && (
            <TesterFeedbackPanel
              key={`${analysisSessionIdRef.current}-${aiStatusCode}`}
              userId={user.id}
              defaultVideoFile={lastUploadedFile}
              attachVideoByDefault={Boolean(lastUploadedFile)}
              initialExpanded={false}
              disabled={
                isProcessing ||
                statusCode !== 'success' ||
                !analysisResult ||
                aiStatusCode !== 'success' ||
                !aiFeedback.trim()
              }
              sessionContext={{
                exerciseId: selectedExercise,
                exerciseLabel: selectedExerciseObj.label,
                weightKg,
                liveAngleDeg,
                angularSpeedDegSec,
                symmetryDiffDeg,
                torsoTiltDeg,
                romQuality,
                powerScore,
                minAngle: analysisResult?.minAngle,
                maxAngle: analysisResult?.maxAngle,
                trendSummary: analysisResult?.trendSummary,
              }}
            />
          )}

          {/* 10. TASTO NUOVA ANALISI */}
          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              disabled={!isNewAnalysisEnabled}
              onClick={handleStartNewAnalysis}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: isNewAnalysisEnabled ? '1px solid #22c55e' : '1px solid #334155',
                background: isNewAnalysisEnabled ? 'rgba(34, 197, 94, 0.16)' : '#0f172a',
                color: isNewAnalysisEnabled ? '#86efac' : '#64748b',
                fontSize: 14,
                fontWeight: 800,
                cursor: isNewAnalysisEnabled ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              🔁 Nuova analisi
            </button>
          </div>

          <footer
            style={{
              marginTop: 24,
              paddingTop: 14,
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            <button
              type="button"
              onClick={() => setLegalTab('privacy')}
              style={{ background: 'none', border: 'none', padding: 0, color: '#94a3b8', textDecoration: 'underline', fontSize: 12, cursor: 'pointer' }}
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLegalTab('terms')}
              style={{ background: 'none', border: 'none', padding: 0, color: '#94a3b8', textDecoration: 'underline', fontSize: 12, cursor: 'pointer' }}
            >
              Termini d'Uso
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleOpenCookiePreferences}
              style={{ background: 'none', border: 'none', padding: 0, color: '#94a3b8', textDecoration: 'underline', fontSize: 12, cursor: 'pointer' }}
            >
              Preferenze Cookie
            </button>
            {analyticsConsent && <span style={{ display: 'none' }} aria-hidden="true" />}
          </footer>
        </div>
      </div>

      {/* MODALE FORMATI VIDEO SUPPORTATI */}
      {isFormatsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Formati video supportati"
          onClick={() => setIsFormatsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(2, 6, 23, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: 12,
              border: '1px solid #38bdf8',
              padding: 18,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#38bdf8' }}>
                Formati video supportati
              </h3>
              <button
                type="button"
                aria-label="Chiudi modale formati"
                onClick={() => setIsFormatsModalOpen(false)}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
              Formati supportati: MP4, MOV, WebM (max 50 MB)
            </p>
          </div>
        </div>
      )}

      {/* MODALE HELPER CONTROLLI PLAYER */}
      {isPlayerHelpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Spiegazione controlli player"
          onClick={() => setIsPlayerHelpModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(2, 6, 23, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: 12,
              border: '1px solid #38bdf8',
              padding: 18,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#38bdf8' }}>
                A cosa servono i controlli del player
              </h3>
              <button
                type="button"
                aria-label="Chiudi modale controlli player"
                onClick={() => setIsPlayerHelpModalOpen(false)}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#e2e8f0', lineHeight: 1.45 }}>
              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#fde047', display: 'block', marginBottom: 3 }}>
                  📐 Angoli
                </strong>
                Mostra o nasconde sul canvas i settori e i gradi dell'angolo articolare principale (SX / DX) durante l'analisi e il replay.
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#38bdf8', display: 'block', marginBottom: 3 }}>
                  🎥 Video + Hs
                </strong>
                Sovrappone lo scheletro (Human Stick) e gli eventuali angoli direttamente sopra il video originale per verificare l'allineamento con il movimento reale.
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#38bdf8', display: 'block', marginBottom: 3 }}>
                  🦴 Solo Hs
                </strong>
                Nasconde il video di sfondo e mostra solo lo scheletro su sfondo nero, utile per isolare la traiettoria articolare senza distrazioni visive.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE HELPER LETTURA RAPIDA MOVIMENTO E DETTAGLI TECNICI */}
      {isQuickReadHelpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Significato dati Lettura Rapida Movimento e Dettagli tecnici"
          onClick={() => setIsQuickReadHelpModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(2, 6, 23, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: 12,
              border: '1px solid #38bdf8',
              padding: 18,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#38bdf8' }}>
                Significato dei dati · Lettura Rapida & Dettagli
              </h3>
              <button
                type="button"
                aria-label="Chiudi modale significato dati"
                onClick={() => setIsQuickReadHelpModalOpen(false)}
                style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.45 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Lettura Rapida Movimento
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#f8fafc', display: 'block', marginBottom: 2 }}>
                  Ampiezza del movimento (ROM %)
                </strong>
                Percentuale di escursione articolare raggiunta rispetto al range di riferimento dell'esercizio (85%+ completa, 65%–84% parziale, sotto il 65% ridotta).
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#f8fafc', display: 'block', marginBottom: 2 }}>
                  Ritmo esecuzione
                </strong>
                Valuta la velocità angolare del movimento: segnala se l'esecuzione è in pausa, controllata/fluida o troppo veloce rispetto alla soglia di controllo.
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#f8fafc', display: 'block', marginBottom: 2 }}>
                  Assetto / Equilibrio
                </strong>
                Indica il bilanciamento tra lato sinistro e destro (quando entrambi i lati sono ben visibili) oppure l'inclinazione del busto rispetto alla verticale.
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>
                Dettagli tecnici
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#38bdf8', display: 'block', marginBottom: 2 }}>
                  Angolo articolare (°)
                </strong>
                Valore istantaneo in gradi dell'articolazione chiave per l'esercizio selezionato nel fotogramma corrente.
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#f43f5e', display: 'block', marginBottom: 2 }}>
                  Potenza istantanea, Picco e Andamento potenza (W)
                </strong>
                Stima della potenza espressa in watt calcolata a partire dal carico impostato (raddoppiato se l'esercizio usa due manubri) e dalla variazione angolare nel tempo; <em>Picco</em> è il valore massimo registrato nella sessione.
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#f8fafc', display: 'block', marginBottom: 2 }}>
                  Velocità angolare / Ritmo (°/s)
                </strong>
                Velocità con cui cambia l'angolo articolare al secondo: aiuta a distinguere fasi concentriche/eccentriche controllate da movimenti bruschi.
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#f8fafc', display: 'block', marginBottom: 2 }}>
                  Simmetria SX / DX (ROM e Asimmetria Δ)
                </strong>
                Confronta ROM e angolo del lato sinistro (SX) e destro (DX); <em>Asimmetria Δ</em> mostra la differenza in gradi tra i due lati quando entrambi sono rilevati con buona affidabilità.
              </div>

              <div style={{ padding: 10, background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
                <strong style={{ color: '#f8fafc', display: 'block', marginBottom: 2 }}>
                  Inclinazione busto (vs verticale)
                </strong>
                Angolo in gradi del tronco (linea spalle-anche) rispetto alla verticale (0° = perfettamente eretto, valori più alti = busto più inclinato in avanti).
              </div>
            </div>
          </div>
        </div>
      )}

      {renderLegalOverlays()}
    </>
  );
}

export default App;