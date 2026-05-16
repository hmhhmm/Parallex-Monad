import { NextResponse } from 'next/server'
import { publicClient } from '@/lib/monad'
import { REGISTRY_ADDRESS, REGISTRY_ABI } from '@/lib/contracts'
import { AGENTS } from '@/lib/agents'

export const dynamic = 'force-dynamic'

// In-memory cache. Per-route module is loaded once per server instance, so this
// survives across requests. The public Monad RPC throttles rapid bursts —
// without caching, every workflow run + every UI mount hammers it with
// 1+N reads. 30s is short enough to pick up newly-seeded agents soon-ish,
// long enough to keep the demo bulletproof.
type CachedAgent = {
  id: number
  name: string
  specialty: string
  pricePerTask: string
  wallet: string
  active: boolean
  systemPrompt: string
}

let cache: { agents: CachedAgent[]; fetchedAt: number } | null = null
const CACHE_TTL_MS = 30_000

async function readRegistry(): Promise<CachedAgent[]> {
  const count = await publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'agentCount',
  })

  // Sequential, not Promise.all — kinder to a throttled public RPC. With 18
  // agents this adds ~1s vs parallel; with caching it only runs once per 30s
  // anyway, so the cost is negligible.
  const onChain: { name: string; specialty: string; pricePerTask: bigint; wallet: string; active: boolean }[] = []
  for (let i = 0; i < Number(count); i++) {
    const a = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'getAgent',
      args: [BigInt(i)],
    })
    onChain.push(a as typeof onChain[number])
  }

  return onChain.map((a, i) => ({
    id: i,
    name: a.name,
    specialty: a.specialty,
    pricePerTask: a.pricePerTask.toString(),
    wallet: a.wallet,
    active: a.active,
    systemPrompt: AGENTS.find(x => x.id === i)?.systemPrompt ?? '',
  }))
}

export async function GET(req: Request) {
  // Off-chain fallback if registry isn't deployed
  if (REGISTRY_ADDRESS === '0x') {
    return NextResponse.json({
      source: 'off-chain',
      agents: AGENTS.map(a => ({
        id: a.id,
        name: a.name,
        specialty: 'TBD (registry not deployed)',
        pricePerTask: '0',
        wallet: '0x0',
        active: true,
      })),
    })
  }

  // ?fresh=1 (or fresh=true) bypasses the cache for diagnostics
  const url = new URL(req.url)
  const bypass = url.searchParams.has('fresh')

  // Serve from cache if it's still warm
  if (!bypass && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      source: 'on-chain',
      agents: cache.agents,
      cached: true,
      cacheAgeMs: Date.now() - cache.fetchedAt,
    })
  }

  // Refresh from chain. If it fails AND we have stale cache, serve that
  // instead of 500 — agents rarely change, stale is much better than broken.
  try {
    const agents = await readRegistry()
    cache = { agents, fetchedAt: Date.now() }
    return NextResponse.json({ source: 'on-chain', agents })
  } catch (e: unknown) {
    if (cache) {
      return NextResponse.json({
        source: 'on-chain',
        agents: cache.agents,
        cached: true,
        stale: true,
        error: e instanceof Error ? e.message : String(e),
      })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
