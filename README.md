# Multi-Task Text Utility - Customer Support Helper

A TypeScript-based customer support AI assistant that uses OpenAI's API to generate structured JSON responses with comprehensive metrics tracking and safety features.

## Features

- **Structured JSON Responses**: Returns consistent, well-formatted responses with answer, confidence, actions, and metadata
- **Prompt Engineering**: Implements few-shot prompting technique
- **Comprehensive Metrics**: Tracks tokens (prompt/completion/total), latency, and estimated costs
- **Safety Features**: OpenAI Moderation API integration + local prompt injection detection
- **Automated Testing**: Full test suite for JSON validation, cost calculation, and security
- **Metrics Storage**: Saves metrics in JSON format with array of results per run

## Prerequisites

- Node.js 22 or higher
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone git@github.com:omererakman/multi-task-text-utility.git
cd multi-task-text-utility
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and provide OPENAI_API_KEY:
```
OPENAI_API_KEY=your-api-key-here
```

## Usage

### Running a Query

Run with a custom question:
```bash
npm run dev -- "Why was I charged twice for my subscription?"
```

Or build and run the compiled version:
```bash
npm run build
npm start -- "The app keeps crashing when I upload photos"
```

Run with default question (business hours):
```bash
npm run dev
```

### Example Output

```
🚀 Multi-Task Text Utility
[09:15:56] INFO: ═══════════════════════════════════════════════════

[09:15:56] INFO: ❓ Question: "What are your business hours?"

[09:15:56] INFO: 🔧 Configuration loaded (Provider: openai, Model: gpt-4.1-nano)

[09:15:56] INFO: 🔒 Performing safety check...
[09:15:56] INFO: 📝 Building prompt...
[09:15:56] INFO: 🤖 Calling LLM API...
{
  "response": {
    "answer": "Our customer support team is available Monday through Friday, 9 AM to 6 PM EST. We also offer limited support on weekends from 10 AM to 4 PM EST.",
    "confidence": 0.95,
    "category": "general",
    "actions": [
      "Provide timezone clarification if customer is international",
      "Share alternative contact methods for after-hours support"
    ],
    "requires_escalation": false,
    "metadata": {
      "complexity": "low",
      "sentiment": "neutral"
    }
  },
  "metrics": {
    "timestamp": "2025-10-26T09:15:56.260Z",
    "question": "What are your business hours?",
    "tokens_prompt": 999,
    "tokens_completion": 88,
    "total_tokens": 1087,
    "latency_ms": 1877,
    "estimated_cost_usd": 0.00212875,
    "model": "gpt-4.1-nano",
    "success": true,
    "moderation_flagged": false
  }
}
[09:15:58] INFO: ✅ Parsing JSON response...
[09:15:58] INFO: 📈 Metrics Summary:
[09:15:58] INFO: ─────────────────────────────────────
[09:15:58] INFO: Total Queries: 13
[09:15:58] INFO: Success Rate: 100.0%
[09:15:58] INFO: Total Cost: $0.030403
[09:15:58] INFO: Average Latency: 2343ms
[09:15:58] INFO: Total Tokens: 13,906
[09:15:58] INFO: ─────────────────────────────────────

[09:15:58] INFO: ✅ Query processed successfully!
```

## Running Tests

Execute the unit test suite:
```bash
npm test
```

Run end-to-end tests (requires OpenAI API key):
```bash
npm run test:e2e
```

## CI/CD Pipelines

This project includes automated GitHub Actions workflows:

- **CI Workflow** ([.github/workflows/ci.yml](.github/workflows/ci.yml)): Runs on push/PR to main branch. Builds the project and executes unit tests.
- **E2E Workflow** ([.github/workflows/e2e.yml](.github/workflows/e2e.yml)): Runs end-to-end tests with real OpenAI API calls. Requires `OPENAI_API_KEY` secret configured in GitHub repository settings.

## Project Structure

