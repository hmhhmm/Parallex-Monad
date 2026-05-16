import { NextRequest, NextResponse } from 'next/server'
import { AGENTS } from '@/lib/agents'
import { callOllama } from '@/lib/ollama'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Map on-chain numeric agent IDs to the UI string IDs used by WorkflowBuilder.
// Keep in sync with STRING_TO_NUMERIC in hooks/useWorkflow.ts.
const NUMERIC_TO_UI: Record<number, string> = {
  0:  'research',
  1:  'contract',
  2:  'writer',
  3:  'data',
  4:  'translate',
  5:  'trader',
  6:  'summarizer',
  7:  'qabot',
  8:  'emailer',
  9:  'critic',
  10: 'outliner',
  11: 'ideator',
  12: 'mathsolver',
  13: 'factchecker',
  14: 'tutor',
  15: 'scanner',
  16: 'splitter',
  17: 'notifier',
}

const VALID_UI_IDS = new Set(Object.values(NUMERIC_TO_UI))

// Short purpose blurbs to help the LLM pick well without ballooning the prompt
const PURPOSES: Record<string, string> = {
  research:    'gathers facts and intelligence on a topic',
  contract:    'writes Solidity smart contracts',
  writer:      'produces polished prose, blogs, reports',
  data:        'processes datasets and finds patterns',
  translate:   'translates content into Bahasa Melayu',
  trader:      'gives strategic recommendations',
  summarizer:  'condenses long text into bullets',
  qabot:       'answers specific questions directly',
  emailer:     'drafts professional emails with subject lines',
  critic:      'reviews work and gives constructive feedback',
  outliner:    'builds structured outlines for a topic',
  ideator:     'brainstorms creative ideas',
  mathsolver:  'solves math problems step by step',
  factchecker: 'verifies claims as TRUE / FALSE / UNVERIFIED',
  tutor:       'explains concepts with analogies',
  scanner:     'scans an uploaded receipt image and extracts itemised line items',
  splitter:    'splits an itemised bill equally among a list of friends',
  notifier:    'generates a WhatsApp link per friend with their share amount',
}

export async function POST(req: NextRequest) {
  let body: { task?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const task = body.task?.trim()
  if (!task) {
    return NextResponse.json({ error: 'Missing task' }, { status: 400 })
  }

  // Build the candidate agent list shown to the LLM
  const lines = AGENTS.map(a => {
    const uiId = NUMERIC_TO_UI[a.id]
    if (!uiId) return null
    return `- ${uiId}: ${a.name} — ${PURPOSES[uiId] ?? ''}`
  }).filter(Boolean)

  const systemPrompt = `You are a workflow composer for an AI agent marketplace.
Given a user goal and a list of available agents, choose 2-5 agents that should
run IN SEQUENCE to accomplish the goal. Earlier agents feed their output into
later ones.

Output rules — VERY IMPORTANT:
- Output ONLY a JSON array of agent string IDs, in the exact order they should run.
- No prose, no markdown, no commentary, no code fences. Just the array.
- Use ONLY ids from the list. Do not invent new ids.

ROUTING HINTS — pick these specialised agents when the goal matches:
- Anything about a "bill", "receipt", "split the cost", "mamak", "restaurant",
  "share the bill", "chip in", "owe each other": use the Mamak Splitter Pro
  pipeline ["scanner","splitter","notifier"]. Add "contract" before "splitter"
  if the goal also mentions a smart contract. Add "critic" after "contract"
  if the goal mentions review.
- Anything about sending a WhatsApp / Telegram / message TO PEOPLE: include
  "notifier" at the END of the pipeline.
- Anything about scanning, parsing or extracting from a receipt/invoice/image:
  include "scanner" as the FIRST agent.

Available agents:
${lines.join('\n')}

Examples:
Goal: "research crypto trends and write a blog post"
Output: ["research","outliner","writer"]

Goal: "translate my smart contract documentation to Bahasa"
Output: ["contract","translate"]

Goal: "verify facts in this article and summarise"
Output: ["factchecker","summarizer"]

Goal: "split the mamak bill among my friends and send them WhatsApp"
Output: ["scanner","splitter","notifier"]

Goal: "scan this receipt and let everyone know how much they owe"
Output: ["scanner","splitter","notifier"]

Goal: "Build a smart contract that splits the mamak bill and review the code"
Output: ["scanner","splitter","contract","critic","notifier"]`

  let agentIds: string[] | null = null
  let llmRaw = ''
  try {
    // Race the LLM call against a hard timeout. Local Ollama with an 18-agent
    // prompt can take 30s+ on a cold/loaded model — too long for an interactive
    // "auto-compose" button. After the deadline we fall back to keyword routing
    // and the user can still hit RUN immediately.
    llmRaw = await Promise.race([
      callOllama(systemPrompt, `Goal: "${task}"\nOutput:`),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('LLM timed out after 12s')), 12_000)
      ),
    ])
    const match = llmRaw.match(/\[[\s\S]*?\]/)
    if (!match) throw new Error('no JSON array in LLM output')
    const parsed = JSON.parse(match[0]) as unknown
    if (!Array.isArray(parsed)) throw new Error('LLM output was not an array')
    agentIds = parsed
      .filter((x): x is string => typeof x === 'string' && VALID_UI_IDS.has(x))
      // Drop duplicates while preserving order
      .filter((x, i, arr) => arr.indexOf(x) === i)
      .slice(0, 6)
    if (agentIds.length === 0) throw new Error('LLM returned no valid IDs')
  } catch (e) {
    // Keyword-based fallback so the demo never lands on an empty pipeline
    agentIds = keywordFallback(task.toLowerCase())
    return NextResponse.json({
      agentIds,
      source: 'fallback',
      reason: e instanceof Error ? e.message : String(e),
      llmRaw,
    })
  }

  return NextResponse.json({ agentIds, source: 'llm', llmRaw })
}

