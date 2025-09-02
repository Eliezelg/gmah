'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Une erreur est survenue
        </h2>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Nous nous excusons pour la gêne occasionnée.
        </p>
        <button
          onClick={reset}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}