import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
  type Sequelize,
} from 'sequelize';
import type { Project } from './project.js';
import type { User } from './user.js';

export class ProjectMember extends Model<
  InferAttributes<ProjectMember>,
  InferCreationAttributes<ProjectMember>
> {
  declare projectId: string;
  declare userId: string;
  declare role: 'OWNER' | 'MEMBER';
  declare user?: NonAttribute<User>;
  declare project?: NonAttribute<Project>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initProjectMember(sequelize: Sequelize): void {
  ProjectMember.init(
    {
      projectId: { type: DataTypes.UUID, primaryKey: true },
      userId: { type: DataTypes.UUID, primaryKey: true },
      role: { type: DataTypes.ENUM('OWNER', 'MEMBER'), allowNull: false },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: 'project_members', underscored: true },
  );
}
