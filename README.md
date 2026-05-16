# Parallex

**The agent economy starts here.** Compose AI agent pipelines in plain English, pay agents on-chain through an escrow contract, and reuse pipelines as named, sharable stacks — all running on Monad Testnet.

> Built for Monad Blitz KL.

---

## What Parallex does

Parallex turns natural-language goals into runnable, on-chain AI workflows. Instead of writing code to glue agents together, you describe what you want, the system selects and orders the right agents from an on-chain marketplace, and you sign one transaction to release escrow as the agents work in parallel on Monad.

The Mamak Splitter Pro stack demonstrates the real-world end of this: upload a restaurant receipt, assign items to friends, and the pipeline outputs clickable WhatsApp links so each friend gets a personalised "your share is RM X" message.

## Highlights

- **18 on-chain agents**, each with its own wallet, registered in an `AgentRegistry` contract on Monad Testnet.
- **Escrow-backed payment**: users deposit once via `WorkflowEscrow.startWorkflow`, and each agent is paid through a separate `completeAgent` transaction after it completes. The transactions fire concurrently and often land in the same Monad block — a direct demonstration of parallel execution.
- **Auto-compose**: type a goal, an LLM picks 2–5 agents; if it times out or declines, a keyword-router fallback always returns a usable pipeline.
- **Reusable stacks**: save a workflow → an LLM generalises it into a reusable template → reload, edit specifics, run again.
- **Platform quality assurance**: a free QC officer reviews every paid agent's output and a free Audit inspector reviews the QC. When QC flags a real failure, the operator wallet automatically refunds the user for that agent.
- **Mamak Splitter Pro**: upload-a-receipt → split-by-item → send-WhatsApp pipeline with deterministic math (no LLM-driven arithmetic).
- **Live execution UX**: pre-flight cost preview, MetaMask sign moment, an "ESCROW LOCKED" celebration with an explorer link, and live token streaming for each agent with parallel-block stats.

## Live demo path

```
Landing page  →  /workflow                  →  /stacks
   ─────         ─────────────                  ─────
   Hero CTA      1. Type goal                   List of saved
   "Launch       2. Auto-compose picks agents   stacks. Click
   Parallex"     3. Edit / validate stack       USE → loads
                 4. (Mamak only)                /workflow with
                    • drop receipt              the pipeline
                    • list friends              pre-filled.
                    • assign items
                 5. RUN WORKFLOW
                    • MetaMask signs escrow
                    • Agents stream live output
                    • Parallel pay txs land on Monad
                    • QC + Audit run for free
                 6. SAVE THIS STACK (named)
```

## Architecture

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, lucide-react |
| Wallet | Privy (email + injected wallet), viem |
| Smart contracts | Solidity 0.8.20, Hardhat, deployed on Monad Testnet (chain id `10143`) |
| Backend | Next.js API route handlers + viem + SSE streaming + Ollama (`llama3.1:8b`) |
| Storage | localStorage for saved stacks (no centralised database) |

### On-chain components

`contracts/contracts/AgentRegistry.sol` — owner-administered catalogue of agents. Each agent record stores `name`, `specialty`, `pricePerTask` (in wei), `wallet`, and `active`.

`contracts/contracts/WorkflowEscrow.sol` — payable `startWorkflow(uint256[] agentIds)` locks the total of every agent's price in escrow. The off-chain operator wallet calls `completeAgent(workflowId, agentIndex)` per agent. When all agents are paid, any residual deposit is refunded to the user and `WorkflowCompleted` is emitted.

Each `completeAgent` transaction touches a distinct `(workflowId, agentIndex)` slot, allowing Monad's parallel executor to process them concurrently — multiple agent payments routinely land in the same block.

### Orchestrator

`lib/orchestrator.ts` is an `async generator` that yields SSE events the frontend listens to:

```
workflow_start → step_start → agent_thinking →
agent_output_chunk (×N) → agent_output → agent_paid →
step_complete → qc_thinking → qc_verdict →
audit_thinking → audit_verdict → (refund_issued ×N) →
(mamak_messages — side-channel for rich UI) →
workflow_complete
```

