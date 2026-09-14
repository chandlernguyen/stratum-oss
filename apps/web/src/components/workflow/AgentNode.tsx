import { Handle, Position } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { WorkflowNodeData } from './WorkflowBuilder'

interface AgentNodeProps {
  data: WorkflowNodeData
  selected?: boolean
}

export function AgentNode({ data, selected }: AgentNodeProps) {
  const Icon = data.icon
  
  const statusColors = {
    idle: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-600 animate-pulse',
    complete: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600'
  }

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
        style={{ left: -6 }}
      />
      
      <Card 
        className={cn(
          "min-w-[200px] border-2 transition-all",
          selected ? "border-blue-500 shadow-lg" : "border-gray-200",
          data.status === 'running' && "border-blue-400"
        )}
      >
        <div className="p-4">
          {/* Header with Icon and Status */}
          <div className="flex items-start justify-between mb-2">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${data.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: data.color }} />
            </div>
            <Badge 
              variant="secondary" 
              className={cn("text-xs", statusColors[data.status])}
            >
              {data.status}
            </Badge>
          </div>
          
          {/* Agent Name */}
          <h3 className="font-semibold text-sm mb-1">{data.label}</h3>
          
          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </p>
          
          {/* Input/Output Indicators */}
          {(data.inputs || data.outputs) && (
            <div className="flex gap-2 mt-3">
              {data.inputs && data.inputs.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {data.inputs.length} inputs
                </Badge>
              )}
              {data.outputs && data.outputs.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {data.outputs.length} outputs
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
        style={{ right: -6 }}
      />
    </>
  )
}