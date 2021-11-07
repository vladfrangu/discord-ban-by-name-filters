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
				.setReturnEarlyThreshold(10)
				.onComplete((result) => resolve(result));
		});

		console.log(result);

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
			loadedAvatars.set(
				`${label}${entry.name.slice(0, entry.name.lastIndexOf('.'))}`,
				await readFile(join(directory, entry.name)),
			);
		} else if (entry.isDirectory()) {
			await traverseDirectory(join(directory, entry.name), `${label}${entry.name}/`);
		}
	}
}
