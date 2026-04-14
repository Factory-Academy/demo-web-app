export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Cohesity Dashboard
      </h1>
      <p className="text-gray-600 mb-8">
        Data protection and security management platform for enterprise data sources
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold">Data Sources</h2>
          <p className="text-sm text-gray-500">Manage your data sources</p>
        </div>
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold">Backup Jobs</h2>
          <p className="text-sm text-gray-500">Manage your backup jobs</p>
        </div>
      </div>
    </main>
  )
}