function keywordFallback(t: string): string[] {
  const picks: string[] = []
  const add = (id: string) => { if (!picks.includes(id)) picks.push(id) }

  // ── Mamak Splitter Pro: bill / receipt / split-the-cost type intents ──
  // Detect BEFORE the generic keywords so this pipeline wins when it should.
  const mentionsBill     = /\b(bill|receipt|invoice|mamak|restaurant|tab|cheque|check)\b/.test(t)
  const mentionsSplit    = /\b(split|share|chip in|owe|divide|per person|each pay)\b/.test(t)
  const mentionsMessage  = /\b(whatsapp|wa\.me|telegram|message|notify|send|remind|text)\b/.test(t)
  const mentionsFriends  = /\b(friends?|group|teammates?|colleagues?|everyone|people)\b/.test(t)

  const isMamakStack = (mentionsBill && (mentionsSplit || mentionsFriends))
    || (mentionsSplit && mentionsBill)
    || (mentionsMessage && mentionsBill)

  if (isMamakStack) {
    add('scanner'); add('splitter')
    if (/\b(contract|solidity|smart[- ]contract|deploy|on[- ]chain)\b/.test(t)) {
      add('contract')
      if (/\b(critique|review|feedback|critic)\b/.test(t)) add('critic')
    }
    add('notifier')
    return picks.slice(0, 5)
  }

  if (/\b(fyp|thesis|dissertation|capstone|final year)\b/.test(t)) {
    add('research'); add('outliner'); add('factchecker'); add('writer')
  }
  if (/\b(research|study|investigate|analyse|analyz|find|discover)\b/.test(t)) add('research')
  if (/\b(outline|structure|plan|organi[sz]e)\b/.test(t))   add('outliner')
  if (/\b(write|draft|article|blog|essay|report|copy)\b/.test(t)) add('writer')
  if (/\b(summari[sz]e|tldr|condense|shorten)\b/.test(t))   add('summarizer')
  if (/\b(verify|fact[- ]?check|confirm|prove)\b/.test(t))  add('factchecker')
  if (/\b(translate|localis|bahasa|melayu|chinese|spanish)\b/.test(t)) add('translate')
  if (/\b(email|letter)\b/.test(t))                         add('emailer')
  if (mentionsMessage && !isMamakStack)                     add('notifier')
  if (/\b(critique|review|feedback|critic)\b/.test(t))      add('critic')
  if (/\b(idea|brainstorm|creative|innovat)\b/.test(t))     add('ideator')
  if (/\b(math|calculat|solve|equation|number)\b/.test(t))  add('mathsolver')
  if (/\b(teach|explain|tutorial|understand|learn)\b/.test(t)) add('tutor')
  if (/\b(question|q&a|answer|ask)\b/.test(t))              add('qabot')
  if (/\b(data|statistic|metric|dataset|csv)\b/.test(t))    add('data')
  if (/\b(contract|solidity|smart[- ]contract|deploy|on[- ]chain)\b/.test(t)) add('contract')
  if (/\b(strategy|recommend|advise|advisor)\b/.test(t))    add('trader')

  if (picks.length === 0) return ['research', 'outliner', 'writer']
  return picks.slice(0, 4)
}
