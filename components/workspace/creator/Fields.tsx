import { CATEGORIES } from '@/lib/workspace/eligibility/model';
export const inputClass = 'mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60';
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block text-sm font-medium">{label}{children}{hint && <span className="mt-2 block text-xs font-normal leading-5 text-muted-foreground">{hint}</span>}</label>; }
export function CategorySelect({ value, onChange, name = 'category' }: { value: string; onChange: (value: string) => void; name?: string }) {
  return <select name={name} value={value} onChange={event => onChange(event.target.value)} className={inputClass} required><option value="">Choose aviation category</option>{CATEGORIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>;
}
export function SaveNotice({ message, conflict, error = false, id }: { message: string; conflict: boolean; error?: boolean; id?: string }) { return message ? <p id={id} role={conflict || error ? 'alert' : 'status'} aria-live="polite" className={`rounded-lg border p-4 text-sm leading-6 ${conflict ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-muted/40'}`}>{message}</p> : null; }
