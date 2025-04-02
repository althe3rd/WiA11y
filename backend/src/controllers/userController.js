const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userController = {
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Check if this is the first user being created
      const userCount = await User.countDocuments();
      const role = userCount === 0 ? 'network_admin' : 'team_member';

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const user = new User({
        name,
        email,
        password: hashedPassword,
        role
      });

      await user.save();

      // Log the creation of first admin
      if (role === 'network_admin') {
        console.log('First user created with network_admin role:', {
          name,
          email,
          role
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET
      );

      // Return user info (excluding password) and token
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      };

      res.status(201).json(userResponse);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Error registering user' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('Login attempt for:', email);
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log('User not found');
        return res.status(401).json({ error: 'Invalid login credentials' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Invalid password');
        return res.status(401).json({ error: 'Invalid login credentials' });
      }
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          teams: user.teams
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  searchUsers: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) {
        return res.json([]);
      }

      const users = await User.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ]
      }).select('_id name email role');

      return res.json(users);
    } catch (error) {
      console.error('Search users error:', error);
      return res.status(500).json({ error: 'Failed to search users' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
        .select('-password')
        .populate('teams');
      return res.json(user);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },

  async promoteUser(req, res) {
    try {
      const { userId } = req.params;
      const { role, userType } = req.body;
      
      if (!['network_admin', 'admin', 'team_admin', 'team_member'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Validate userType if provided
      if (userType && !['technical', 'content'].includes(userType)) {
        return res.status(400).json({ error: 'Invalid user type' });
      }

      // Only network admins can create other network admins
      if (role === 'network_admin' && req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Only network admins can promote to network admin' });
      }

      // Only network admins or team admins can change user type
      if (userType && !['network_admin', 'team_admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only network admins or team admins can change user type' });
      }

      // Build the update object
      const updateData = { role };
      if (userType) {
        updateData.userType = userType;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to promote user' });
    }
  },

  async getAllUsers(req, res) {
    try {
      const users = await User.find()
        .select('-password')
        .populate('teams');
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  async createUser(req, res) {
    try {
      // Only network admins can create users
      if (req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Not authorized to create users' });
      }

      const { name, email, password, role } = req.body;

      // Validate role
      const validRoles = ['user', 'team_admin', 'admin', 'network_admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const user = new User({
        name,
        email,
        password: hashedPassword,
        role
      });

      await user.save();

      // Don't send password in response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(201).json(userResponse);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  },

  async updateUser(req, res) {
    try {
      // Only network admins or team admins can update users
      if (!['network_admin', 'team_admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Not authorized to update users' });
      }

      const { userId } = req.params;
      const { name, password, role, teams, userType } = req.body;

      // Validate userType if provided
      if (userType && !['technical', 'content'].includes(userType)) {
        return res.status(400).json({ error: 'Invalid user type' });
      }

      // Only network admins can set role to network_admin
      if (role === 'network_admin' && req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Only network admins can set network admin role' });
      }

      const updateData = { name, role, teams };
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      if (userType) {
        updateData.userType = userType;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  },

  async deleteUser(req, res) {
    try {
      // Only network admins can delete users
      if (req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Not authorized to delete users' });
      }

      const { userId } = req.params;

      // Prevent self-deletion
      if (userId === req.user._id.toString()) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  },

  getUserCount: async (req, res) => {
    try {
      const count = await User.countDocuments();
      res.json({ count });
    } catch (error) {
      console.error('Error getting user count:', error);
      res.status(500).json({ error: 'Error getting user count' });
    }
  }
};

module.exports = userController; 