const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, isAdmin } = require('../middleware/auth');

console.log('Setting up user routes');

// Public routes
router.post('/register', async (req, res, next) => {
  try {
    console.log('Register route hit');
    await userController.register(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    console.log('Login route hit');
    await userController.login(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/create', auth, async (req, res, next) => {
  try {
    await userController.createUser(req, res);
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.get('/search', auth, async (req, res, next) => {
  try {
    await userController.searchUsers(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/profile', auth, async (req, res, next) => {
  try {
    await userController.getProfile(req, res);
  } catch (error) {
    next(error);
  }
});

// Admin routes
router.patch('/promote/:userId', auth, isAdmin, async (req, res, next) => {
  try {
    await userController.promoteUser(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/all', auth, isAdmin, async (req, res, next) => {
  try {
    await userController.getAllUsers(req, res);
  } catch (error) {
    next(error);
  }
});

router.patch('/:userId', auth, userController.updateUser);
router.delete('/:userId', auth, userController.deleteUser);

module.exports = router; 