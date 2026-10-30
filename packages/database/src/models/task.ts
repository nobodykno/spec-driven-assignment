import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from 'sequelize';

export class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
  declare id: CreationOptional<string>;
  declare projectId: string;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'>;
  declare priority: CreationOptional<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>;
  declare dueDate: CreationOptional<string | null>;
  declare assigneeId: CreationOptional<string | null>;
  declare createdById: string;
  declare archivedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initTask(sequelize: Sequelize): void {
  Task.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      projectId: { type: DataTypes.UUID, allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'),
        allowNull: false,
        defaultValue: 'TODO',
      },
      priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
        allowNull: false,
        defaultValue: 'MEDIUM',
      },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
      assigneeId: { type: DataTypes.UUID, allowNull: true },
      createdById: { type: DataTypes.UUID, allowNull: false },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    { sequelize, tableName: 'tasks', underscored: true },
  );
}
