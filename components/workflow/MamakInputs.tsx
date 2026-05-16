'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Plus, Users, Receipt, ListChecks } from 'lucide-react'

const SKY = '#38BDF8'

export interface MamakFriend { name: string; phone: string }
export interface MamakItem { name: string; price: number; assignedTo: string }

/** Default Restoran Selera Mamak items (matches the demo receipt). */
export const DEFAULT_MAMAK_ITEMS: MamakItem[] = [
  { name: 'Roti Canai Telur',    price: 3.50, assignedTo: '' },
  { name: 'Teh Tarik',           price: 2.50, assignedTo: '' },
  { name: 'Nasi Goreng Kampung', price: 9.00, assignedTo: '' },
  { name: 'Sirap Limau',         price: 2.80, assignedTo: '' },
  { name: 'Mee Goreng Mamak',    price: 8.50, assignedTo: '' },
  { name: 'Kopi Ais',            price: 3.00, assignedTo: '' },
  { name: 'Ayam Goreng',         price: 4.50, assignedTo: '' },
]

interface Props {
  /** Show file-upload area (when Receipt Scanner is in the stack) */
  showReceiptUpload: boolean
  /** Show friends list editor (when Notifier or Splitter is in the stack) */
  showFriends: boolean
  friends: MamakFriend[]
  onFriendsChange: (next: MamakFriend[]) => void
  items: MamakItem[]
  onItemsChange: (next: MamakItem[]) => void
  receiptHint: string
  onReceiptHintChange: (hint: string) => void
  disabled?: boolean
}

