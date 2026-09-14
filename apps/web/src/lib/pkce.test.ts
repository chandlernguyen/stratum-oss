import { describe, it, expect } from 'vitest'
import { generatePKCEVerifier, generatePKCEChallenge } from './pkce'

describe('generatePKCEVerifier', () => {
  it('should return a string of at least 43 characters', () => {
    const verifier = generatePKCEVerifier()
    expect(typeof verifier).toBe('string')
    expect(verifier.length).toBeGreaterThanOrEqual(43)
  })

  it('should contain only valid base64url characters', () => {
    const verifier = generatePKCEVerifier()
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('should produce different values on each call', () => {
    const v1 = generatePKCEVerifier()
    const v2 = generatePKCEVerifier()
    const v3 = generatePKCEVerifier()
    expect(v1).not.toBe(v2)
    expect(v1).not.toBe(v3)
    expect(v2).not.toBe(v3)
  })
})

describe('generatePKCEChallenge', () => {
  it('should return a base64url-encoded SHA-256 hash', async () => {
    const verifier = generatePKCEVerifier()
    const challenge = await generatePKCEChallenge(verifier)
    expect(typeof challenge).toBe('string')
    expect(challenge.length).toBe(43)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('should produce deterministic output for the same verifier', async () => {
    const verifier = 'test-verifier-12345'
    const c1 = await generatePKCEChallenge(verifier)
    const c2 = await generatePKCEChallenge(verifier)
    expect(c1).toBe(c2)
  })

  it('should produce different challenges for different verifiers', async () => {
    const c1 = await generatePKCEChallenge('verifier-one')
    const c2 = await generatePKCEChallenge('verifier-two')
    expect(c1).not.toBe(c2)
  })

  it('should produce a challenge matching a known verifier-challenge pair', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = await generatePKCEChallenge(verifier)
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})