```
multi-task-text-utility/
├── src/
│   ├── run_query.ts          # Main entry point
│   ├── query_processor.ts    # Core query processing logic
│   ├── config.ts             # Configuration and pricing
│   ├── prompt.ts             # Prompt template loader
│   ├── safety.ts             # Moderation and security
│   ├── metrics.ts            # Metrics tracking and storage
│   ├── logger.ts             # Pino logger configuration
│   ├── types.ts              # TypeScript interfaces
│   └── providers/            # LLM provider abstractions
│       ├── index.ts          # Provider exports
│       ├── types.ts          # Provider interface definitions
│       ├── factory.ts        # Provider factory
│       └── openai.ts         # OpenAI implementation
├── tests/
│   ├── test_core.test.ts     # Unit tests
│   └── e2e.test.ts           # End-to-end tests
├── prompts/
│   ├── main_prompt.md        # Few-shot prompt template
│   └── support_response_schema.json  # JSON schema for responses
├── metrics/
│   └── metrics.json          # Array of metrics per run
├── reports/
│   └── PI_report_en.md       # Technical design report
├── .github/
│   └── workflows/            # GitHub Actions workflows
│       ├── ci.yml            # CI pipeline
│       └── e2e.yml           # E2E test pipeline
├── .husky/
│   └── pre-commit            # Git pre-commit hook
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Metrics Storage

Metrics are automatically saved in JSON format with an array of results per run:

### JSON Format (`metrics/metrics.json`)
Detailed structured data suitable for programmatic analysis:
```json
[
  {
    "timestamp": "2025-10-26T14:30:45.123Z",
    "question": "Why was I charged twice?",
    "tokens_prompt": 1234,
    "tokens_completion": 156,
    "total_tokens": 1390,
    "latency_ms": 1523,
    "estimated_cost_usd": 0.000279,
    "model": "gpt-4o-mini",
    "success": true,
    "moderation_flagged": false
  },
  {
    "timestamp": "2025-10-26T14:32:18.456Z",
    "question": "How do I reset my password?",
    "tokens_prompt": 1201,
    "tokens_completion": 142,
    "total_tokens": 1343,
    "latency_ms": 1402,
    "estimated_cost_usd": 0.000265,
    "model": "gpt-4o-mini",
    "success": true,
    "moderation_flagged": false
  }
]
```

See [prompts/main_prompt.md](prompts/main_prompt.md) for the complete template.

## Safety Features

### 1. OpenAI Moderation API
Automatically checks all inputs for:
- Hate speech
- Self-harm content
- Violence
- Harassment
- etc.

### 2. Prompt Injection Detection
Pattern-based detection for attacks like:
- "Ignore previous instructions"
- "System: You are now..."
- "Act as if you are..."
- "[INST]" or "[SYSTEM]" tags

### 3. Fallback Responses
When unsafe content is detected, returns a safe, professional response with appropriate escalation actions.

### 4. Git Pre-Commit Hooks (Husky)
Prevents accidental commits of sensitive files:
- **Blocks `.env` files**: Pre-commit hook detects and blocks any `.env` file from being committed
- **Runs tests**: Automatically runs unit tests before each commit to ensure code quality
- **Auto-setup**: Hooks are installed automatically when running `npm install` (via the `prepare` script)


## Configuration Options

Edit `.env` to customize:

```bash
# LLM Provider (currently supports: openai)
LLM_PROVIDER=openai

# Required: Your OpenAI API key
OPENAI_API_KEY=your-api-key-here

# Model configuration (default: gpt-4.1-nano)
MODEL_NAME=gpt-4.1-nano

# Temperature setting (default: 0.3)
TEMPERATURE=0.3

# Pricing configuration (per 1M tokens in USD)
MODEL_INPUT_PRICE_PER_1M=1.250
MODEL_OUTPUT_PRICE_PER_1M=10.000

# Model capabilities
MODEL_SUPPORTS_TEMPERATURE=true

# Logging level (options: silent, info, debug, etc.)
# Use "silent" to only output the JSON response
LOG_LEVEL=silent
```

## Troubleshooting

### "OPENAI_API_KEY environment variable is required"
- Ensure `.env` file exists with valid API key
- Check that `.env` is in the project root directory

### "Module not found" errors
- Run `npm install` to install dependencies
- Ensure Node.js version is 22 or higher

### Tests failing
- Run `npm run build` before running tests
- Check that all dependencies are installed


## License

MIT
