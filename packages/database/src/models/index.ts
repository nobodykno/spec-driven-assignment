import { getSequelize } from '../connection.js';
import { Activity, initActivity } from './activity.js';
import { Comment, initComment } from './comment.js';
import { ProjectMember, initProjectMember } from './project-member.js';
import { Project, initProject } from './project.js';
import { RefreshToken, initRefreshToken } from './refresh-token.js';
import { Task, initTask } from './task.js';
import { User, initUser } from './user.js';

export { Activity, Comment, Project, ProjectMember, RefreshToken, Task, User };
export type { ActivityActionValue } from './activity.js';

function defineAssociations(): void {
  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
  Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'memberships' });
  ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
  ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(ProjectMember, { foreignKey: 'userId', as: 'memberships' });

  Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
  Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
  Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });
  Task.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

  Task.hasMany(Comment, { foreignKey: 'taskId', as: 'comments' });
  Comment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
  Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

  Task.hasMany(Activity, { foreignKey: 'taskId', as: 'activities' });
  Activity.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
  Activity.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });
}

// Models are bound to the shared lazy Sequelize instance; no connection is opened here.
function initModels(): void {
  const sequelize = getSequelize();
  [
    initUser,
    initRefreshToken,
    initProject,
    initProjectMember,
    initTask,
    initComment,
    initActivity,
  ].forEach((init) => init(sequelize));
  defineAssociations();
}

initModels();
