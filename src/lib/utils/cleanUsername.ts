import { getCode, isLetterOrDigit, isNumber, isWhiteSpace } from '@skyra/char';
import remove, { alphabetMap, characters, confusablesMap } from 'confusables';
import { pattern } from './emojiRegex';

characters.set('r', `${characters.get('r')!}𝚛`);
alphabetMap.get('r')!.push('𝚛');
confusablesMap.set('𝚛', 'r');

export function cleanUsername(input: string) {
	const firstPass = remove(input).replace(pattern, '');

	const split = [...firstPass];

	const finalUsername: string[] = [];

	for (const char of split) {
		const code = getCode(char);

		if (isLetterOrDigit(code) || isNumber(code)) {
			finalUsername.push(char);
		} else if (isWhiteSpace(code)) {
			finalUsername.push(' ');
		}
	}

	return finalUsername.join('');
}
