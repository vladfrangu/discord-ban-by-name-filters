import { opendir, readFile } from 'fs/promises';
import { join } from 'path';
import Resemble, { ResembleComparisonResult } from 'resemblejs';

export const avatarImagesPath = join(__dirname, '..', '..', '..', 'data', 'avatars');

export const loadedAvatars = new Map<string, Buffer>();

export type CheckResult = { matched: false } | { matched: true; avatarName: string; matchPercentage: string };

export async function checkAvatar(buffer: Buffer): Promise<CheckResult> {
	for (const [avatarName, image] of loadedAvatars.entries()) {
		const result = await new Promise<ResembleComparisonResult>((resolve) => {
			Resemble(image)
				.compareTo(buffer)
				.scaleToSameSize()
				.setReturnEarlyThreshold(20)
				.onComplete((result) => resolve(result));
		});

		/*
		{
		  isSameDimensions: true,
		  dimensionDifference: { width: 0, height: 0 },
		  rawMisMatchPercentage: 99.22960069444444,
		  misMatchPercentage: '99.23',
		  diffBounds: { top: 0, left: 0, bottom: 95, right: 95 },
		  analysisTime: 14,
		  getImageDataUrl: [Function (anonymous)],
		  getBuffer: [Function (anonymous)]
		}
		*/

		const numberedPercentage = Number(result.misMatchPercentage);

		// Images that are more than 10% different are highly unlikely to be a match... 🤞
		if (numberedPercentage > 10) continue;

		return { matchPercentage: result.misMatchPercentage, avatarName, matched: true };
	}

	return { matched: false };
}

export async function loadAvatars() {
	loadedAvatars.clear();
	await traverseDirectory(avatarImagesPath);
}

async function traverseDirectory(directory: string, label = '') {
	for await (const entry of await opendir(directory)) {
		if (entry.isFile()) {
			if (entry.name.startsWith('.')) continue;

			loadedAvatars.set(
				`${label}${entry.name.slice(0, entry.name.lastIndexOf('.'))}`,
				await readFile(join(directory, entry.name)),
			);
		} else if (entry.isDirectory()) {
			await traverseDirectory(join(directory, entry.name), `${label}${entry.name}/`);
		}
	}
}
