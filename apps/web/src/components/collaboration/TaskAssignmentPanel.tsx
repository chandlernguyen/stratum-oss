/**
 * TaskAssignmentPanel Component
 *
 * Displays tasks related to a resource (campaign, output, etc.)
 * Allows creating new tasks and updating task status.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  Plus,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Check,
  Play,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useTeamMembers,
  type Task,
  type TaskStatus,
  type TaskType,
  type ApprovalPriority,
} from '@/hooks/data/useCollaboration';
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TaskAssignmentPanelProps {
  resourceType: string;
  resourceId: string;
  clientId?: string;
  className?: string;
}

const taskTypeValues: TaskType[] = ['content_creation', 'review', 'analysis', 'campaign_setup', 'strategy', 'other'];

const priorityColors: Record<ApprovalPriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityValues: ApprovalPriority[] = ['low', 'normal', 'high', 'urgent'];

const statusIcons: Record<TaskStatus, typeof CheckSquare> = {
  todo: CheckSquare,
  in_progress: Play,
  review: Eye,
  done: Check,
  cancelled: X,
};

const statusColors: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function TaskItem({
  task,
  onStatusChange,
  t,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const StatusIcon = statusIcons[task.status];

  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            const nextStatus: TaskStatus =
              task.status === 'todo' ? 'in_progress' :
              task.status === 'in_progress' ? 'review' :
              task.status === 'review' ? 'done' : task.status;
            if (nextStatus !== task.status) {
              onStatusChange(task.id, nextStatus);
            }
          }}
          className={cn(
            'mt-0.5 p-1 rounded transition-colors',
            task.status === 'done'
              ? 'text-green-600 bg-green-100'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          )}
        >
          <StatusIcon className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              'font-medium text-sm text-gray-900 dark:text-gray-100',
              task.status === 'done' && 'line-through opacity-60'
            )}>
              {task.title}
            </h4>
            <Badge className={cn('text-xs flex-shrink-0', statusColors[task.status])}>
              {t(`collaboration.tasks.taskStatus.${task.status}`)}
            </Badge>
          </div>

          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {task.assignee_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.assignee_name}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
              </span>
            )}
            {task.priority && (
              <Badge variant="outline" className={cn('text-xs', priorityColors[task.priority])}>
                {t(`approvals.priority.${task.priority}`)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskAssignmentPanel({
  resourceType,
  resourceId,
  clientId,
  className,
}: TaskAssignmentPanelProps) {
  const { t } = useTranslation(['common']);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('other');
  const [priority, setPriority] = useState<ApprovalPriority>('normal');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data: userContext, isLoading: loadingUser } = useUserContextEnhanced();
  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers(clientId);
  const { data, isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // Check if user can create tasks (exclude viewers)
  const canCreateTasks = userContext?.roles?.some(role => {
    const roleName = role.role_name.toLowerCase();
    return !['sme_viewer', 'agency_viewer', 'agency_client_viewer'].includes(roleName);
  }) ?? false;

  // Filter tasks for this resource
  const resourceTasks = data?.tasks?.filter(
    (t) => t.related_resource_type === resourceType && t.related_resource_id === resourceId
  ) || [];

  const handleCreate = async () => {
    if (!title.trim() || !assignedTo) return;

    await createTask.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      task_type: taskType,
      priority,
      assigned_to: assignedTo,
      due_date: dueDate || undefined,
      related_resource_type: resourceType,
      related_resource_id: resourceId,
      client_id: clientId,
    });

    // Reset form
    setIsCreateOpen(false);
    setTitle('');
    setDescription('');
    setTaskType('other');
    setPriority('normal');
    setAssignedTo('');
    setDueDate('');
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTask.mutate({ id: taskId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckSquare className="h-4 w-4" />
          <span>{t('collaboration.tasks.title', { count: resourceTasks.length })}</span>
        </div>

        {!loadingUser && canCreateTasks && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('collaboration.tasks.addTask')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-blue-500" />
                  {t('collaboration.tasks.createTaskTitle')}
                </DialogTitle>
                <DialogDescription>
                  {t('collaboration.tasks.createTaskDescription', { resourceType })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="task-title">{t('collaboration.tasks.titleLabel')}</Label>
                  <Input
                    id="task-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('collaboration.tasks.titlePlaceholder')}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="task-desc">{t('collaboration.tasks.descriptionLabel')}</Label>
                  <Textarea
                    id="task-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('collaboration.tasks.descriptionPlaceholder')}
                    rows={2}
                  />
                </div>

                {/* Assignee */}
                <div className="space-y-2">
                  <Label htmlFor="assignee" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('collaboration.tasks.assignToLabel')}
                  </Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger id="assignee">
                      <span className="text-gray-900 dark:text-gray-100">
                        {assignedTo && teamMembers
                          ? (teamMembers.find(m => m.id === assignedTo)?.full_name ||
                             teamMembers.find(m => m.id === assignedTo)?.email ||
                             (loadingTeam ? t('loading.default') : t('collaboration.tasks.selectTeamMember')))
                          : (loadingTeam ? t('loading.default') : t('collaboration.tasks.selectTeamMember'))}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers?.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <span>{member.full_name || member.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Task Type and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-type">{t('collaboration.tasks.typeLabel')}</Label>
                    <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                      <SelectTrigger id="task-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTypeValues.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {t(`collaboration.tasks.taskTypes.${opt}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {t('collaboration.tasks.priorityLabel')}
                    </Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as ApprovalPriority)}>
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityValues.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            <Badge className={cn('text-xs', priorityColors[opt])}>{t(`approvals.priority.${opt}`)}</Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="due-date" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('collaboration.tasks.dueDateLabel')}
                  </Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t('buttons.cancel')}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || !assignedTo || createTask.isPending}
                  className="gap-2"
                >
                  {createTask.isPending ? t('collaboration.tasks.creating') : (
                    <>
                      <Plus className="h-4 w-4" />
                      {t('collaboration.tasks.createButton')}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Task List */}
      {resourceTasks.length > 0 ? (
        <div className="space-y-3">
          {resourceTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t('collaboration.tasks.noTasks')}</p>
          {canCreateTasks && (
            <p className="text-xs mt-1">{t('collaboration.tasks.createToStart')}</p>
          )}
        </div>
      )}
    </div>
  );
}
