import { createDate, isWithinExpirationDate, TimeSpan } from 'oslo'
import type { Cookie } from 'oslo/cookie'
import { CookieAttributes, CookieController } from 'oslo/cookie'
import { id__generate } from './crypto.js'
import type { Adapter } from './database.js'
import type {
	RegisterDatabaseSessionAttributes,
	RegisterDatabasePersonAttributes,
	RegisterPersontric
} from './index.js'
type SessionAttributes = RegisterPersontric extends Persontric<infer _SessionAttributes, any>
	? _SessionAttributes
	: {}
type PersonAttributes = RegisterPersontric extends Persontric<any, infer _PersonAttributes>
	? _PersonAttributes
	: {}
export interface Session extends SessionAttributes {
	id:string
	expire_dts:Date
	fresh:boolean
	person_id:string
}
export interface Person extends PersonAttributes {
	id:string
}
export class Persontric<
	_SessionAttributes extends {} = Record<never, never>,
	_PersonAttributes extends {} = Record<never, never>
> {
	private adapter:Adapter
	private session_expire_ttl:TimeSpan
	private session_cookie_controller:CookieController
	private session_attributes_:(
		db_session_attributes:RegisterDatabaseSessionAttributes
	)=>_SessionAttributes
	private person_attributes_:(
		db_person_attributes:RegisterDatabasePersonAttributes
	)=>_PersonAttributes
	public readonly session_cookie_name:string
	constructor(
		adapter:Adapter,
		options?:{
			session_expire_ttl?:TimeSpan
			session_cookie?:SessionCookieOptions
			session_attributes_?:(
				db_session_attributes:RegisterDatabaseSessionAttributes
			)=>_SessionAttributes
			person_attributes_?:(
				db_person_attributes:RegisterDatabasePersonAttributes
			)=>_PersonAttributes
		}
	) {
		this.adapter = adapter
		// we have to use `any` here since TS can't do conditional return types
		this.person_attributes_ = (db_person_attributes):any=>{
			if (options && options.person_attributes_) {
				return options.person_attributes_(db_person_attributes)
			}
			return {}
		}
		this.session_attributes_ = (db_session_attributes):any=>{
			if (options && options.session_attributes_) {
				return options.session_attributes_(db_session_attributes)
			}
			return {}
		}
		this.session_expire_ttl = options?.session_expire_ttl ?? new TimeSpan(30, 'd')
		this.session_cookie_name = options?.session_cookie?.name ?? 'auth_session'
		let session_expire_ttl = this.session_expire_ttl
		if (options?.session_cookie?.expires === false) {
			session_expire_ttl = new TimeSpan(365 * 2, 'd')
		}
		const base_session_cookie_attributes:CookieAttributes = {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
			...options?.session_cookie?.attributes
		}
		this.session_cookie_controller = new CookieController(
			this.session_cookie_name,
			base_session_cookie_attributes,
			{
				expiresIn: session_expire_ttl
			}
		)
	}
	/** @see {import('lucia').getUserSessions} */
	public async person_session_all_(person_id:string):Promise<Session[]> {
		const databaseSessions = await this.adapter.person_session_all_(person_id)
		const session_a1:Session[] = []
		for (const database_session of databaseSessions) {
			if (!isWithinExpirationDate(database_session.expire_dts)) {
				continue
			}
			session_a1.push({
				id: database_session.id,
				expire_dts: database_session.expire_dts,
				person_id: database_session.person_id,
				fresh: false,
				...this.session_attributes_(database_session.attributes)
			})
		}
		return session_a1
	}
	/** @see {import('lucia').validateSession} */
	public async session__validate(
		session_id:string
	):Promise<{ person:Person; session:Session }|{ person:null; session:null }> {
		const [
			database_session,
			database_person
		] = await this.adapter.session_person_pair_(session_id)
		if (!database_session) {
			return { session: null, person: null }
		}
		if (!database_person) {
			await this.adapter.session__delete(database_session.id)
			return { session: null, person: null }
		}
		if (!isWithinExpirationDate(database_session.expire_dts)) {
			await this.adapter.session__delete(database_session.id)
			return { session: null, person: null }
		}
		const active_period_expiration_date = new Date(
			database_session.expire_dts.getTime() - this.session_expire_ttl.milliseconds() / 2
		)
		const session:Session = {
			...this.session_attributes_(database_session.attributes),
			id: database_session.id,
			person_id: database_session.person_id,
			fresh: false,
			expire_dts: database_session.expire_dts
		}
		if (!isWithinExpirationDate(active_period_expiration_date)) {
			session.fresh = true
			session.expire_dts = createDate(this.session_expire_ttl)
			await this.adapter.session_expiration__update(database_session.id, session.expire_dts)
		}
		const person:Person = {
			...this.person_attributes_(database_person.attributes),
			id: database_person.id
		}
		return { person, session }
	}
	/** @see {import('lucia').createSession} */
	public async session__create(
		person_id:string,
		attributes:RegisterDatabaseSessionAttributes,
		options?:{
			session_id?:string
		}
	):Promise<Session> {
		const session_id = options?.session_id ?? id__generate(40)
		const expire_dts = createDate(this.session_expire_ttl)
		await this.adapter.session__set({
			id: session_id,
			person_id,
			expire_dts,
			attributes
		})
		const session:Session = {
			id: session_id,
			person_id,
			fresh: true,
			expire_dts,
			...this.session_attributes_(attributes)
		}
		return session
	}
	/** @see {import('lucia').invalidateSession} */
	public async session__invalidate(session_id:string):Promise<void> {
		await this.adapter.session__delete(session_id)
	}
	/** @see {import('lucia').invalidateUserSessions} */
	public async person_session_all__invalidate(person_id:string):Promise<void> {
		await this.adapter.person_session_all__delete(person_id)
	}
	/** @see {import('lucia').deleteExpiredSessions} */
	public async expired_session_all__delete():Promise<void> {
		await this.adapter.expired_session_all__delete()
	}
	/** @see {import('lucia').readSessionCookie} */
	public session_cookie__read(cookie_header:string):string|null {
		const session_id = this.session_cookie_controller.parse(cookie_header)
		return session_id
	}
	/** @see {import('lucia').readBearerToken} */
	public bearer_token__read(authorizationHeader:string):string|null {
		const [authScheme, token] = authorizationHeader.split(' ') as [string, string|undefined]
		if (authScheme !== 'Bearer') {
			return null
		}
		return token ?? null
	}
	/** @see {import('lucia').createSessionCookie} */
	public session__createCookie(session_id:string):Cookie {
		return this.session_cookie_controller.createCookie(session_id)
	}
	/** @see {import('lucia').createBlankSessionCookie} */
	public session__createBlankCookie():Cookie {
		return this.session_cookie_controller.createBlankCookie()
	}
}
export interface SessionCookieOptions {
	name?:string
	expires?:boolean
	attributes?:SessionCookieAttributesOptions
}
export interface SessionCookieAttributesOptions {
	sameSite?:'lax'|'strict'
	domain?:string
	path?:string
	secure?:boolean
}