The orchestrator special-cases Receipt Scanner (deterministic OCR mock), Bill Splitter (deterministic math) and WhatsApp Notifier (deterministic link generation). All other agents stream tokens from Ollama in real time.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — hero, sections, two CTAs that route to `/workflow` |
| `/workflow` | The builder + live executor. Auto-compose, drag-build, MetaMask sign, live stream, QC, refunds, save |
| `/stacks` | The collection. List of saved stacks with run count, last-used, cost estimate; click USE to deep-link to `/workflow` with the pipeline pre-loaded |
| `/parallex/run` | A minimal reference page showing the raw orchestrator/SSE wiring (developer view) |

## Available agents

Agents 0–14 are general purpose; 15–17 power the Mamak Splitter Pro stack.

| ID | Name | Specialty | Price (MON) |
|---|---|---|---|
| 0 | Research Analyst | Intelligence gathering | 0.010 |
| 1 | Code Engineer | Solidity / on-chain development | 0.030 |
| 2 | Content Writer | Polished prose, reports, copy | 0.008 |
| 3 | Data Processor | Dataset normalisation, pattern recognition | 0.015 |
| 4 | Translator | Localisation (Bahasa Melayu) | 0.005 |
| 5 | Strategy Advisor | Opinionated strategic recommendations | 0.040 |
| 6 | Summarizer | Condense long text into bullets | 0.006 |
| 7 | Q&A Bot | Direct factual answers | 0.005 |
| 8 | Email Drafter | Professional email composition | 0.008 |
| 9 | Critic | Constructive review and feedback | 0.010 |
| 10 | Outline Builder | Structured topic outlines | 0.007 |
| 11 | Idea Generator | Creative brainstorming | 0.009 |
| 12 | Math Solver | Step-by-step problem solving | 0.006 |
| 13 | Fact Checker | TRUE / FALSE / UNVERIFIED verification | 0.012 |
| 14 | Tutor | Concept explanation with analogies | 0.008 |
| 15 | Receipt Scanner | Receipt / invoice OCR | 0.010 |
| 16 | Bill Splitter | Per-friend cost allocation | 0.007 |
| 17 | WhatsApp Notifier | Generate per-friend `wa.me` links | 0.005 |

The Receipt Scanner and WhatsApp Notifier are intercepted server-side to guarantee deterministic, demo-reliable behaviour. The Bill Splitter is pure math; it never calls an LLM.

## Project structure

```
.
├── app/
│   ├── page.tsx                       # Landing
│   ├── workflow/page.tsx              # Builder + live executor
│   ├── stacks/page.tsx                # Saved-stack collection
│   ├── parallex/run/page.tsx          # Reference page (raw SSE)
│   └── api/
│       ├── agents/route.ts            # Reads on-chain registry (cached 30s)
│       ├── workflow/route.ts          # POST → SSE stream from orchestrator
│       ├── compose/route.ts           # LLM picks agents from a goal
│       ├── compose-name/route.ts      # LLM suggests a stack name
│       ├── generalize-intent/route.ts # LLM turns an instance into a template
│       └── health/route.ts            # Chain, Ollama, contract checks
├── components/
│   ├── workflow/
│   │   ├── WorkflowBuilder.tsx        # Picker + agent stack UI
│   │   ├── ExecutionTimeline.tsx      # Live per-agent cards
│   │   ├── EscrowOverlay.tsx          # Pre-flight + locked moments
│   │   ├── QualityControl.tsx         # QC + Audit + refunds panel
│   │   ├── MamakInputs.tsx            # Receipt upload + friends + items
│   │   ├── WhatsAppOutput.tsx         # Clickable wa.me link cards
│   │   └── PaymentParticleEffect.tsx  # Coin animation overlay
│   ├── sections/                      # Landing-page sections
│   └── ui/                            # Shadcn-style primitives
├── contracts/
│   ├── contracts/                     # AgentRegistry, WorkflowEscrow
│   └── scripts/
│       ├── deploy.js                  # Initial deploy + seed (6 agents)
│       └── seed-more-agents.js        # Add agents 6..17 (idempotent)
├── hooks/
│   └── useWorkflow.ts                 # Privy → escrow → SSE state machine
├── lib/
│   ├── agents.ts                      # Off-chain system prompts (per agent id)
│   ├── chain.ts                       # Monad Testnet viem chain + public client
│   ├── monad.ts                       # Operator wallet helper, health check
│   ├── orchestrator.ts                # Per-step execution + QC + Audit + refunds
│   ├── ollama.ts                      # Streaming + non-streaming Ollama calls
│   ├── contracts.ts                   # Addresses + ABIs
│   └── stacks.ts                      # localStorage CRUD for saved stacks
└── scripts/
    └── check-registry.mjs             # Standalone RPC diagnostic
```

