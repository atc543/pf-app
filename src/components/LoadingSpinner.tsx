interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
}

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
}

export default function LoadingSpinner({ size = 'md', fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className={`${SIZES[size]} rounded-full border-slate-700 border-t-indigo-500 animate-spin`} />
  )
  if (fullPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
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
