import { alphabet, constantTimeEqual, generateRandomString } from 'oslo/crypto'
import { decodeHex, encodeHex } from 'oslo/encoding'
import type { PasswordHashingAlgorithm } from 'oslo/password'
import { scrypt } from './scrypt/index.js'
export type { PasswordHashingAlgorithm } from 'oslo/password'
async function scrypt_key__generate(data:string, salt:string, blockSize = 16):Promise<Uint8Array> {
	const encode_data = new TextEncoder().encode(data)
	const encode_salt = new TextEncoder().encode(salt)
	const key_Uint8Array = await scrypt(encode_data, encode_salt, {
		N: 16384,
		r: blockSize,
		p: 1,
		dkLen: 64
	})
	return key_Uint8Array
}
export function id__generate(length:number):string {
	return generateRandomString(length, alphabet('0-9', 'a-z'))
}
export class Scrypt implements PasswordHashingAlgorithm {
	async hash(password:string):Promise<string> {
		const salt = encodeHex(crypto.getRandomValues(new Uint8Array(16)))
		const key = await scrypt_key__generate(password.normalize('NFKC'), salt)
		return `${salt}:${encodeHex(key)}`
	}
	async verify(hash:string, password:string):Promise<boolean> {
		const parts = hash.split(':')
		if (parts.length !== 2) return false
		const [salt, key] = parts
		const targetKey = await scrypt_key__generate(password.normalize('NFKC'), salt)
		return constantTimeEqual(targetKey, decodeHex(key))
	}
}
export class LegacyScrypt implements PasswordHashingAlgorithm {
	async hash(password:string):Promise<string> {
		const salt = encodeHex(crypto.getRandomValues(new Uint8Array(16)))
		const key = await scrypt_key__generate(password.normalize('NFKC'), salt)
		return `s2:${salt}:${encodeHex(key)}`
	}
	async verify(hash:string, password:string):Promise<boolean> {
		const parts = hash.split(':')
		if (parts.length === 2) {
			const [salt, key] = parts
			const targetKey = await scrypt_key__generate(password.normalize('NFKC'), salt, 8)
			const result = constantTimeEqual(targetKey, decodeHex(key))
			return result
		}
		if (parts.length !== 3) return false
		const [version, salt, key] = parts
		if (version === 's2') {
			const targetKey = await scrypt_key__generate(password.normalize('NFKC'), salt)
			return constantTimeEqual(targetKey, decodeHex(key))
		}
		return false
	}
}