## Getting started

### Prerequisites

- Node.js 20+
- A funded Monad Testnet wallet (use the [Monad faucet](https://faucet.monad.xyz))
- [Ollama](https://ollama.com/) running locally with the `llama3.1:8b` model pulled
- A [Privy](https://privy.io/) app id (free tier)

### 1. Install

```bash
git clone https://github.com/hmhhmm/Parallex-Monad.git
cd Parallex-Monad
npm install
npm install --prefix contracts
```

### 2. Environment

```bash
cp .env.local.example .env.local
cp contracts/.env.example contracts/.env
```

Edit `contracts/.env`:

```
OPERATOR_PRIVATE_KEY=0xYOUR_FUNDED_KEY
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

### 3. Deploy contracts

```bash
cd contracts
npx hardhat run scripts/deploy.js --network monadTestnet
```

The script deploys `AgentRegistry` and `WorkflowEscrow`, and seeds the first 6 agents. Copy the printed `NEXT_PUBLIC_REGISTRY_ADDRESS` and `NEXT_PUBLIC_ESCROW_ADDRESS` into the root `.env.local`.

### 4. Seed the rest of the agents

```bash
REGISTRY_ADDRESS=0xYOUR_REGISTRY_ADDRESS \
  npx hardhat run scripts/seed-more-agents.js --network monadTestnet
```

Idempotent — safe to re-run. Adds agents 6 through 17.

### 5. Finish `.env.local`

```
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
OPERATOR_PRIVATE_KEY=0xYOUR_KEY
NEXT_PUBLIC_REGISTRY_ADDRESS=0xYOUR_REGISTRY
NEXT_PUBLIC_ESCROW_ADDRESS=0xYOUR_ESCROW
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
NEXT_PUBLIC_PRIVY_APP_ID=YOUR_PRIVY_APP_ID
```

### 6. Run

```bash
ollama serve              # in one terminal
npm run dev               # in another
```

Open `http://localhost:3000`.

### 7. Sanity check

```bash
curl -s http://localhost:3000/api/health | jq
```

All four flags should report `true`: `monad.ok`, `ollama.ok`, `contracts.registry.configured`, `contracts.escrow.configured`.

```bash
curl -s http://localhost:3000/api/agents | jq '.agents | length'
# → 18
```

## Quality assurance flow

Every paid agent is followed by two platform agents that run for free:

1. **QC Officer** evaluates each paid agent's output against its own role (not the overall pipeline goal). Pipeline-aware judgement — Splitter doing math is a PASS even though it's not sending messages.
2. **Audit Inspector** evaluates QC's verdicts. Flags QC as too harsh or too lenient.

If QC marks an agent as failed and Audit confirms QC was rigorous, the operator wallet performs an on-chain MON transfer back to the user for that agent's fee. A `refund_issued` event is streamed to the UI with a clickable Monad Explorer link.

## Mamak Splitter Pro

A specialised pipeline that demonstrates real-world automation:

```
📸 Receipt Scanner →  🧮 Bill Splitter  →  📲 WhatsApp Notifier
   (mock OCR)         (deterministic     (deterministic
                       per-item math)     wa.me link gen)
```

Inputs collected on `/workflow` when these agents are in the stack:

- **Receipt upload** — any image works (the demo uses a mocked extraction)
- **Friends list** — name + phone per friend (free-form add/remove)
- **Item assignments** — each receipt line item gets a per-friend dropdown; items left as `(split)` are divided equally

Bill Splitter sums each friend's assigned items plus their slice of the shared items. Notifier generates `https://wa.me/<phone>?text=...` links the user can click to open WhatsApp with a pre-filled message.

## Save & reuse

After a successful run, the user names the stack and saves it. The intent is generalised by an LLM ("Split RM 87 among Ali, Ahmad, Siti" → "Split a bill among friends") so the template is reusable. Stacks are stored in `localStorage` keyed by user-given names and shown on `/stacks` with run count, agent chips, total estimate, and a USE button that deep-links to `/workflow` with the pipeline pre-loaded.

## Development scripts

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint

# from contracts/
npx hardhat compile
npx hardhat run scripts/deploy.js --network monadTestnet
npx hardhat run scripts/seed-more-agents.js --network monadTestnet
```

There's also a standalone RPC diagnostic at `scripts/check-registry.mjs`:

```bash
node scripts/check-registry.mjs
```

## License

MIT.
