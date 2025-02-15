const Settings = require('../models/Settings');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/logos');
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
      return;
    }
    cb(null, true);
  }
});

const settingsController = {
  async getSettings(req, res) {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({
          primaryColor: '#388fec',
          secondaryColor: '#FF006E',
          title: 'WiA11y'
        });
      }

      res.json(settings);
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  },

  async updateSettings(req, res) {
    try {
      if (req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { primaryColor, secondaryColor, title, useDefaultLogo } = req.body;

      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings();
      }

      if (primaryColor) settings.primaryColor = primaryColor;
      if (secondaryColor) settings.secondaryColor = secondaryColor;
      if (title) settings.title = title;
      if (typeof useDefaultLogo === 'boolean') settings.useDefaultLogo = useDefaultLogo;

      await settings.save();
      res.json(settings);
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  },

  async uploadLogo(req, res) {
    try {
      if (!req.user.role === 'network_admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      upload.single('logo')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        let settings = await Settings.findOne();
        if (!settings) {
          settings = new Settings();
        }

        // Delete old logo if it exists
        if (settings.logo) {
          try {
            const oldLogoPath = path.join(__dirname, '../../', settings.logo);
            await fs.unlink(oldLogoPath);
          } catch (error) {
            console.error('Error deleting old logo:', error);
          }
        }

        // Update logo path
        settings.logo = `/uploads/logos/${req.file.filename}`;
        await settings.save();

        res.json(settings);
      });
    } catch (error) {
      console.error('Upload logo error:', error);
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  },

  async removeLogo(req, res) {
    try {
      if (!req.user.role === 'network_admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      let settings = await Settings.findOne();
      if (!settings) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      // Delete the logo file if it exists
      if (settings.logo) {
        try {
          const logoPath = path.join(__dirname, '../../', settings.logo);
          await fs.unlink(logoPath);
        } catch (error) {
          console.error('Error deleting logo file:', error);
        }
      }

      // Clear the logo path in settings
      settings.logo = null;
      await settings.save();

      res.json(settings);
    } catch (error) {
      console.error('Remove logo error:', error);
      res.status(500).json({ error: 'Failed to remove logo' });
    }
  }
};

module.exports = settingsController; 