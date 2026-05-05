import { useEffect, useRef } from 'react';
import { saveFaceDescriptor, getFaceDescriptors, getUsers, saveProfiles } from '../data/users';
import { backendApi } from '../services/backendApi';

const FACE_MODEL_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
const POLL_MS = 30_000; // re-check for new face uploads every 30 s

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForFaceApi(attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    if (window.faceapi) return window.faceapi;
    await delay(500);
  }
  return null;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadModels() {
  const faceapi = await waitForFaceApi();
  if (!faceapi) return false;
  try {
    const nets = faceapi.nets;
    if (!nets.ssdMobilenetv1.isLoaded)
      await nets.ssdMobilenetv1.loadFromUri(FACE_MODEL_URL);
    if (!nets.faceLandmark68Net.isLoaded)
      await nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL);
    if (!nets.faceRecognitionNet.isLoaded)
      await nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL);
    return true;
  } catch (e) {
    console.warn('[FaceEnroll] model load failed:', e.message);
    return false;
  }
}

async function descriptorFromUrl(url) {
  const faceapi = window.faceapi;
  if (!faceapi) return null;
  try {
    const img = await faceapi.fetchImage(url);
    const det = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return det?.descriptor ?? null;
  } catch (e) {
    console.warn('[FaceEnroll] descriptor failed for', url, e.message);
    return null;
  }
}

// Ensure the profile is in the mirror's local user list so findUserByFace()
// can resolve its name when a match is found.
function ensureProfileInUserList(backendId, name) {
  const mirrorId = `phone-${backendId}`;
  const { profiles } = getUsers();
  if (profiles.find((p) => p.id === mirrorId)) return;

  saveProfiles([
    ...profiles,
    { id: mirrorId, name, source: 'phone', backendId, faceEnrolled: true },
  ]);
  console.log('[FaceEnroll] Added user to mirror list:', name, mirrorId);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const useFaceEnrollment = () => {
  const modelsReadyRef   = useRef(false);
  // Track which face_filename has already been enrolled to detect re-uploads.
  const enrolledFilesRef = useRef({});   // { 'phone-1': 'profile_1_xyz.jpg' }

  useEffect(() => {
    const mirrorId = backendApi.getMirrorId();
    if (!mirrorId) return;

    const run = async () => {
      // Load face-api.js models once
      if (!modelsReadyRef.current) {
        const ok = await loadModels();
        if (!ok) return;
        modelsReadyRef.current = true;
        console.log('[FaceEnroll] Models ready.');
      }

      // Fetch all profiles linked to this mirror
      let profiles;
      try {
        const res = await fetch(
          `http://127.0.0.1:3000/api/mirror/${mirrorId}/profiles`
        );
        if (!res.ok) return;
        profiles = await res.json();
      } catch (e) {
        console.warn('[FaceEnroll] profile fetch failed:', e.message);
        return;
      }

      const existingDescriptors = getFaceDescriptors();

      for (const p of profiles) {
        if (!p.face_filename) continue;

        const mirrorUserId = `phone-${p.id}`;
        const alreadyEnrolled =
          enrolledFilesRef.current[mirrorUserId] === p.face_filename &&
          existingDescriptors[mirrorUserId];

        if (alreadyEnrolled) continue;

        console.log(`[FaceEnroll] Computing descriptor for ${p.name} (${p.face_filename})`);
        const faceUrl = `http://127.0.0.1:3000/faces/${p.face_filename}`;
        const descriptor = await descriptorFromUrl(faceUrl);

        if (descriptor) {
          saveFaceDescriptor(mirrorUserId, descriptor);
          enrolledFilesRef.current[mirrorUserId] = p.face_filename;
          ensureProfileInUserList(p.id, p.name);
          console.log(`[FaceEnroll] Enrolled: ${p.name}`);
        } else {
          console.warn(`[FaceEnroll] No face detected in photo for ${p.name}`);
        }
      }
    };

    run();
    const id = setInterval(run, POLL_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useFaceEnrollment;
