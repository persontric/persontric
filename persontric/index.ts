import type { Persontric } from './core.js'
export { TimeSpan } from 'oslo'
export { Cookie } from 'oslo/cookie'
export type { CookieAttributes } from 'oslo/cookie'
export { verifyRequestOrigin } from 'oslo/request'
export { Persontric } from './core.js'
export type {
	Session,
	SessionCookieOptions,
	SessionCookieAttributesOptions,
	Person,
} from './core.js'
export { Scrypt, LegacyScrypt, id__generate } from './crypto.js'
export type { PasswordHashingAlgorithm } from './crypto.js'
export type { DatabaseSession, DatabasePerson, Adapter } from './database.js'
export interface Register {
}
export type RegisterPersontric = Register extends {
		Persontric:infer _Persontric
	}
	? _Persontric extends Persontric<any, any>
		? _Persontric
		: Persontric
	: Persontric;
export type RegisterDatabasePersonAttributes = Register extends {
		DatabasePersonAttributes:infer _DatabasePersonAttributes
	}
	? _DatabasePersonAttributes
	: {};
export type RegisterDatabaseSessionAttributes = Register extends {
		DatabaseSessionAttributes:infer _DatabaseSessionAttributes
	}
	? _DatabaseSessionAttributes
	: {};
