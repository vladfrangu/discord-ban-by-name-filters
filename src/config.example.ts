import type { Snowflake } from 'discord-api-types/globals';

/**
 * The bot prefix to use
 */
export const prefix = 'tr.';

/**
 * The bot token
 */
export const token = '';

/**
 * Roles that should be able to run commands
 */
export const adminRoles: Snowflake[] = [];

/**
 * The guild id where members should join and be monitored in
 */
export const guildId: Snowflake = '123';

/**
 * The channel id to log the actions taken to the member
 */
export const logChannelId: Snowflake = '';
