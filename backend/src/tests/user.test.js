const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const mongoose = require('mongoose');

describe('User Registration', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should make first registered user a network_admin', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'First Admin',
        email: 'admin@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(201);
    expect(response.body.role).toBe('network_admin');

    // Verify in database
    const user = await User.findOne({ email: 'admin@example.com' });
    expect(user.role).toBe('network_admin');
  });

  it('should make subsequent users team members', async () => {
    // First create an admin
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'First Admin',
        email: 'admin@example.com',
        password: 'password123'
      });

    // Create second user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Team Member',
        email: 'user@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(201);
    expect(response.body.role).toBe('team_member');

    // Verify in database
    const user = await User.findOne({ email: 'user@example.com' });
    expect(user.role).toBe('team_member');
  });
}); 