import type { RegisterDatabaseSessionAttributes, RegisterDatabasePersonAttributes } from './index.js'
export interface Adapter {
	session_person_pair_(
		sessionId:string
	):Promise<[session:DatabaseSession|null, person:DatabasePerson|null]>
	person_session_all_(personId:string):Promise<DatabaseSession[]>
	session__set(session:DatabaseSession):Promise<void>
	session_expiration__update(sessionId:string, expire_dts:Date):Promise<void>
	session__delete(sessionId:string):Promise<void>
	person_session_all__delete(personId:string):Promise<void>
	expired_session_all__delete():Promise<void>
}
export interface DatabasePerson {
	id:string
	attributes:RegisterDatabasePersonAttributes
}
export interface DatabaseSession {
	person_id:string
	expire_dts:Date
	id:string
	attributes:RegisterDatabaseSessionAttributes
}
