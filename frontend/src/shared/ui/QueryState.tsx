import type { ReactNode } from 'react'

export function LoadingState({ label = 'Загрузка…' }: { label?: string }) {
  return <div className="py-12 text-center text-gray-500">{label}</div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="py-12 text-center">
      <p className="text-red-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-blue-600 underline">
          Повторить
        </button>
      )}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-gray-500">{children}</div>
}