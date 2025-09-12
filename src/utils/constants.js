// constants which are not relevent that much to stored in env

export const UserRolesEnum ={
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "member"
}

export const AvailableUserRoles = Object.values(UserRolesEnum);  // to be complete

export const TaskStatusEnum = {
    TODO : "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
}

export const AvailableTaskStatuses = Object.values(TaskStatusEnum);