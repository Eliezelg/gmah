import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">Page non trouvée</p>
        <p className="mt-2 text-gray-500 dark:text-gray-500">
          La page que vous recherchez n&apos;existe pas.
        </p>
        <Link href="/" className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}