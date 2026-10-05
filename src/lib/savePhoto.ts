// Save a photo (job photo, receipt, or tool) to the device.
//
// On native we write the JPEG to the cache and open the system share sheet —
// its "Save Image" drops it straight into Photos (and also offers Files /
// Messages / Mail). That keeps us off a dedicated gallery plugin and its extra
// native code; the only plist key it needs is NSPhotoLibraryAddUsageDescription.
// On web we just trigger a download.
export async function savePhotoToDevice(dataUrl: string): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const name = `setout-${Date.now()}.jpg`;
    const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
    await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
    await Share.share({ url: uri, dialogTitle: 'Save photo' });
  } else {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `setout-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
