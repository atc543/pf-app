interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
}

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-10 h-10 border-[2px]',
}

export default function LoadingSpinner({ size = 'md', fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className={`${SIZES[size]} rounded-full border-pf-line border-t-pf-gold animate-spin`} />
  )
  if (fullPage) {
    return (
      <div className="min-h-screen bg-pf-bg flex items-center justify-center">
        {spinner}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center h-40">
      {spinner}
    </div>
  )
}
