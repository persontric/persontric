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
	public async session__validate(
		sessionId:string
	):Promise<{ user:Person; session:Session }|{ user:null; session:null }> {
		const [databaseSession, database_person] = await this.adapter.session_person_pair_(sessionId)
		if (!databaseSession) {
			return { session: null, user: null }
		}
		if (!database_person) {
			await this.adapter.session__delete(databaseSession.id)
			return { session: null, user: null }
		}
		if (!isWithinExpirationDate(databaseSession.expire_dts)) {
			await this.adapter.session__delete(databaseSession.id)
			return { session: null, user: null }
		}
		const activePeriodExpirationDate = new Date(
			databaseSession.expire_dts.getTime() - this.session_expire_ttl.milliseconds() / 2
		)
		const session:Session = {
			...this.session_attributes_(databaseSession.attributes),
			id: databaseSession.id,
			person_id: databaseSession.person_id,
			fresh: false,
			expire_dts: databaseSession.expire_dts
		}
		if (!isWithinExpirationDate(activePeriodExpirationDate)) {
			session.fresh = true
			session.expire_dts = createDate(this.session_expire_ttl)
			await this.adapter.session_expiration__update(databaseSession.id, session.expire_dts)
		}
		const user:Person = {
			...this.person_attributes_(database_person.attributes),
			id: database_person.id
		}
		return { user, session }
	}
	public async session__create(
		person_id:string,
		attributes:RegisterDatabaseSessionAttributes,
		options?:{
			sessionId?:string
		}
	):Promise<Session> {
		const sessionId = options?.sessionId ?? id__generate(40)
		const sessionExpiresAt = createDate(this.session_expire_ttl)
		await this.adapter.session__set({
			id: sessionId,
			person_id,
			expire_dts: sessionExpiresAt,
			attributes
		})
		const session:Session = {
			id: sessionId,
			person_id,
			fresh: true,
			expire_dts: sessionExpiresAt,
			...this.session_attributes_(attributes)
		}
		return session
	}
	public async session__invalidate(sessionId:string):Promise<void> {
		await this.adapter.session__delete(sessionId)
	}
	public async person_session_all__invalidate(person_id:string):Promise<void> {
		await this.adapter.person_session_all__delete(person_id)
	}
	public async expired_session_all__delete():Promise<void> {
		await this.adapter.expired_session_all__delete()
	}
	public session_cookie__read(cookieHeader:string):string|null {
		const sessionId = this.session_cookie_controller.parse(cookieHeader)
		return sessionId
	}
	public bearer_token__read(authorizationHeader:string):string|null {
		const [authScheme, token] = authorizationHeader.split(' ') as [string, string|undefined]
		if (authScheme !== 'Bearer') {
			return null
		}
		return token ?? null
	}
	public session_cookie__createCookie(sessionId:string):Cookie {
		return this.session_cookie_controller.createCookie(sessionId)
	}
	public session_cookie__createBlankCookie():Cookie {
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
