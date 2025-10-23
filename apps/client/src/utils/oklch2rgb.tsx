function multiplyMatrices(A: number[], B: number[]) {
	return [
		A[0] * B[0] + A[1] * B[1] + A[2] * B[2],
		A[3] * B[0] + A[4] * B[1] + A[5] * B[2],
		A[6] * B[0] + A[7] * B[1] + A[8] * B[2],
	];
}

function oklch2oklab([l, c, h]: number[]) {
	return [
		l,
		Number.isNaN(h) ? 0 : c * Math.cos((h * Math.PI) / 180),
		Number.isNaN(h) ? 0 : c * Math.sin((h * Math.PI) / 180),
	];
}

function srgbLinear2rgb(rgb: number[]): number[] {
	return rgb.map((c) =>
		Math.abs(c) > 0.0031308
			? (c < 0 ? -1 : 1) * (1.055 * Math.abs(c) ** (1 / 2.4) - 0.055)
			: 12.92 * c,
	);
}

function oklab2xyz(lab: number[]): number[] {
	const LMSg = multiplyMatrices(
		[
			1, 0.3963377773761749, 0.2158037573099136, 1, -0.1055613458156586,
			-0.0638541728258133, 1, -0.0894841775298119, -1.2914855480194092,
		],
		lab,
	);
	const LMS = LMSg.map((val) => val ** 3);
	return multiplyMatrices(
		[
			1.2268798758459243, -0.5578149944602171, 0.2813910456659647,
			-0.0405757452148008, 1.112286803280317, -0.0717110580655164,
			-0.0763729366746601, -0.4214933324022432, 1.5869240198367816,
		],
		LMS,
	);
}
function xyz2rgbLinear(xyz: number[]): number[] {
	return multiplyMatrices(
		[
			3.2409699419045226, -1.537383177570094, -0.4986107602930034,
			-0.9692436362808796, 1.8759675015077202, 0.04155505740717559,
			0.05563007969699366, -0.20397695888897652, 1.0569715142428786,
		],
		xyz,
	);
}

export function oklch2rgb(lch: number[]): number[] {
	const rgb = srgbLinear2rgb(xyz2rgbLinear(oklab2xyz(oklch2oklab(lch))));
	// clamp to between 0,1
	return rgb.map((v) => Math.max(Math.min(v, 1), 0));
}

// taken from https://gist.github.com/dkaraush/65d19d61396f5f3cd8ba7d1b4b3c9432
