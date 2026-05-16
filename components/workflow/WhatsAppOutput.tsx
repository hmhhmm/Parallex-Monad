'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Send, ExternalLink } from 'lucide-react'

const WA_GREEN = '#22C55E'

export interface WhatsAppMessage {
  name: string
  phone: string
  amount: string
  link: string
  message: string
}

interface Props {
  /** Structured messages from the orchestrator's `mamak_messages` side-channel
   *  event. Drives the rich cards directly — no parsing needed. */
  messages: WhatsAppMessage[]
}

export default function WhatsAppOutput({ messages }: Props) {
  if (messages.length === 0) return null

  return (
    <div style={{
      marginTop: 12, paddingTop: 12,
      borderTop: '1px dashed rgba(255,255,255,0.08)',
      fontFamily: 'var(--font-space-grotesk)',
    }}>
      <p style={{
        fontSize: 9, letterSpacing: '0.45em', color: WA_GREEN,
        textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700,
      }}>
        REAL-WORLD OUTPUT · {messages.length} WHATSAPP MESSAGE{messages.length === 1 ? '' : 'S'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.a
              key={i}
              href={m.link}
              target="_blank"
              rel="noreferrer"
              title={m.message /* Full message visible on hover */}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.3)',
                textDecoration: 'none',
                transition: 'background 0.15s, border-color 0.15s',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(34,197,94,0.12)'
                e.currentTarget.style.borderColor = WA_GREEN
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(34,197,94,0.06)'
                e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>📲</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>
                    {m.name}
                  </span>
                  {m.phone && (
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                      {m.phone}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {m.message}
                </div>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                flexShrink: 0, gap: 2,
              }}>
                <span style={{ fontSize: 12, color: WA_GREEN, fontWeight: 700, fontFamily: 'monospace' }}>
                  RM {m.amount}
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 8, color: WA_GREEN,
                  letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
                }}>
                  <Send size={8} />
                  OPEN
                  <ExternalLink size={8} />
                </span>
              </div>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

