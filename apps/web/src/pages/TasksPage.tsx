/**
 * TasksPage - Kanban-style task management
 *
 * Displays tasks organized by status columns with drag-and-drop support.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ListTodo,
  Plus,
  PlayCircle,
  CheckCircle,
  Eye,
  AlertCircle,
  Calendar,
  User,
  MoreVertical,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

const statusIcons: Record<TaskStatus, { icon: React.ReactNode; color: string }> = {
  todo: { icon: <ListTodo className="h-4 w-4" />, color: 'text-slate-500' },
  in_progress: { icon: <PlayCircle className="h-4 w-4" />, color: 'text-blue-500' },
  review: { icon: <Eye className="h-4 w-4" />, color: 'text-amber-500' },
  done: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' },
  cancelled: { icon: <AlertCircle className="h-4 w-4" />, color: 'text-gray-400' },
};

const priorityColors: Record<ApprovalPriority, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const taskTypeValues: TaskType[] = [
  'content_creation',
  'review',
  'analysis',
  'campaign_setup',
  'strategy',
  'other',
];

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const { t } = useTranslation('tasks');
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && task.status !== 'done';
  const isDueToday = dueDate && isToday(dueDate);
  const isDueTomorrow = dueDate && isTomorrow(dueDate);

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(statusIcons)
                .filter(([status]) => status !== task.status && status !== 'cancelled')
                .map(([status, cfg]) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onStatusChange(task.id, status as TaskStatus)}
                  >
                    <span className={cn('mr-2', cfg.color)}>{cfg.icon}</span>
                    {t('actions.moveTo', { status: t(`status.${status}`) })}
                  </DropdownMenuItem>
                ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onStatusChange(task.id, 'cancelled')}
                className="text-red-600"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                {t('actions.cancel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge className={cn('text-xs', priorityColors[task.priority])}>
            {t(`priority.${task.priority}`)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {t(`taskType.${task.task_type}`)}
          </Badge>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">
              {task.assignee_name || t('assignee.unassigned')}
            </span>
          </div>

          {dueDate && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue && 'text-red-500',
                isDueToday && 'text-amber-500',
                isDueTomorrow && 'text-blue-500',
                !isOverdue && !isDueToday && !isDueTomorrow && 'text-gray-500'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {isOverdue
                  ? t('dueDate.overdue')
                  : isDueToday
                  ? t('dueDate.today')
                  : isDueTomorrow
                  ? t('dueDate.tomorrow')
                  : formatDistanceToNow(dueDate, { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function TaskColumn({ status, tasks, onStatusChange }: TaskColumnProps) {
  const { t } = useTranslation('tasks');
  const config = statusIcons[status];

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center gap-2 mb-4">
        <span className={config.color}>{config.icon}</span>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t(`status.${status}`)}</h3>
        <Badge variant="secondary" className="ml-auto">
          {tasks.length}
        </Badge>
      </div>

      <div className="space-y-0">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
        ))}

        {tasks.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400">{t('noTasks')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTaskDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('tasks');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('other');
  const [priority, setPriority] = useState<ApprovalPriority>('normal');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data: teamMembers } = useTeamMembers();
  const createTask = useCreateTask();

  const handleSubmit = async () => {
    if (!title || !assignedTo) return;

    await createTask.mutateAsync({
      title,
      description: description || undefined,
      task_type: taskType,
      priority,
      assigned_to: assignedTo,
      due_date: dueDate || undefined,
    });

    onClose();
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-blue-500" />
          {t('createDialog.title')}
        </DialogTitle>
        <DialogDescription>
          {t('createDialog.description')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="task-title">{t('createDialog.titleLabel')}</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('createDialog.titlePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">{t('createDialog.descriptionLabel')}</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('createDialog.descriptionPlaceholder')}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="task-type">{t('createDialog.typeLabel')}</Label>
            <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
              <SelectTrigger id="task-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`taskType.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-priority">{t('createDialog.priorityLabel')}</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ApprovalPriority)}>
              <SelectTrigger id="task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('priority.low')}</SelectItem>
                <SelectItem value="normal">{t('priority.normal')}</SelectItem>
                <SelectItem value="high">{t('priority.high')}</SelectItem>
                <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="task-assignee">{t('createDialog.assigneeLabel')}</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="task-assignee">
                <SelectValue placeholder={t('createDialog.assigneePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {teamMembers?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due">{t('createDialog.dueDateLabel')}</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('createDialog.cancelButton')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!title || !assignedTo || createTask.isPending}
        >
          {createTask.isPending ? t('createDialog.creatingButton') : t('createDialog.createButton')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function TasksPage() {
  const { t } = useTranslation('tasks');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(true);

  const { data, isLoading } = useTasks({ assigned_to_me: filterAssignedToMe });
  const updateTask = useUpdateTask();

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await updateTask.mutateAsync({ id, status });
  };

  // Group tasks by status
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
    cancelled: [],
  };

  data?.tasks.forEach((task) => {
    tasksByStatus[task.status].push(task);
  });

  // Only show active statuses in Kanban (not cancelled)
  const activeStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 min-w-[280px] max-w-[320px]">
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-blue-500" />
            {t('pageTitle')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('pageSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={filterAssignedToMe ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilterAssignedToMe(!filterAssignedToMe)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {filterAssignedToMe ? t('myTasks') : t('allTasks')}
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('newTask')}
              </Button>
            </DialogTrigger>
            <CreateTaskDialog onClose={() => setShowCreateDialog(false)} />
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {activeStatuses.map((status) => {
          const config = statusIcons[status];
          const count = tasksByStatus[status].length;
          return (
            <Card key={status} className="p-4">
              <div className="flex items-center gap-2">
                <span className={config.color}>{config.icon}</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t(`status.${status}`)}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {count}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {activeStatuses.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  );
}

export default TasksPage;
