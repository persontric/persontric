import { scryptSync as nodeScrypt } from 'node:crypto'
import { alphabet, generateRandomString } from 'oslo/crypto'
import { encodeHex } from 'oslo/encoding'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { scrypt } from './index.js'
test('scrypt() output matches crypto', async ()=>{
	const password = generateRandomString(16, alphabet('a-z', 'A-Z', '0-9'))
	const salt = encodeHex(crypto.getRandomValues(new Uint8Array(16)))
	const scryptHash = await scrypt(
		new TextEncoder().encode(password),
		new TextEncoder().encode(salt),
		{
			N: 16384,
			r: 16,
			p: 1,
			dkLen: 64
		}
	)
	const cryptoHash = new Uint8Array(
		nodeScrypt(password, salt, 64, {
			N: 16384,
			p: 1,
			r: 16,
			maxmem: 128 * 16384 * 16 * 2
		}).buffer
	)
	equal(cryptoHash, scryptHash)
})
test.run()
