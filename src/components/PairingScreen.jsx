import { useRef } from 'react';
import { useMirrorSync } from '../hooks/useMirrorSync';
import { useGuestMode } from '../contexts/GuestModeContext';

// NOTE: No HandTrackingService here — SmartMirror already owns the single WASM
// instance and its CursorOverlay (position:fixed, z-9999) floats above this
// screen. SmartMirror's pinch-to-click uses document.elementFromPoint, so it
// fires on any button visible on screen, including "Enter Mirror →" below.

// ─── Main pairing / login screen ─────────────────────────────────────────────

export default function PairingScreen() {
  const { phase, qrData, shortCode, qrExpiring, bridgeOnline, factoryReset } = useMirrorSync();
  const { enterGuest } = useGuestMode();

  const visible = phase === 'booting' || phase === 'pairing';
  if (!visible) return null;

  const hasQR     = Boolean(qrData?.dataUrl);
  const isBooting = phase === 'booting';

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white select-none">

      {/* Bridge status pill */}
      <div className="mb-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-widest text-gray-500">
        <span className={`h-1.5 w-1.5 rounded-full ${bridgeOnline ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
        {bridgeOnline ? 'Sync service connected' : 'Connecting to sync service…'}
      </div>

      {/* Headline */}
      <h1 className="mb-1 text-4xl font-bold tracking-tight">Welcome</h1>
      <p className="mb-10 text-sm text-gray-400">Sign in with your phone or explore as a guest</p>

      {/* ── Two-column card ────────────────────────────────────────────────── */}
      <div className="flex items-stretch overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">

        {/* Left — QR sign-in */}
        <div className="flex w-72 flex-col items-center justify-between p-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Sign in with phone
          </p>

          <div className="relative flex flex-1 items-center">
            {hasQR ? (
              <img
                src={qrData.dataUrl}
                alt="Pairing QR code"
                width={200}
                height={200}
                className={`rounded-xl ring-1 ring-white/10 transition-opacity duration-500 ${
                  qrExpiring ? 'opacity-20' : 'opacity-100'
                }`}
              />
            ) : (
              <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                <Spinner />
                <span className="text-xs text-gray-500">
                  {isBooting ? 'Starting…' : 'Waiting for session…'}
                </span>
              </div>
            )}

            {qrExpiring && hasQR && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                <span className="rounded-full bg-black/80 px-3 py-1 text-xs text-amber-400">
                  Refreshing…
                </span>
              </div>
            )}
          </div>

          {shortCode && !qrExpiring && (
            <div className="mt-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                Or enter code manually
              </p>
              <p className="font-mono text-xl font-bold tracking-[0.25em] text-white">
                {shortCode}
              </p>
            </div>
          )}

          {(!shortCode || qrExpiring) && (
            <p className="mt-4 text-center text-[11px] text-gray-600">
              Open the mirror app<br />and scan to link
            </p>
          )}
        </div>

        {/* Center divider with OR */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-px flex-1 bg-white/10" />
          <span className="my-3 text-[11px] font-semibold uppercase tracking-widest text-gray-700">
            or
          </span>
          <div className="w-px flex-1 bg-white/10" />
        </div>

        {/* Right — Guest mode */}
        <div className="flex w-72 flex-col items-center justify-between p-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Continue as guest
          </p>

          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl ring-1 ring-white/20">
              👤
            </div>

            <div>
              <p className="text-base font-semibold text-white">Guest Mode</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                Explore all mirror widgets<br />without linking an account
              </p>
            </div>

            {/* Gesture-clickable — SmartMirror's pinch handler fires el.click()
                on whatever element is under the cursor, including this button */}
            <button
              onClick={enterGuest}
              className="rounded-full bg-white px-8 py-2.5 text-sm font-semibold text-black
                         transition-all duration-150 hover:bg-gray-200 active:scale-95
                         focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Enter Mirror →
            </button>

            {/* Gesture hint */}
            <p className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span>✋</span>
              <span>Pinch to select</span>
            </p>
          </div>

          <p className="mt-4 text-center text-[11px] text-gray-600">
            No account needed<br />Features may be limited
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-[11px] text-gray-500">
        QR and code refresh every 5 min &nbsp;·&nbsp; point and pinch to interact
      </p>

      <button
        onClick={factoryReset}
        className="mt-3 text-[11px] text-gray-600 transition-colors hover:text-gray-400"
      >
        Reset device
      </button>
    </div>
  );
}

// ─── Account/guest button shown in Settings ───────────────────────────────────

export function DeviceAccountButton({ className = '' }) {
  const { phase, factoryReset } = useMirrorSync();
  const { guestMode, exitGuest } = useGuestMode();

  if (guestMode) {
    return (
      <button
        onClick={exitGuest}
        className={`rounded border border-amber-500/40 px-3 py-1 text-xs text-amber-400
                    hover:border-amber-400 hover:text-amber-300 transition-colors ${className}`}
      >
        Exit Guest Mode
      </button>
    );
  }

  if (phase !== 'ready' && phase !== 'offline' && phase !== 'connecting') return null;

  return (
    <button
      onClick={() => {
        if (window.confirm('Unlink this mirror and restart pairing?')) factoryReset();
      }}
      className={`rounded border border-white/20 px-3 py-1 text-xs text-white/50
                  hover:border-white/50 hover:text-white/80 transition-colors ${className}`}
    >
      Unlink device
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-gray-600" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
