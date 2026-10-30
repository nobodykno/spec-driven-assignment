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

export class Comment extends Model<InferAttributes<Comment>, InferCreationAttributes<Comment>> {
  declare id: CreationOptional<string>;
  declare taskId: string;
  declare authorId: string;
  declare body: string;
  declare editedAt: CreationOptional<Date | null>;
  declare deletedAt: CreationOptional<Date | null>;
  declare task?: NonAttribute<Task>;
  declare author?: NonAttribute<User>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initComment(sequelize: Sequelize): void {
  Comment.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      taskId: { type: DataTypes.UUID, allowNull: false },
      authorId: { type: DataTypes.UUID, allowNull: false },
      body: { type: DataTypes.STRING(2000), allowNull: false },
      editedAt: { type: DataTypes.DATE, allowNull: true },
      deletedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: 'comments', underscored: true, paranoid: true },
  );
}
