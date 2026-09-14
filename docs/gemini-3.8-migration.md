# Migrating to Gemini 3.8 Flash

Notes from doing this migration. Written because the official guidance is spread
across several pages and because two of the breaking changes are easy to miss
until something fails at runtime.

## The main finding: you probably do not need the Interactions API

Google now presents the **Interactions API** (`client.interactions.create`) as the
primary interface for Gemini 3.x, and it is tempting to read that as "migrate or
fall behind".

You do not have to. The legacy `generateContent` endpoint **remains fully
supported with no announced sunset**, and `gemini-3.8-flash` is callable on both
shapes:

```python
# Legacy shape — still supported
response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents="...",
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_level="low")
    ),
)
```

| Concern | Interactions API | Legacy `generateContent` |
|---|---|---|
| Thinking level | `generation_config.thinking_level` | `generationConfig.thinkingConfig.thinkingLevel` |
| Conversation state | `previous_interaction_id`, server-side | resend the full `contents` array |
| Tool result | `function_result` with `call_id` + `name` | `functionResponse` with `id` + `name` |
| Final text | `output_text` | `candidates[0].content.parts[].text` |
| Thought signatures | handled for you unless `store: false` | you must pass every part back unchanged |

If you keep the legacy shape, the migration is a dependency bump plus the fixes
below, not a rewrite. Adopt the Interactions API deliberately, when you want
server-side conversation state, not as a side effect of a model upgrade.

## The SDK bump may be blocked by an unrelated dependency

`google-genai` 2.x is required for current models. If your resolver refuses it,
look for something pinning a 1.x range. In this project `google-adk` required
`google-genai >=1.21.1,<2.0.0` while being **used nowhere in the codebase** —
removing the unused dependency was what unblocked the upgrade.

```bash
poetry lock   # fails loudly and names the conflicting requirement
```

The error message is worth reading carefully; it names the exact constraint chain.

## Breaking changes that actually apply

Check each against your code rather than the changelog.

### 1. `thinking_budget` → `thinking_level`

`thinking_budget` was an integer token cap. `thinking_level` is an enum
(`low` / `medium` / `high`). There is no arithmetic mapping — choose by intent.
Latency-sensitive routes get `low`, default routes `medium`, hardest multi-step
routes `high`.

`thinking_level: "minimal"` returns `400 INVALID_ARGUMENT`. Map it to `low`.

### 2. `call_id` on every function result

If you disable automatic function calling you must build function results
yourself, and each must carry **both the call id and the function name**:

```python
types.Part(
    function_response=types.FunctionResponse(
        name=fc.name,
        response={"result": result},
        id=fc.id,          # required
    )
)
```

Two things make this awkward:

- `types.Part.from_function_response()` **cannot express the id** — it accepts
  only `name`, `response` and `parts`. Construct the part directly.
- In testing, a single-call loop was accepted *without* the id, despite the
  documentation saying it is enforced. Do not take that as licence to omit it;
  multi-call loops may behave differently and the cost of including it is zero.

### 3. Remove `candidate_count`

Gemini 3 and later do not support multiple candidates. Drop the key and any code
that indexes `candidates[1]`.

### 4. Sampling parameters

Google's guidance for every Gemini 3 model is to leave temperature at its default
of 1.0; lower values "may cause looping or degraded performance". If you used a
low temperature to get repeatable JSON, use structured outputs instead.
`top_p` and `top_k` are in the same category.

## Thinking tokens are the cost, and they are billed as output

Measured on one representative multi-step prompt (109 prompt tokens):

| level | output | thoughts | total | vs `low` |
|---|---|---|---|---|
| `low` | 1063 | not reported | 1172 | 1.0× |
| `medium` | 1146 | 1327 | 2582 | **2.2×** |
| `high` | 1423 | 2193 | 3725 | **3.2×** |

Thinking tokens bill at the output rate and appear as
`usageMetadata.thoughtsTokenCount`. So the *default* of `medium` costs roughly
2.2× `low` for a comparable answer, before any per-token price change. Budget per
route, and log `thoughtsTokenCount` so the cost is visible rather than surprising.

Note that `thoughtsTokenCount` is absent at `low`, so a metrics pipeline that
assumes it is always present will break.

## Structured output still works

`response_schema` + `response_mime_type="application/json"` continues to work on
the legacy endpoint. This is what you want instead of low temperature when you
need machine-parseable output.

## A word on model IDs

Use the plain ID (`gemini-3.8-flash`), not a preview variant, unless you
specifically want a preview. Keep the ID in one place: this project keeps it in
`apps/api/config/gemini_models.py` and reads it via `GEMINI_MODEL_DEFAULT`, which
made the swap a single change plus the env templates.
