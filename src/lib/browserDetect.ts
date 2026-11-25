export interface InstallGuidance {
  isStandalone: boolean;
  label: string;
  instructions: string;
}

/**
 * Detects the current browser & OS (100% client-side) to surface tailored
 * offline PWA installation instructions when beforeinstallprompt is unavailable.
 */
export function getOfflineInstallGuidance(): InstallGuidance {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isStandalone: false,
      label: 'Offline App',
      instructions: 'Use your browser menu to install or add to home screen.',
    };
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  if (isStandalone) {
    return {
      isStandalone: true,
      label: 'Installed Offline App',
      instructions: 'Running in standalone offline-ready mode.',
    };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMac = /Macintosh|Mac OS X/.test(ua) && !isIOS;
  const isFirefox = /Firefox\//.test(ua);
  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !isEdge;
  const isSafari = /Safari\//.test(ua) && !isChrome && !isEdge && !/Chromium\//.test(ua);

  if (isIOS) {
    return {
      isStandalone: false,
      label: 'Install on iPhone / iPad',
      instructions: 'Tap Share (□↑) → "Add to Home Screen" in Safari to run offline.',
    };
  }

  if (isMac && isSafari) {
    return {
      isStandalone: false,
      label: 'Install on Mac (Safari)',
      instructions: 'In Safari menu bar: File → "Add to Dock…" to run as a standalone Mac app.',
    };
  }

  if (isFirefox) {
    return {
      isStandalone: false,
      label: 'Offline Tab Ready (Firefox)',
      instructions: 'Cached for offline use in-tab. Use Chrome, Edge, or Safari to install as a standalone app.',
    };
  }

  if (isMac && (isChrome || isEdge)) {
    return {
      isStandalone: false,
      label: `Install on Mac (${isEdge ? 'Edge' : 'Chrome'})`,
      instructions: 'Click the Install icon in the address bar, or menu → "Install LinkedOut…".',
    };
  }

  if (isChrome || isEdge) {
    return {
      isStandalone: false,
      label: `Install App (${isEdge ? 'Edge' : 'Chrome'})`,
      instructions: 'Click the Install icon in the address bar, or browser menu → "Install LinkedOut".',
    };
  }

  return {
    isStandalone: false,
    label: 'Offline Ready',
    instructions: 'Cached locally. Use your browser menu to install as an app.',
  };
}
