import { useCallback, useState, useEffect } from 'react'
import ReactFlow, {
  type Node,
  type Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  MarkerType,
  Position,
  type BackgroundVariant
} from 'reactflow'
import 'reactflow/dist/style.css'
import { AgentNode } from './AgentNode'
import { AGENT_IDENTITY } from '@/config/agentIdentity'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Save, RotateCcw, Sparkles } from 'lucide-react'
import type { SavedOutput } from '@/types/agents'

export interface WorkflowNodeData {

  agentId: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  status: 'idle' | 'running' | 'complete' | 'error'
  inputs?: SavedOutput[]
  outputs?: SavedOutput[]
}

export type WorkflowNode = Node<WorkflowNodeData>

interface WorkflowBuilderProps {
  onExecuteWorkflow?: (nodes: WorkflowNode[], edges: Edge[]) => void
  className?: string
}

// Define custom node types
const nodeTypes: NodeTypes = {
  agent: AgentNode,
}

// Predefined workflow templates
const WORKFLOW_TEMPLATES = {
  'market-entry': {
    name: 'Market Entry Strategy',
    description: 'Complete market analysis and strategy development',
    nodes: ['strategy', 'competitive-intelligence', 'persona', 'content'],
    edges: [
      { source: 'strategy', target: 'competitive-intelligence' },
      { source: 'strategy', target: 'persona' },
      { source: 'persona', target: 'content' }
    ]
  },
  'growth-hack': {
    name: 'Growth Hacking',
    description: 'Rapid growth through quick wins and optimization',
    nodes: ['quick-wins', 'campaign-execution', 'analytics', 'roi-budget'],
    edges: [
      { source: 'quick-wins', target: 'campaign-execution' },
      { source: 'campaign-execution', target: 'analytics' },
      { source: 'analytics', target: 'roi-budget' }
    ]
  },
  'client-rescue': {
    name: 'Client Retention',
    description: 'Improve client satisfaction and retention',
    nodes: ['client-success', 'analytics', 'strategy', 'quick-wins'],
    edges: [
      { source: 'client-success', target: 'analytics' },
      { source: 'analytics', target: 'strategy' },
      { source: 'strategy', target: 'quick-wins' }
    ]
  },
  'full-cycle': {
    name: 'Full Marketing Cycle',
    description: 'End-to-end marketing from strategy to execution',
    nodes: ['strategy', 'persona', 'content', 'campaign-execution', 'analytics'],
    edges: [
      { source: 'strategy', target: 'persona' },
      { source: 'persona', target: 'content' },
      { source: 'content', target: 'campaign-execution' },
      { source: 'campaign-execution', target: 'analytics' }
    ]
  }
}

export function WorkflowBuilder({ onExecuteWorkflow, className }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // Initialize with empty workflow
  useEffect(() => {
    // Add initial welcome node
    const welcomeNode: Node<WorkflowNodeData> = {
      id: 'welcome',
      type: 'default',
      position: { x: 250, y: 100 },
      data: {
        agentId: 'welcome',
        label: 'Start Here',
        description: 'Drag agents from the sidebar or select a template',
        icon: Sparkles,
        color: '#6366F1',
        status: 'idle' as const
      }
    }
    setNodes([welcomeNode])
  }, [setNodes])

  // Handle edge connection
  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 2,
          stroke: '#6366F1'
        }
      }
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges]
  )

  // Load workflow template
  const loadTemplate = (templateKey: string) => {
    const template = WORKFLOW_TEMPLATES[templateKey as keyof typeof WORKFLOW_TEMPLATES]
    if (!template) return

    const newNodes: Node<WorkflowNodeData>[] = []
    const newEdges: Edge[] = []

    // Create nodes
    template.nodes.forEach((agentId, index) => {
      const agent = AGENT_IDENTITY[agentId]
      if (!agent) return

      const row = Math.floor(index / 3)
      const col = index % 3

      newNodes.push({
        id: agentId,
        type: 'agent',
        position: { 
          x: 150 + col * 250, 
          y: 100 + row * 150 
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          agentId: agent.id,
          label: agent.name,
          description: agent.description,
          icon: agent.icon,
          color: agent.color,
          status: 'idle'
        }
      })
    })

    // Create edges
    template.edges.forEach((edge, index) => {
      newEdges.push({
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 2,
          stroke: '#6366F1'
        }
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
    setSelectedTemplate(templateKey)
  }

  // Add agent to workflow
  const addAgent = (agentId: string) => {
    const agent = AGENT_IDENTITY[agentId]
    if (!agent) return

    const newNode: Node<WorkflowNodeData> = {
      id: `${agentId}-${Date.now()}`,
      type: 'agent',
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        agentId: agent.id,
        label: agent.name,
        description: agent.description,
        icon: agent.icon,
        color: agent.color,
        status: 'idle'
      }
    }

    setNodes((nds) => [...nds.filter(n => n.id !== 'welcome'), newNode])
  }

  // Execute workflow
  const handleExecute = () => {
    if (nodes.length === 0 || nodes[0].id === 'welcome') return

    setIsExecuting(true)
    
    // Simulate execution - in real app this would trigger actual agent calls
    nodes.forEach((node, index) => {
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, status: 'running' } }
              : n
          )
        )

        setTimeout(() => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? { ...n, data: { ...n.data, status: 'complete' } }
                : n
            )
          )
        }, 2000)
      }, index * 2500)
    })

    setTimeout(() => {
      setIsExecuting(false)
      if (onExecuteWorkflow) {
        onExecuteWorkflow(nodes, edges)
      }
    }, nodes.length * 2500)
  }

  // Reset workflow
  const handleReset = () => {
    setNodes([])
    setEdges([])
    setSelectedTemplate(null)
    setIsExecuting(false)
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                AI Workflow Builder
              </CardTitle>
              <CardDescription>
                Connect agents to create powerful marketing workflows
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isExecuting}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={isExecuting || nodes.length === 0 || nodes[0].id === 'welcome'}
              >
                <Play className="w-4 h-4 mr-1" />
                {isExecuting ? 'Running...' : 'Execute'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Template Selector */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Quick Templates:</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => (
                <Badge
                  key={key}
                  variant={selectedTemplate === key ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => loadTemplate(key)}
                >
                  {template.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Workflow Canvas */}
          <div className="h-[500px] bg-gray-50 rounded-lg border">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background variant={"dots" as BackgroundVariant} gap={12} size={1} />
              <Controls />
              <MiniMap 
                nodeColor={(node) => node.data?.color || '#6366F1'}
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb'
                }}
              />
            </ReactFlow>
          </div>

          {/* Agent Palette */}
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Available Agents:</p>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {Object.values(AGENT_IDENTITY).map((agent) => {
                const Icon = agent.icon
                return (
                  <Button
                    key={agent.id}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => addAgent(agent.id)}
                    disabled={isExecuting}
                  >
                    <Icon className="w-4 h-4 mr-1" style={{ color: agent.color }} />
                    <span className="truncate text-xs">{agent.badge}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}