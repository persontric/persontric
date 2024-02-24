import { encodeHex } from 'oslo/encoding'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { LegacyScrypt, Scrypt } from './crypto.js'
test('validateScryptHash() validates hashes generated with generateScryptHash()', async ()=>{
	const password = encodeHex(crypto.getRandomValues(new Uint8Array(32)))
	const scrypt = new Scrypt()
	const hash = await scrypt.hash(password)
	equal(await scrypt.verify(hash, password), true)
	const falsePassword = encodeHex(crypto.getRandomValues(new Uint8Array(32)))
	equal(await scrypt.verify(hash, falsePassword), false)
})
test('LegacyScrypt', async ()=>{
	const password = encodeHex(crypto.getRandomValues(new Uint8Array(32)))
	const scrypt = new LegacyScrypt()
	const hash = await scrypt.hash(password)
	equal(await scrypt.verify(hash, password), true)
	const falsePassword = encodeHex(crypto.getRandomValues(new Uint8Array(32)))
	equal(await scrypt.verify(hash, falsePassword), false)
})
test.run()
