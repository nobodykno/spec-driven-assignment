'use strict';

// Synthetic demo users (SDS §5.4). Every account uses the demo password "Password1".
const PASSWORD_HASH = '$2b$12$J8PVucPZde8d62OgieN/YeoqS0zlDRrqWbdl.q8.HMzuBKHkDNYlS';

const USERS = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Alice Owner', email: 'alice@example.com' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Bob Member', email: 'bob@example.com' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Carol Member', email: 'carol@example.com' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'users',
      USERS.map((user) => ({
        ...user,
        password_hash: PASSWORD_HASH,
        role: 'USER',
        created_at: now,
        updated_at: now,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { id: USERS.map((user) => user.id) });
  },
};
