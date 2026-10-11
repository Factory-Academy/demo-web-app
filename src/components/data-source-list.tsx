import { DataSource } from '@/models/data-source'

interface DataSourceListProps {
  dataSources: DataSource[]
  showDetails?: boolean
}

export function DataSourceList({ dataSources, showDetails = true }: DataSourceListProps) {
  if (dataSources.length === 0) {
    return <p className="text-gray-500">No data sources found.</p>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'protected': return 'text-green-600'
      case 'unprotected': return 'text-red-600'
      case 'at_risk': return 'text-yellow-600'
      default: return 'text-gray-500'
    }
  }

  return (
    <ul className="divide-y">
      {dataSources.map((dataSource) => (
        <li key={dataSource.id} className="py-3">
          <div className="flex justify-between">
            <span className="font-medium">{dataSource.name}</span>
            <span className={`text-sm ${getStatusColor(dataSource.status)}`}>
              {dataSource.status}
            </span>
          </div>
          {showDetails && dataSource.description && (
            <div
              className="text-sm text-gray-600 mt-1"
              dangerouslySetInnerHTML={{ __html: dataSource.description }}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
