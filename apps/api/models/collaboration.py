"""
Collaboration Models - Pydantic models for approval, comments, tasks, and notifications
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class ApprovalPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    CONTENT_CREATION = "content_creation"
    REVIEW = "review"
    ANALYSIS = "analysis"
    CAMPAIGN_SETUP = "campaign_setup"
    STRATEGY = "strategy"
    OTHER = "other"


class NotificationType(str, Enum):
    APPROVAL_REQUEST = "approval_request"
    APPROVAL_RESOLVED = "approval_resolved"
    APPROVAL_CHANGES_REQUESTED = "approval_changes_requested"
    COMMENT = "comment"
    MENTION = "mention"
    COMMENT_RESOLVED = "comment_resolved"
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_DUE_SOON = "task_due_soon"
    TASK_STATUS_CHANGED = "task_status_changed"
    SYSTEM = "system"


# ============================================================================
# Approval Request Models
# ============================================================================

class ApprovalRequestCreate(BaseModel):
    """Create a new approval request"""
    resource_type: str = Field(..., description="Type of resource (campaign, content, persona, etc.)")
    resource_id: UUID = Field(..., description="ID of the resource")
    assigned_to: UUID = Field(..., description="User ID to assign approval to")
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: ApprovalPriority = ApprovalPriority.NORMAL
    due_date: Optional[datetime] = None
    client_id: Optional[UUID] = None  # For agency client-scoped approvals


class ApprovalRequestResolve(BaseModel):
    """Resolve an approval request"""
    status: ApprovalStatus = Field(..., description="New status (approved, rejected, changes_requested)")
    resolution_note: Optional[str] = None


class ApprovalRequestResponse(BaseModel):
    """Full approval request response"""
    id: UUID
    org_id: UUID
    client_id: Optional[UUID] = None
    resource_type: str
    resource_id: UUID
    status: ApprovalStatus
    requested_by: UUID
    assigned_to: UUID
    title: str
    description: Optional[str] = None
    priority: ApprovalPriority
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    resolution_note: Optional[str] = None
    # Joined fields
    requester_name: Optional[str] = None
    assignee_name: Optional[str] = None
    resolver_name: Optional[str] = None


class ApprovalListResponse(BaseModel):
    """List of approval requests"""
    approvals: List[ApprovalRequestResponse]
    total: int
    pending_count: int


# ============================================================================
# Comment Models
# ============================================================================

class CommentCreate(BaseModel):
    """Create a new comment"""
    resource_type: str = Field(..., description="Type of resource (campaign, content, persona, etc.)")
    resource_id: UUID = Field(..., description="ID of the resource")
    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: Optional[UUID] = None  # For threaded replies
    mentioned_users: Optional[List[UUID]] = None
    client_id: Optional[UUID] = None  # For agency client-scoped comments


class CommentUpdate(BaseModel):
    """Update a comment"""
    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    is_resolved: Optional[bool] = None


class CommentResponse(BaseModel):
    """Full comment response"""
    id: UUID
    org_id: UUID
    client_id: Optional[UUID] = None
    resource_type: str
    resource_id: UUID
    parent_id: Optional[UUID] = None
    author_id: UUID
    content: str
    is_resolved: bool
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None
    mentioned_users: Optional[List[UUID]] = None
    created_at: datetime
    updated_at: datetime
    # Joined fields
    author_name: Optional[str] = None
    author_email: Optional[str] = None
    replies: Optional[List["CommentResponse"]] = None  # For threaded comments


class CommentListResponse(BaseModel):
    """List of comments for a resource"""
    comments: List[CommentResponse]
    total: int


# ============================================================================
# Task Models
# ============================================================================

class TaskCreate(BaseModel):
    """Create a new task"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    task_type: TaskType = TaskType.OTHER
    priority: ApprovalPriority = ApprovalPriority.NORMAL
    assigned_to: UUID = Field(..., description="User ID to assign task to")
    due_date: Optional[datetime] = None
    related_resource_type: Optional[str] = None
    related_resource_id: Optional[UUID] = None
    client_id: Optional[UUID] = None  # For agency client-scoped tasks


class TaskUpdate(BaseModel):
    """Update a task"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    status: Optional[TaskStatus] = None
    priority: Optional[ApprovalPriority] = None
    assigned_to: Optional[UUID] = None
    due_date: Optional[datetime] = None


class TaskResponse(BaseModel):
    """Full task response"""
    id: UUID
    org_id: UUID
    client_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    task_type: TaskType
    status: TaskStatus
    priority: ApprovalPriority
    assigned_by: UUID
    assigned_to: UUID
    due_date: Optional[datetime] = None
    related_resource_type: Optional[str] = None
    related_resource_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    # Joined fields
    assigner_name: Optional[str] = None
    assignee_name: Optional[str] = None


class TaskListResponse(BaseModel):
    """List of tasks"""
    tasks: List[TaskResponse]
    total: int
    by_status: dict  # { "todo": 5, "in_progress": 3, ... }


# ============================================================================
# Notification Models
# ============================================================================

class NotificationResponse(BaseModel):
    """Full notification response"""
    id: UUID
    user_id: UUID
    org_id: UUID
    type: NotificationType
    title: str
    body: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    action_url: Optional[str] = None
    is_read: bool
    is_email_sent: bool
    created_at: datetime
    read_at: Optional[datetime] = None


class NotificationListResponse(BaseModel):
    """List of notifications"""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class MarkNotificationsReadRequest(BaseModel):
    """Mark notifications as read"""
    notification_ids: Optional[List[UUID]] = None  # If None, mark all as read


class NotificationCountResponse(BaseModel):
    """Notification count summary"""
    unread_count: int
    pending_approvals: int
    pending_tasks: int


# Fix forward reference for recursive CommentResponse
CommentResponse.model_rebuild()
