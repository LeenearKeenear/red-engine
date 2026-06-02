// Mirrors the verification badge block in templates/article.html — same colors,
// borders, icons and labels keyed off the verification_state string.

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-[0.85rem] w-[0.85rem]">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function VerificationBadge({ state, author }) {
  if (!state) return null

  const base = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border px-2.5 py-1 font-sans text-xs font-semibold'

  switch (state) {
    case 'verified':
      return (
        <span className={`${base} border-[#86efac] bg-[#f0fdf4] text-[#15803d]`}>
          <CheckIcon />
          Verified{author ? ` · ${author}` : ''}
        </span>
      )
    case 'tampered':
      return <span className={`${base} border-[#fca5a5] bg-[#fff1f2] text-[#b91c1c]`}>⚠ Modified After Signing</span>
    case 'invalid_sig':
      return <span className={`${base} border-[#fca5a5] bg-[#fff1f2] text-[#b91c1c]`}>✗ Invalid Signature</span>
    case 'untrusted':
      return <span className={`${base} border-[#fcd34d] bg-[#fffbeb] text-[#92400e]`}>⚠ Untrusted Signer</span>
    case 'malformed':
      return <span className={`${base} border-[#fca5a5] bg-[#fff1f2] text-[#b91c1c]`}>✗ Malformed Signature</span>
    default:
      return <span className={`${base} border-[#93c5fd] bg-[#eff6ff] text-[#1e3a5f]`}>Unsigned</span>
  }
}
