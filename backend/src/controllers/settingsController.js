const Settings = require('../models/Settings');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const emailService = require('../services/emailService');
const EmailPreferences = require('../models/EmailPreferences');
const User = require('../models/user');
const Crawl = require('../models/crawl');
const { getAccessibilitySummaryTemplate } = require('../services/emailTemplates');

// Define violation weights (matching frontend/src/constants/scoreWeights.js)
const VIOLATION_WEIGHTS = {
  critical: 3.0,   // Critical issues have major impact
  serious: 2.0,     // ~0.6 points per serious violation
  moderate: 0.5,    // ~0.2 points per moderate violation
  minor: 0.1        // Minor issues have minimal impact
};

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

      const { primaryColor, secondaryColor, title, useDefaultLogo, maxCrawlers } = req.body;

      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings();
      }

      if (primaryColor) settings.primaryColor = primaryColor;
      if (secondaryColor) settings.secondaryColor = secondaryColor;
      if (title) settings.title = title;
      if (typeof useDefaultLogo === 'boolean') settings.useDefaultLogo = useDefaultLogo;
      if (maxCrawlers !== undefined) {
        const crawlersValue = parseInt(maxCrawlers, 10);
        if (!isNaN(crawlersValue) && crawlersValue >= 1 && crawlersValue <= 10) {
          settings.maxCrawlers = crawlersValue;
        } else {
          return res.status(400).json({ error: 'maxCrawlers must be an integer between 1 and 10' });
        }
      }

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
  },

  async getEmailConfig(req, res) {
    try {
      if (req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      console.log('Environment variables for email config:', {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_FROM: process.env.SMTP_FROM,
        SMTP_SECURE: process.env.SMTP_SECURE,
        NODE_ENV: process.env.NODE_ENV
      });

      // Return email configuration from environment variables
      const emailConfig = {
        host: process.env.SMTP_HOST || null,
        port: process.env.SMTP_PORT || null,
        from: process.env.SMTP_FROM || null,
        secure: process.env.SMTP_SECURE === 'true'
      };

      console.log('Sending email config response:', emailConfig);
      res.json(emailConfig);
    } catch (error) {
      console.error('Get email config error:', error);
      res.status(500).json({ error: 'Failed to get email configuration' });
    }
  },

  async sendTestEmail(req, res) {
    try {
      if (req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      // Verify email service connection
      const isReady = await emailService.verifyConnection();
      if (!isReady) {
        return res.status(500).json({ error: 'Email service is not properly configured' });
      }

      // Send test email
      await emailService.sendEmail({
        to: email,
        subject: 'WiA11y Email Configuration Test',
        html: `
          <h1>Email Configuration Test</h1>
          <p>This is a test email from your WiA11y installation.</p>
          <p>If you're receiving this email, it means your email configuration is working correctly.</p>
          <hr>
          <p>Configuration details:</p>
          <ul>
            <li>SMTP Host: ${process.env.SMTP_HOST}</li>
            <li>SMTP Port: ${process.env.SMTP_PORT}</li>
            <li>From Address: ${process.env.SMTP_FROM}</li>
            <li>Secure: ${process.env.SMTP_SECURE}</li>
          </ul>
        `
      });

      res.json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Send test email error:', error);
      res.status(500).json({ 
        error: 'Failed to send test email',
        details: error.message
      });
    }
  },

  async getEmailPreferences(req, res) {
    try {
      const userId = req.user.userId;
      
      let preferences = await EmailPreferences.findOne({ userId });
      
      if (!preferences) {
        // Create default preferences if none exist
        preferences = await EmailPreferences.create({
          userId,
          enabled: false,
          frequency: 'weekly'
        });
      }
      
      res.json({
        enabled: preferences.enabled,
        frequency: preferences.frequency
      });
    } catch (error) {
      console.error('Error fetching email preferences:', error);
      res.status(500).json({ error: 'Failed to fetch email preferences' });
    }
  },

  async updateEmailPreferences(req, res) {
    try {
      const userId = req.user.userId;
      const { enabled, frequency } = req.body;
      
      if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
        return res.status(400).json({ error: 'Invalid frequency value' });
      }
      
      const preferences = await EmailPreferences.findOneAndUpdate(
        { userId },
        { 
          userId,
          enabled,
          frequency,
          lastSent: null // Reset lastSent when preferences are updated
        },
        { upsert: true, new: true }
      );
      
      res.json({
        enabled: preferences.enabled,
        frequency: preferences.frequency
      });
    } catch (error) {
      console.error('Error updating email preferences:', error);
      res.status(500).json({ error: 'Failed to update email preferences' });
    }
  },

  async sendReportNow(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's teams and accessible domains
      const teamIds = user.teams || [];
      
      // Get all crawls for domains the user has access to
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const crawls = await Crawl.find({
        team: { $in: teamIds },
        createdAt: { $gte: thirtyDaysAgo }
      }).sort({ createdAt: -1 });

      // Process crawls to get domain statistics
      const domainStats = {};
      crawls.forEach(crawl => {
        if (!domainStats[crawl.domain]) {
          domainStats[crawl.domain] = {
            name: crawl.domain,
            totalViolations: {
              critical: 0,
              serious: 0,
              moderate: 0,
              minor: 0
            },
            totalPagesScanned: 0,
            lastScan: crawl.createdAt
          };
        }
        
        // Only include completed crawls with pages scanned
        if (crawl.status === 'completed' && crawl.pagesScanned > 0) {
          console.log(`Processing crawl for ${crawl.domain}:`, {
            status: crawl.status,
            pagesScanned: crawl.pagesScanned,
            violationsByImpact: crawl.violationsByImpact
          });
          
          const violationsByImpact = crawl.violationsByImpact || {
            critical: 0,
            serious: 0,
            moderate: 0,
            minor: 0
          };
          
          // Accumulate total violations and pages
          domainStats[crawl.domain].totalViolations.critical += violationsByImpact.critical;
          domainStats[crawl.domain].totalViolations.serious += violationsByImpact.serious;
          domainStats[crawl.domain].totalViolations.moderate += violationsByImpact.moderate;
          domainStats[crawl.domain].totalViolations.minor += violationsByImpact.minor;
          domainStats[crawl.domain].totalPagesScanned += crawl.pagesScanned;
        }
      });

      // Calculate final scores using averages across all crawls
      const domains = Object.values(domainStats).map(domain => {
        if (domain.totalPagesScanned === 0) {
          return {
            name: domain.name,
            averageScore: 'No data',
            trend: '− No data',
            lastScan: new Date(domain.lastScan).toLocaleDateString()
          };
        }

        // Calculate average violations per page across all crawls
        const avgCritical = domain.totalViolations.critical / domain.totalPagesScanned;
        const avgSerious = domain.totalViolations.serious / domain.totalPagesScanned;
        const avgModerate = domain.totalViolations.moderate / domain.totalPagesScanned;
        const avgMinor = domain.totalViolations.minor / domain.totalPagesScanned;

        // Calculate total deduction using averages
        const totalDeduction = 
          (avgCritical * VIOLATION_WEIGHTS.critical) +
          (avgSerious * VIOLATION_WEIGHTS.serious) +
          (avgModerate * VIOLATION_WEIGHTS.moderate) +
          (avgMinor * VIOLATION_WEIGHTS.minor);

        console.log(`Final score calculation for ${domain.name}:`, {
          totalPagesScanned: domain.totalPagesScanned,
          averageViolations: {
            critical: avgCritical,
            serious: avgSerious,
            moderate: avgModerate,
            minor: avgMinor
          },
          totalDeduction,
          finalScore: Math.max(0, Math.round(100 - totalDeduction))
        });

        return {
          name: domain.name,
          averageScore: Math.max(0, Math.round(100 - totalDeduction)),
          trend: '→ Current', // Trend is less relevant now as we're using aggregated data
          lastScan: new Date(domain.lastScan).toLocaleDateString()
        };
      });

      // Only include domains that have scores
      const domainsWithData = domains.filter(domain => domain.averageScore !== 'No data');

      if (domainsWithData.length === 0) {
        return res.status(400).json({ error: 'No accessibility data available for your domains in the last 30 days' });
      }

      // Generate and send email
      const emailData = {
        userName: user.name,
        frequency: 'Immediate',
        domains: domainsWithData,
        period: `Last 30 Days (${new Date().toLocaleDateString()})`
      };

      await emailService.sendEmail({
        to: user.email,
        subject: 'WiA11y Accessibility Report',
        html: getAccessibilitySummaryTemplate(emailData)
      });

      // Update last sent timestamp
      await EmailPreferences.findOneAndUpdate(
        { userId },
        { lastSent: new Date() },
        { upsert: true }
      );

      res.json({ message: 'Report sent successfully' });
    } catch (error) {
      console.error('Error sending immediate report:', error);
      res.status(500).json({ error: 'Failed to send report' });
    }
  }
};

module.exports = settingsController; 