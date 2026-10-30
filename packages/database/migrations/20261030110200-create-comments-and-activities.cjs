'use strict';

// SDS §5.2 comments and activities; §5.3 indexes for the comment list and the history.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comments', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tasks', key: 'id' },
      },
      author_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      body: { type: Sequelize.STRING(2000), allowNull: false },
      edited_at: { type: Sequelize.DATE, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('comments', ['task_id', 'created_at']);

    await queryInterface.createTable('activities', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tasks', key: 'id' },
      },
      actor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      action: {
        type: Sequelize.ENUM(
          'TASK_CREATED',
          'TASK_UPDATED',
          'TASK_ASSIGNED',
          'TASK_STATUS_CHANGED',
          'TASK_ARCHIVED',
        ),
        allowNull: false,
      },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('activities', [
      { name: 'task_id' },
      { name: 'created_at', order: 'DESC' },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activities');
    await queryInterface.dropTable('comments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_activities_action"');
  },
};
