'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ShieldCheck, ShieldAlert, ExternalLink, Coins } from 'lucide-react'
import type {
  QcStage, QcAgentVerdict,
  AuditStage,
  RefundEntry,
} from '@/hooks/useWorkflow'
import { AGENT_LIBRARY } from './WorkflowBuilder'

const L = '#CCFF00'
const RED = '#FF6B6B'
const GOLD = '#FFC857'

interface Props {
  qcStage: QcStage
  qcVerdicts: QcAgentVerdict[]
  qcAllPassed: boolean
  auditStage: AuditStage
  auditRigorous: boolean | null
  auditReason: string
  refunds: RefundEntry[]
}

export default function QualityControl({
  qcStage, qcVerdicts, qcAllPassed,
  auditStage, auditRigorous, auditReason,
  refunds,
}: Props) {
  const visible = qcStage !== 'idle' || auditStage !== 'idle' || refunds.length > 0
  if (!visible) return null

  const totalRefundMon = refunds
    .reduce((s, r) => s + parseFloat(r.amountMon), 0)
    .toFixed(4)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      marginTop: 12, paddingTop: 12,
      borderTop: '1px dashed rgba(255,255,255,0.08)',
      fontFamily: 'var(--font-space-grotesk)',
    }}>
      <p style={{
        fontSize: 9, letterSpacing: '0.45em', color: GOLD,
        textTransform: 'uppercase', margin: 0, fontWeight: 700,
      }}>
        PLATFORM QUALITY ASSURANCE · FREE
      </p>

      {/* QC card */}
      <QcCard stage={qcStage} verdicts={qcVerdicts} allPassed={qcAllPassed} />

      {/* Audit card */}
      <AuditCard stage={auditStage} rigorous={auditRigorous} reason={auditReason} />

      {/* Refunds summary */}
      <AnimatePresence>
        {refunds.length > 0 && (
          <motion.div
            key="refunds"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: 14, borderRadius: 12,
              background: 'rgba(204,255,0,0.06)',
              border: '1px solid rgba(204,255,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Coins size={14} color={L} />
              <span style={{
                fontSize: 10, letterSpacing: '0.2em', color: L,
                textTransform: 'uppercase', fontWeight: 700,
              }}>
                {refunds.length} REFUND{refunds.length === 1 ? '' : 'S'} ISSUED · {totalRefundMon} MON
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {refunds.map((r, i) => {
                const def = AGENT_LIBRARY.find(a => a.id === r.agentId)
                return (
                  <a
                    key={i}
                    href={`https://testnet.monadexplorer.com/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 10, padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(0,0,0,0.3)',
                      textDecoration: 'none',
                      fontFamily: 'monospace', fontSize: 10,
                    }}
                  >
                    <span style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{def?.icon ?? '⚠'}</span>
                      <span>{def?.name ?? r.agentId}</span>
                    </span>
                    <span style={{ color: L, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {r.amountMon} MON
                      <ExternalLink size={10} />
                    </span>
                  </a>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function QcCard({ stage, verdicts, allPassed }:
  { stage: QcStage; verdicts: QcAgentVerdict[]; allPassed: boolean }
) {
  if (stage === 'idle') return null
  const failed = verdicts.filter(v => !v.passed)
  const passed = verdicts.filter(v => v.passed)
  const borderColor = stage === 'thinking'
    ? 'rgba(255,200,87,0.45)'
    : (allPassed ? 'rgba(204,255,0,0.45)' : 'rgba(255,107,107,0.55)')

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        padding: 14, borderRadius: 12,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${borderColor}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: stage === 'done' ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>👮</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>QC Officer</span>
            <span style={{ fontSize: 9, marginLeft: 8, color: GOLD, letterSpacing: '0.1em' }}>FREE</span>
          </div>
        </div>
        {stage === 'thinking' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: GOLD, letterSpacing: '0.1em' }}>
            <Loader2 size={11} style={{ animation: 'qc-spin 0.9s linear infinite' }} />
            INSPECTING…
          </span>
        )}
        {stage === 'done' && allPassed && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: L, letterSpacing: '0.1em', fontWeight: 700 }}>
            <ShieldCheck size={11} />
            ALL PASSED
          </span>
        )}
        {stage === 'done' && !allPassed && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: RED, letterSpacing: '0.1em', fontWeight: 700 }}>
            <ShieldAlert size={11} />
            {failed.length} FAILED
          </span>
        )}
      </div>

      {stage === 'done' && verdicts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...failed, ...passed].map((v, i) => {
            const def = AGENT_LIBRARY.find(a => a.id === v.agentId)
            const color = v.passed ? L : RED
            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '5px 8px', borderRadius: 6,
                  background: 'rgba(0,0,0,0.3)',
                }}
              >
                <span style={{
                  fontSize: 9, color, letterSpacing: '0.08em',
                  fontFamily: 'monospace', fontWeight: 700,
                  minWidth: 36, paddingTop: 1,
                }}>
                  {v.passed ? 'PASS' : 'FAIL'}
                </span>
                <span style={{ fontSize: 10 }}>{def?.icon ?? '·'}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>
                    {def?.name ?? v.agentId}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1.35, marginTop: 1 }}>
                    {v.reason}
                  </div>
                </span>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes qc-spin { to { transform: rotate(360deg) } }`}</style>
    </motion.div>
  )
}

function AuditCard({ stage, rigorous, reason }:
  { stage: AuditStage; rigorous: boolean | null; reason: string }
) {
  if (stage === 'idle') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        padding: 14, borderRadius: 12,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${
          stage === 'thinking'
            ? 'rgba(255,200,87,0.45)'
            : rigorous ? 'rgba(204,255,0,0.45)' : 'rgba(255,107,107,0.55)'
        }`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Audit Inspector</span>
            <span style={{ fontSize: 9, marginLeft: 8, color: GOLD, letterSpacing: '0.1em' }}>FREE</span>
          </div>
        </div>
        {stage === 'thinking' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: GOLD, letterSpacing: '0.1em' }}>
            <Loader2 size={11} style={{ animation: 'qc-spin 0.9s linear infinite' }} />
            AUDITING QC…
          </span>
        )}
        {stage === 'done' && rigorous === true && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: L, letterSpacing: '0.1em', fontWeight: 700 }}>
            <ShieldCheck size={11} />
            QC RIGOROUS
          </span>
        )}
        {stage === 'done' && rigorous === false && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: RED, letterSpacing: '0.1em', fontWeight: 700 }}>
            <ShieldAlert size={11} />
            QC LENIENT
          </span>
        )}
      </div>

      {stage === 'done' && reason && (
        <p style={{
          margin: '8px 0 0', fontSize: 10, lineHeight: 1.45,
          color: 'rgba(255,255,255,0.55)',
        }}>
          {reason}
        </p>
      )}
    </motion.div>
  )
}
