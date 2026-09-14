/**
 * Gate for specs that assert on the *content* of model output.
 *
 * The API runs with DEMO_MODE=true by default. Agents then return
 * clearly-labelled canned output instead of calling Gemini: no key is needed and
 * nothing costs money, but a spec expecting a rendered SWOT grid, a framework
 * term such as "value innovation", or an invented persona cannot pass — the text
 * it waits for is never produced.
 *
 * Such specs are opt-in, so that a red E2E run means something is broken rather
 * than "the model is mocked":
 *
 *   RUN_LIVE_MODEL_TESTS=1 npm run test:e2e --prefix apps/web
 *
 * with the API started against a real key (DEMO_MODE=false, GOOGLE_API_KEY set).
 *
 * This is about model *content*, not model *plumbing*. Specs that only need a
 * chat to complete — SSE framing, session creation, persistence — work fine
 * under DEMO_MODE and must NOT use this gate; skipping them would hide real
 * regressions.
 *
 * Env loading is not repeated here: playwright.config.ts already loads
 * .env.test at startup, and process.env is inherited by workers.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

export const liveModelTestsEnabled: boolean = TRUTHY.has(
  (process.env.RUN_LIVE_MODEL_TESTS ?? '').trim().toLowerCase()
)

export const LIVE_MODEL_SKIP_REASON =
  'asserts on generated model content, which DEMO_MODE does not produce. ' +
  'Run with RUN_LIVE_MODEL_TESTS=1 against an API started with DEMO_MODE=false ' +
  'and a real GOOGLE_API_KEY (see TESTING.md).'

/**
 * Skip the current test unless live model output is available.
 * Call at the top of a test body.
 */
export function skipUnlessLiveModel(test: {
  skip(condition: boolean, description: string): void
}): void {
  test.skip(!liveModelTestsEnabled, LIVE_MODEL_SKIP_REASON)
}
