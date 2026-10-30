import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from 'sequelize';
import type { Task } from './task.js';
import type { User } from './user.js';

export type ActivityActionValue =
  'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'TASK_ARCHIVED';

// SDS §5.2: append-only, so there is no updated_at.
export class Activity extends Model<InferAttributes<Activity>, InferCreationAttributes<Activity>> {
  declare id: CreationOptional<string>;
  declare taskId: string;
  declare actorId: string;
  declare action: ActivityActionValue;
  declare metadata: CreationOptional<Record<string, unknown>>;
  declare task?: NonAttribute<Task>;
  declare actor?: NonAttribute<User>;
  declare createdAt: CreationOptional<Date>;
}

export function initActivity(sequelize: Sequelize): void {
  Activity.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      taskId: { type: DataTypes.UUID, allowNull: false },
      actorId: { type: DataTypes.UUID, allowNull: false },
      action: {
        type: DataTypes.ENUM(
          'TASK_CREATED',
          'TASK_UPDATED',
          'TASK_ASSIGNED',
          'TASK_STATUS_CHANGED',
          'TASK_ARCHIVED',
        ),
        allowNull: false,
      },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: DataTypes.DATE,
    },
    { sequelize, tableName: 'activities', underscored: true, updatedAt: false },
  );
}
