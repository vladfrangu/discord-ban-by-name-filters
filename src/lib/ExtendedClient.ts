import { SapphireClient } from '@sapphire/framework';
import { prefix } from '../config';

export class ExtendedClient extends SapphireClient {
	public fetchPrefix = () => prefix;
}
