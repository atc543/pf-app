import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Category, SavingsBucket, Transaction } from '../types'
import CategoryPicker from './CategoryPicker'

interface Props {
  transaction?: Transaction | null
  categories: Category[]
  buckets: SavingsBucket[]
  onClose: () => void
  onSaved: () => void
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function enteredByFromEmail(email?: string): string | null {
  if (email === 'lukashammack@gmail.com') return 'Luke'
  if (email === 'carolinewainner@yahoo.com') return 'Caroline'
  return null
}

function signedAmount(raw: number, type: string, isWithdrawal: boolean): number {
  if (type === 'income') return raw
  if (type === 'savings') return isWithdrawal ? -raw : raw
  return -raw // expense, giving
}

async function adjustBucket(bucketId: string, delta: number) {
  const { data, error } = await supabase
    .from('savings_buckets')
    .select('current_balance')
    .eq('id', bucketId)
    .single()
  if (error || !data) throw new Error('Bucket not found')
  const newBalance = Number(data.current_balance) + delta
  const { error: updateError } = await supabase
    .from('savings_buckets')
    .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', bucketId)
  if (updateError) throw updateError
}

export default function TransactionForm({ transaction, categories, buckets, onClose, onSaved }: Props) {
  const { session } = useAuth()
  const isEdit = !!transaction
  const payeeRef = useRef<HTMLInputElement>(null)

  const [date, setDate] = useState(transaction?.date ?? todayStr())
  const [payee, setPayee] = useState(transaction?.payee ?? '')
  const [amount, setAmount] = useState(transaction ? String(Math.abs(Number(transaction.amount))) : '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '')
  const [isWithdrawal, setIsWithdrawal] = useState(
    isEdit && transaction!.categories?.type === 'savings' ? Number(transaction!.amount) < 0 : false
  )
  const [notes, setNotes] = useState(transaction?.notes ?? '')
  const [showPicker, setShowPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => payeeRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  const selectedCat = categories.find(c => c.id === categoryId)
  const isSavings = selectedCat?.type === 'savings'
  const bucketId = isSavings ? (buckets.find(b => b.name === selectedCat?.name)?.id ?? '') : ''

  async function handleSave() {
    if (!date) { setError('Date is required.'); return }
    if (!payee.trim()) { setError('Payee is required.'); return }
    const rawAmt = parseFloat(amount)
    if (!amount || isNaN(rawAmt) || rawAmt <= 0) { setError('Enter a valid amount.'); return }
    if (!categoryId) { setError('Select a category.'); return }

    setSubmitting(true)
    setError('')

    const amt = signedAmount(rawAmt, selectedCat!.type, isWithdrawal)
    const enteredBy = enteredByFromEmail(session?.user?.email)
    const savingsBucketId = isSavings ? bucketId : null

    try {
      if (isEdit) {
        if (transaction!.savings_bucket_id) {
          await adjustBucket(transaction!.savings_bucket_id, -Number(transaction!.amount))
        }
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ date, payee: payee.trim(), amount: amt, category_id: categoryId, savings_bucket_id: savingsBucketId, notes: notes.trim() || null, entered_by: enteredBy })
          .eq('id', transaction!.id)
        if (updateError) throw updateError
        if (savingsBucketId) await adjustBucket(savingsBucketId, amt)
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('transactions')
          .insert({ date, payee: payee.trim(), amount: amt, category_id: categoryId, savings_bucket_id: savingsBucketId, notes: notes.trim() || null, entered_by: enteredBy })
          .select()
          .single()
        if (insertError) throw insertError
        if (savingsBucketId) {
          try {
            await adjustBucket(savingsBucketId, amt)
          } catch (bucketErr) {
            await supabase.from('transactions').delete().eq('id', inserted.id)
            throw bucketErr
          }
        }
      }
      onSaved()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!transaction) return
    setSubmitting(true)
    try {
      if (transaction.savings_bucket_id) {
        await adjustBucket(transaction.savings_bucket_id, -Number(transaction.amount))
      }
      await supabase.from('transactions').delete().eq('id', transaction.id)
      onSaved()
    } catch {
      setError('Failed to delete. Please try again.')
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full bg-pf-bg border border-pf-line text-pf-ink rounded-xl px-4 py-3 text-base placeholder:text-pf-ghost focus:outline-none focus:border-pf-gold transition'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-pf-card rounded-t-2xl max-h-[92vh] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:rounded-2xl md:max-h-[90vh]">

        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div className="w-10 h-1 bg-pf-line rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <button onClick={onClose} className="text-pf-ghost hover:text-pf-ink text-sm w-14 text-left transition-colors">Cancel</button>
          <h2 className="text-pf-ink font-semibold">{isEdit ? 'Edit Transaction' : 'New Transaction'}</h2>
          <div className="w-14" />
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">

          <div>
            <label className="block lbl mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block lbl mb-1.5">Payee / Description</label>
            <input
              ref={payeeRef}
              type="text"
              value={payee}
              onChange={e => setPayee(e.target.value)}
              placeholder="e.g. Whole Foods"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block lbl mb-1.5">Amount</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block lbl mb-1.5">Category</label>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full bg-pf-bg border border-pf-line text-left rounded-xl px-4 py-3 text-base focus:outline-none focus:border-pf-gold transition min-h-[48px]"
            >
              {selectedCat
                ? <span className="text-pf-ink">{selectedCat.name}</span>
                : <span className="text-pf-ghost">Select a category…</span>
              }
            </button>
          </div>

          {isSavings && (
            <>
              <div>
                <label className="block lbl mb-1.5">Type</label>
                <div className="flex rounded-xl overflow-hidden border border-pf-line">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawal(false)}
                    className={`flex-1 py-3 text-base font-medium transition-colors ${!isWithdrawal ? 'bg-pf-leaf text-pf-bg' : 'bg-pf-card text-pf-ghost'}`}
                  >
                    Contribution
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWithdrawal(true)}
                    className={`flex-1 py-3 text-base font-medium transition-colors ${isWithdrawal ? 'bg-pf-coral text-pf-bg' : 'bg-pf-card text-pf-ghost'}`}
                  >
                    Withdrawal
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block lbl mb-1.5">Notes <span className="text-pf-ghost font-normal normal-case tracking-normal">(optional)</span></label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional note…"
              className={inputCls}
            />
          </div>

          {error && <p className="text-pf-coral text-sm">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="w-full bg-pf-gold hover:bg-pf-gold/90 active:bg-pf-gold/80 disabled:opacity-60 text-pf-bg font-semibold py-3.5 rounded-xl text-base transition-colors"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="w-full border border-pf-coral/50 hover:bg-pf-coral/10 text-pf-coral font-semibold py-3.5 rounded-xl text-base transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {showPicker && (
        <CategoryPicker
          categories={categories}
          selectedId={categoryId}
          onSelect={id => { setCategoryId(id); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