export default function MamakInputs({
  showReceiptUpload, showFriends,
  friends, onFriendsChange,
  items, onItemsChange,
  receiptHint, onReceiptHintChange,
  disabled = false,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!showReceiptUpload && !showFriends) return null

  const onPick = (file: File | undefined) => {
    if (!file) return
    onReceiptHintChange(file.name)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const onClearReceipt = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    onReceiptHintChange('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onAddFriend = () => {
    onFriendsChange([...friends, { name: '', phone: '' }])
  }

  const onUpdateFriend = (i: number, field: 'name' | 'phone', value: string) => {
    const next = friends.map((f, idx) => idx === i ? { ...f, [field]: value } : f)
    onFriendsChange(next)
  }

  const onRemoveFriend = (i: number) => {
    onFriendsChange(friends.filter((_, idx) => idx !== i))
  }

  return (
    <div style={{
      marginBottom: 16,
      padding: '14px',
      background: 'rgba(56,189,248,0.04)',
      border: '1px solid rgba(56,189,248,0.22)',
      borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 14,
      fontFamily: 'var(--font-space-grotesk)',
    }}>
      <p style={{
        fontSize: 9, letterSpacing: '0.4em', color: SKY,
        textTransform: 'uppercase', margin: 0, fontWeight: 700,
      }}>
        REAL-WORLD INPUTS · MAMAK SPLITTER PRO
      </p>

      {showReceiptUpload && (
        <ReceiptUpload
          previewUrl={previewUrl}
          fileLabel={receiptHint}
          onPick={onPick}
          onClear={onClearReceipt}
          fileInputRef={fileInputRef}
          disabled={disabled}
        />
      )}

      {showFriends && (
        <FriendsList
          friends={friends}
          onAdd={onAddFriend}
          onUpdate={onUpdateFriend}
          onRemove={onRemoveFriend}
          disabled={disabled}
        />
      )}

      {/* Items list with per-item friend assignment. Shown whenever Splitter
          OR Scanner is in the stack — that's the whole "who ordered what" UX. */}
      {(showReceiptUpload || showFriends) && (
        <ItemsList
          items={items}
          friends={friends}
          onItemsChange={onItemsChange}
          disabled={disabled}
        />
      )}
    </div>
  )
}

function ReceiptUpload({
  previewUrl, fileLabel, onPick, onClear, fileInputRef, disabled,
}: {
  previewUrl: string | null
  fileLabel: string
  onPick: (file: File | undefined) => void
  onClear: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  disabled: boolean
}) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        <Receipt size={11} />
        UPLOAD RECEIPT
      </div>

      {previewUrl ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: 10, borderRadius: 10,
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(56,189,248,0.4)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl} alt="receipt"
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileLabel || 'Receipt uploaded'}
            </div>
            <div style={{ fontSize: 10, color: SKY, marginTop: 2 }}>
              Will be parsed by Receipt Scanner agent
            </div>
          </div>
          <button
            onClick={onClear}
            disabled={disabled}
            style={{
              background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
              color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex',
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = '#FF6B6B' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            if (disabled) return
            const f = e.dataTransfer.files?.[0]
            if (f) onPick(f)
          }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '16px 12px', borderRadius: 10,
            background: dragOver ? 'rgba(56,189,248,0.12)' : 'rgba(0,0,0,0.25)',
            border: `1px dashed ${dragOver ? SKY : 'rgba(56,189,248,0.35)'}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <Upload size={16} color={SKY} />
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>
            Drop receipt image here
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
            or click to browse — any image works for the demo
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={e => onPick(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
        </label>
      )}
    </div>
  )
}

function FriendsList({
  friends, onAdd, onUpdate, onRemove, disabled,
}: {
  friends: MamakFriend[]
  onAdd: () => void
  onUpdate: (i: number, field: 'name' | 'phone', value: string) => void
  onRemove: (i: number) => void
  disabled: boolean
}) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          <Users size={11} />
          FRIENDS TO SPLIT WITH ({friends.length})
        </span>
        <button
          onClick={onAdd}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
            color: SKY, fontSize: 10, fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-space-grotesk)',
          }}
        >
          <Plus size={10} /> ADD
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AnimatePresence initial={false}>
          {friends.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', gap: 6 }}
            >
              <input
                value={f.name}
                onChange={e => onUpdate(i, 'name', e.target.value)}
                placeholder="Name"
                disabled={disabled}
                style={{
                  flex: 1, height: 30, padding: '0 10px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, color: '#fff', fontSize: 11, outline: 'none',
                  fontFamily: 'var(--font-space-grotesk)',
                }}
              />
              <input
                value={f.phone}
                onChange={e => onUpdate(i, 'phone', e.target.value)}
                placeholder="+60123456789"
                disabled={disabled}
                style={{
                  flex: 1.2, height: 30, padding: '0 10px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, color: '#fff', fontSize: 11, outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={() => onRemove(i)}
                disabled={disabled}
                style={{
                  width: 30, height: 30,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 7, color: 'rgba(255,255,255,0.3)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = '#FF6B6B' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
              >
                <X size={11} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {friends.length === 0 && (
          <div style={{
            padding: 8, borderRadius: 6, textAlign: 'center',
            fontSize: 10, color: 'rgba(255,255,255,0.3)',
            border: '1px dashed rgba(255,255,255,0.08)',
          }}>
            Add at least one friend with a phone number to get a WhatsApp link
          </div>
        )}
      </div>
    </div>
  )
}

function ItemsList({
  items, friends, onItemsChange, disabled,
}: {
  items: MamakItem[]
  friends: MamakFriend[]
  onItemsChange: (next: MamakItem[]) => void
  disabled: boolean
}) {
  const updateItem = (i: number, patch: Partial<MamakItem>) => {
    onItemsChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  const removeItem = (i: number) => {
    onItemsChange(items.filter((_, idx) => idx !== i))
  }
  const addItem = () => {
    onItemsChange([...items, { name: '', price: 0, assignedTo: '' }])
  }

  const total = items.reduce((s, i) => s + (i.price || 0), 0)

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          <ListChecks size={11} />
          WHO ORDERED WHAT ({items.length} items · RM {total.toFixed(2)})
        </span>
        <button
          onClick={addItem}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
            color: SKY, fontSize: 10, fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-space-grotesk)',
          }}
        >
          <Plus size={10} /> ITEM
        </button>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 5,
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 8, padding: 8,
      }}>
        {items.length === 0 ? (
          <div style={{
            padding: 8, borderRadius: 6, textAlign: 'center',
            fontSize: 10, color: 'rgba(255,255,255,0.3)',
          }}>
            No items. Click + ITEM to add one, or run Receipt Scanner to load defaults.
          </div>
        ) : items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <input
              value={it.name}
              onChange={e => updateItem(i, { name: e.target.value })}
              placeholder="Item name"
              disabled={disabled}
              style={{
                flex: 2, height: 26, padding: '0 8px',
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, color: '#fff', fontSize: 10, outline: 'none',
                fontFamily: 'var(--font-space-grotesk)',
              }}
            />
            <input
              type="number"
              step="0.01"
              value={Number.isFinite(it.price) ? it.price : 0}
              onChange={e => updateItem(i, { price: Number(e.target.value) || 0 })}
              disabled={disabled}
              style={{
                width: 56, height: 26, padding: '0 6px',
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, color: '#fff', fontSize: 10, outline: 'none',
                fontFamily: 'monospace', textAlign: 'right',
              }}
            />
            <select
              value={it.assignedTo}
              onChange={e => updateItem(i, { assignedTo: e.target.value })}
              disabled={disabled}
              style={{
                flex: 1.4, height: 26, padding: '0 6px',
                background: 'rgba(0,0,0,0.35)',
                border: `1px solid ${it.assignedTo ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6,
                color: it.assignedTo ? SKY : 'rgba(255,255,255,0.55)',
                fontSize: 10, outline: 'none',
                fontFamily: 'var(--font-space-grotesk)',
              }}
            >
              <option value="" style={{ background: '#0a0612', color: 'rgba(255,255,255,0.6)' }}>
                (split)
              </option>
              {friends.filter(f => f.name.trim()).map((f, fi) => (
                <option key={fi} value={f.name} style={{ background: '#0a0612', color: '#fff' }}>
                  {f.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeItem(i)}
              disabled={disabled}
              style={{
                width: 22, height: 26,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 6, color: 'rgba(255,255,255,0.3)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = '#FF6B6B' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      <p style={{
        margin: '6px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.35)',
        textAlign: 'right', fontFamily: 'var(--font-space-grotesk)',
      }}>
        Unassigned items (split) are divided equally among all friends.
      </p>
    </div>
  )
}
