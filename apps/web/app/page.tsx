export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Warm Intro Graph (WIG)
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional networking platform - Under construction
          </p>
          <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Next.js 14+ Monorepo Initialized
            </h2>
            <ul className="text-left text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Turborepo configured with pnpm</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>App Router with TypeScript strict mode</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>TailwindCSS configured</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Package structure ready</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
