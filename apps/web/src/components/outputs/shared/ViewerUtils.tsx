import React from 'react'

export const renderContent = (data: any) => {
  if (typeof data === 'string') {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{data}</p>
  }
  if (Array.isArray(data)) {
    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {data.map((item, index) => (
          <li key={index} className="leading-relaxed">
            {renderValue(item)}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof data === 'object' && data !== null) {
    return renderValue(data)
  }
  return <p className="text-sm">{String(data)}</p>
}

export const formatKey = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Enhanced recursive rendering helper
const renderObjectValue = (value: any, depth: number = 0): React.ReactNode => {
  // Prevent infinite recursion for deeply nested objects
  if (depth > 4) {
    return <span className="text-xs text-muted-foreground italic">...more data</span>
  }

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground text-xs">Not specified</span>
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-sm">{String(value)}</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground text-xs italic">Empty list</span>
    }

    return (
      <div className="space-y-1">
        {value.slice(0, 10).map((item, i) => ( // Limit to 10 items for performance
          <div key={i} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              {renderObjectValue(item, depth + 1)}
            </div>
          </div>
        ))}
        {value.length > 10 && (
          <div className="text-xs text-muted-foreground italic pl-3.5">
            ...and {value.length - 10} more items
          </div>
        )}
      </div>
    )
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      return <span className="text-muted-foreground text-xs italic">Empty object</span>
    }

    return (
      <div className={`space-y-2 ${depth > 0 ? 'pl-3 border-l-2 border-muted' : ''}`}>
        {entries.slice(0, 8).map(([k, v]) => ( // Limit to 8 entries for readability
          <div key={k} className="flex items-start gap-2">
            <span className="text-sm font-medium min-w-fit text-foreground">
              {formatKey(k)}:
            </span>
            <div className="flex-1">
              {renderObjectValue(v, depth + 1)}
            </div>
          </div>
        ))}
        {entries.length > 8 && (
          <div className="text-xs text-muted-foreground italic">
            ...and {entries.length - 8} more fields
          </div>
        )}
      </div>
    )
  }

  return <span className="text-sm">{String(value)}</span>
}

export const renderValue = (value: any): React.ReactNode => {
  return renderObjectValue(value, 0)
}