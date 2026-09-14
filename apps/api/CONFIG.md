# API Configuration Guide

## Environment Variables

All configuration for the Marketing Suite API is managed through environment variables stored in the `.env` file located at `/apps/api/.env`.

### Configuration Files

1. **Development**: `/apps/api/.env` (git-ignored)
2. **Example**: `/apps/api/.env.example` (committed to git)
3. **Production**: Set via deployment platform (Cloud Run, Vercel, etc.)

## Gemini Model Configuration

The API uses Google's Gemini models for AI agents. All agents are unified on **Gemini 3.8 Flash** (`gemini-3.8-flash`).

### Central Model Registry

All model references are centralized in `apps/api/config/gemini_models.py`:

- `DEFAULT_MODEL` — The default model ID (`gemini-3.8-flash`), used as the fallback in all `os.getenv()` calls
- `DEFAULT_MODEL_LITE` — Same as DEFAULT_MODEL (unified to Gemini 3 Flash)
- **No hardcoded model strings** — all files import from the central config

### Model Settings

These environment variables control which Gemini model each agent uses:

```bash
# Agent-specific models (all default to gemini-3.8-flash)
GEMINI_MODEL_STRATEGY="gemini-3.8-flash"    # Strategy Agent model (11 frameworks)
GEMINI_MODEL_PERSONA="gemini-3.8-flash"     # Persona Agent model
GEMINI_MODEL_CONTENT="gemini-3.8-flash"     # Content Agent model
GEMINI_MODEL_ANALYTICS="gemini-3.8-flash"   # Analytics Agent model
GEMINI_MODEL_OPPORTUNITIES="gemini-3.8-flash"

# Default fallback model
GEMINI_MODEL_DEFAULT="gemini-3.8-flash"    # Used if agent-specific model not set
```

### Available Models

- `gemini-3.8-flash` — Gemini 3.8 Flash (current default, $0.75/$3.75 per million tokens, introductory, 1M input / 65K output)

### Temperature

Google strongly recommends `temperature=1.0` for Gemini 3 models. Lower values may cause looping or degraded output quality. All agents and services use 1.0 as the default.

```bash
GEMINI_TEMPERATURE="1.0"  # Gemini 3 recommended default
```

### Model Selection Logic

1. If agent is initialized with explicit `model_name`, use that
2. Else if agent has `agent_type`, look for `GEMINI_MODEL_{AGENT_TYPE}`
3. Else use `GEMINI_MODEL_DEFAULT`
4. If no env var set, fallback to `DEFAULT_MODEL` from central config

## Google Search Grounding

Grounding allows agents to search the web for current information.

```bash
# Enable/disable Google Search grounding
GEMINI_ENABLE_GROUNDING="true"   # Set to "false" to disable
```

When enabled:
- Agents can access current web information
- Responses include up-to-date market data
- Competitive analysis uses real-time information
- **Gemini 3 billing**: Grounding is billed per-query (not per-prompt)

## Database Configuration

```bash
# Supabase connection. The local stack runs on the 563xx range, not Supabase's
# default 54321 — see supabase/config.toml.
SUPABASE_URL="http://127.0.0.1:56321"           # Local or production URL
SUPABASE_ANON_KEY="eyJ..."                      # Public anon key
SUPABASE_JWT_SECRET="super-secret..."           # JWT signing secret
```

## Google AI Configuration

```bash
# Google AI Studio API key
GOOGLE_API_KEY="AIza..."                        # Your API key from https://aistudio.google.com/apikey
```

## Setting Configuration

### Local Development

1. Copy the example file:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

2. Edit `/apps/api/.env` with your values

3. Restart the API server to apply changes

### Production (Cloud Run)

Set environment variables in Cloud Run:

```bash
gcloud run services update stratum-api \
  --set-env-vars GEMINI_MODEL_DEFAULT=gemini-3.8-flash \
  --set-env-vars GEMINI_ENABLE_GROUNDING=true \
  --region us-central1
```

Or use the Cloud Console UI to set environment variables.

### Production (Vercel)

Set in Vercel dashboard under Project Settings > Environment Variables, or via CLI:

```bash
vercel env add GEMINI_MODEL_DEFAULT production
vercel env add GEMINI_ENABLE_GROUNDING production
```

## Best Practices

1. **Model Selection**:
   - All agents unified on Gemini 3.8 Flash for simplicity
   - Override per-agent via env vars if needed for specific use cases
   - Central config in `gemini_models.py` — never hardcode model strings

2. **Temperature**:
   - Keep at 1.0 (Gemini 3 recommended default)
   - Override via `GEMINI_TEMPERATURE` env var if needed
   - Lower values may cause looping or degraded quality

3. **Grounding**:
   - Enable for agents that need current information
   - Disable for agents working with static data
   - Gemini 3: billed per-query (not per-prompt)

4. **Security**:
   - Never commit `.env` files to git
   - Use different API keys for dev/staging/prod
   - Rotate keys regularly
   - Use secret management services in production

## Monitoring Configuration

Check current configuration in the API logs:

```python
# BaseGeminiAgent logs configuration on init
logger.info(f"Initialized {agent_type} agent with model: {self.model_name}, grounding: {self.enable_grounding}")
```

## Strategy Agent Tools

The Strategy Agent has been enhanced with 11 strategic frameworks, each available as a tool function:

1. **get_swot_analysis** - Strengths, Weaknesses, Opportunities, Threats
2. **get_porters_five_forces** - Industry competitive analysis
3. **get_business_model_canvas** - 9-block business model visualization
4. **get_ice_scoring** - Impact, Confidence, Ease prioritization
5. **get_bcg_matrix** - Growth-Share portfolio analysis
6. **get_vrio_analysis** - Value, Rarity, Imitability, Organization assessment
7. **get_three_horizons** - Growth planning across time horizons
8. **get_blue_ocean_strategy** - Create uncontested market spaces (backend ready)
9. **get_mckinsey_7s** - Organizational alignment analysis (backend ready)
10. **get_okr_framework** - Objectives and Key Results planning (backend ready)
11. **get_jobs_to_be_done** - Customer job analysis (backend ready)

Each tool returns structured Pydantic models with visualization-ready data.

## Troubleshooting

1. **Agent using wrong model**: Check env var naming matches `GEMINI_MODEL_{AGENT_TYPE}`
2. **Grounding not working**: Ensure `GEMINI_ENABLE_GROUNDING="true"` (lowercase)
3. **Changes not applying**: Restart the API server after changing `.env`
4. **Changing the model**: Set `GEMINI_MODEL_DEFAULT` (and optionally per-agent
   `GEMINI_MODEL_*`) to an ID your API key can reach, then restart. There is a
   single source of truth for the defaults in `config/gemini_models.py`; do not
   hardcode model IDs elsewhere. Note that `thinking_level="minimal"` is rejected
   by the current model with `400 INVALID_ARGUMENT` — use `low`.
