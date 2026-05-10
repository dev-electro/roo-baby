/**
 * Production-ready image utilities
 * - Downscaling to prevent high token costs and timeouts
 * - Orientation correction (handled by Canvas)
 */

export async function downscaleImage(blob, maxWidth = 1280, maxHeight = 1280) {
	if (!blob) return null;
	const img = new Image();
	const url = URL.createObjectURL(blob);
	
	try {
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
			img.src = url;
		});

		let { width, height } = img;
		if (width <= maxWidth && height <= maxHeight) return blob; // No change needed

		const ratio = Math.min(maxWidth / width, maxHeight / height);
		width = Math.floor(width * ratio);
		height = Math.floor(height * ratio);

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, width, height);

		return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
	} finally {
		URL.revokeObjectURL(url);
	}
}
