'use strict';

// SDS §5.2 tasks and §5.3 indexes (FR-TASK-001, NFR-PERF-002). Needs projects (DEV-10).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tasks', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'),
        allowNull: false,
        defaultValue: 'TODO',
      },
      priority: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
        allowNull: false,
        defaultValue: 'MEDIUM',
      },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      assignee_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      created_by_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      archived_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('tasks', ['project_id', 'archived_at', 'status']);
    await queryInterface.addIndex('tasks', ['project_id', 'assignee_id']);
    await queryInterface.addIndex('tasks', ['project_id', 'due_date']);
    await queryInterface.addIndex('tasks', ['project_id', 'priority']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tasks');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tasks_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tasks_priority"');
  },
};
