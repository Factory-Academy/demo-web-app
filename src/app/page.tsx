export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        {"{{COMPANY_NAME}}"} Dashboard
      </h1>
      <p className="text-gray-600 mb-8">
        {"{{PROJECT_DESCRIPTION}}"}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold">Items</h2>
          <p className="text-sm text-gray-500">Manage your items</p>
        </div>
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold">Widgets</h2>
          <p className="text-sm text-gray-500">Manage your widgets</p>
        </div>
      </div>
    </main>
  )
}
