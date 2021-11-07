import { isMainThread, workerData, parentPort } from 'node:worker_threads';
import { fetch, FetchResultTypes } from '@sapphire/fetch';
import { AvatarWorkerData, checkAvatar, ReturnWorkerData } from './avatarProcessing';

if (isMainThread) {
	throw new Error('This can only be ran as a worker.');
}

const casted = workerData as AvatarWorkerData;
const returnData: ReturnWorkerData[] = [];

async function processData() {
	for (const entry of casted.members) {
		console.log(entry);
		const buffer = await fetch(entry.avatarUrl, FetchResultTypes.Buffer);

		const result = await checkAvatar(buffer);

		if (result.matched) {
			returnData.push({
				joinedAt: entry.joinedAt,
				matchedAvatarName: result.avatarName,
				matchedPercentage: result.matchPercentage,
				userId: entry.userId,
				userTag: entry.userTag,
			});
		}
	}
}

void processData().then(() => {
	parentPort!.postMessage({ members: returnData });
});
