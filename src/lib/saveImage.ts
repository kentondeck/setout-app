import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Shared helper for the diagram "Save" buttons.
//
// On the native iOS/Android app (Capacitor) we write the PNG to the app's
// cache directory and hand its file:// URI to the native Share plugin —
// that pops the real iOS share sheet with Save to Photos, Save to Files,
// AirDrop, Messages, WhatsApp, etc.
//
// In a plain web browser we try navigator.share, then fall back to a
// pure-DOM overlay preview (long-press → Save Image) so no path is left
// completely dead in dev.

const isNative = () => Capacitor.isNativePlatform();

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') { reject(new Error('bad reader result')); return; }
      // Strip the "data:image/png;base64," prefix — Filesystem.writeFile wants raw base64.
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

export async function shareOrPreviewImage(
  blob: Blob,
  filename: string,
  shareTitle: string,
): Promise<void> {
  // Native app path — write the file, then share the file URI via the iOS/Android share sheet.
  if (isNative()) {
    try {
      const base64 = await blobToBase64(blob);
      const written = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: shareTitle,
        url: written.uri,
        dialogTitle: shareTitle,
      });
      return;
    } catch (err) {
      // User cancelled the share sheet, or a plugin threw — fall through to the browser paths.
      if ((err as Error)?.message?.toLowerCase().includes('cancel')) return;
      console.warn('[saveImage] native share failed, falling back to web', err);
    }
  }

  // Web browser path — modern share API (needs HTTPS)…
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: shareTitle });
      return;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
  }

  // …else pop a full-screen preview so the user can long-press to save.
  showImagePreview(blob, filename);
}

function showImagePreview(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'background:rgba(0,0,0,0.92)',
    'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
    'padding:20px', 'box-sizing:border-box',
    'padding-top:calc(20px + env(safe-area-inset-top))',
    'padding-bottom:calc(20px + env(safe-area-inset-bottom))',
  ].join(';');

  const hint = document.createElement('div');
  hint.textContent = 'Long-press the image → Save Image';
  hint.style.cssText = 'color:#fff;font-size:13px;font-weight:500;margin-bottom:14px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:-0.2px;';

  const img = document.createElement('img');
  img.src = url;
  img.alt = filename;
  img.draggable = false;
  img.style.cssText = 'max-width:100%;max-height:70vh;background:#F5F5F3;border-radius:12px;user-select:none;-webkit-user-select:none;-webkit-touch-callout:default;';

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.style.cssText = 'margin-top:18px;padding:12px 24px;border-radius:12px;background:#fff;color:#0a0a0a;border:none;font-size:15px;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;letter-spacing:-0.2px;';

  const cleanup = () => {
    URL.revokeObjectURL(url);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });
  close.addEventListener('click', cleanup);

  overlay.appendChild(hint);
  overlay.appendChild(img);
  overlay.appendChild(close);
  document.body.appendChild(overlay);
}
