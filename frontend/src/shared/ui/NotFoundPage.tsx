import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Ничего не найдено</h1>
      <p className="mt-2 text-gray-500">Такой страницы не существует.</p>
      <Link to="/rooms" className="mt-4 inline-block text-blue-600 underline">
        Вернуться к списку переговорных
      </Link>
    </div>
  )
}