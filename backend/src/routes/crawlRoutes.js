const express = require('express');
const router = express.Router();
const crawlController = require('../controllers/crawlController');
const { auth } = require('../middleware/auth');
const Crawl = require('../models/crawl');
const Team = require('../models/team');
const Violation = require('../models/violation');
const User = require('../models/user');
const jwt = require('jsonwebtoken');

console.log('Setting up crawl routes');

// All crawl routes require authentication
router.use(auth);

// Get queue status - must be before parameter routes
router.get('/status', crawlController.getQueueStatus);

// Export crawls as CSV (with standard auth middleware)
router.get('/export/csv-auth', async (req, res) => {
  // This entire route can be removed since we fixed the main export/csv endpoint
});

// Export crawls as CSV with token in query parameter
router.get('/export/csv', async (req, res) => {
  try {
    console.log('CSV export with token in query params');
    console.log('Query params:', req.query);
    
    // Get token from query parameter
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: 'Please authenticate' });
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded);
      
      // Find user
      const userId = decoded.userId || decoded.id || decoded._id;
      console.log('User ID from token:', userId);
      
      if (!userId) {
        return res.status(401).json({ error: 'Invalid token format' });
      }
      
      const user = await User.findById(userId);
      console.log('User found:', user ? user.email : null);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Attach user to request
      req.user = user;
      
      // Build query object based on request parameters
      const query = {};
      
      // Add status filter if specified
      if (req.query.status) {
        query.status = req.query.status;
      }

      // Add date range filter if specified
      if (req.query.dateRange && req.query.dateRange !== 'all') {
        const now = new Date();
        let startDate;
        
        switch(req.query.dateRange) {
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'quarter':
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case 'sixMonths':
            startDate = new Date(now.setMonth(now.getMonth() - 6));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }
        
        query.createdAt = { $gte: startDate };
      }
      
      console.log('Using query filter for CSV export:', query);
      
      // Determine which teams the user has access to
      let teamQuery = {};
      
      // If network admin, get all crawls with applied filters
      if (!['network_admin', 'admin'].includes(user.role)) {
        // Get teams the user has access to (including parent/child hierarchy)
        // First get the teams the user is directly a member of
        const userTeams = await Team.find({
          $or: [
            { members: user._id },
            { teamAdmins: user._id }
          ]
        });
        
        const directTeamIds = userTeams.map(team => team._id);
        
        // Then get all child teams of the user's teams
        const childTeams = await Team.find({
          parentTeam: { $in: directTeamIds }
        });
        
        const childTeamIds = childTeams.map(team => team._id);
        
        // Combine direct teams and child teams
        const allAccessibleTeamIds = [...directTeamIds, ...childTeamIds];
        
        // Add team filter to query
        query.team = { $in: allAccessibleTeamIds };
      }
      
      // Add selected team filter if specified
      if (req.query.team && req.query.team !== '') {
        // Need to handle team hierarchy - get the selected team and all its children
        const allTeams = await Team.find({});
        const teamIdsToInclude = [req.query.team];
        
        // Find all child teams recursively
        const findChildTeams = (parentId) => {
          const childTeams = allTeams.filter(t => 
            t.parentTeam && t.parentTeam.toString() === parentId.toString()
          );
          
          childTeams.forEach(childTeam => {
            teamIdsToInclude.push(childTeam._id.toString());
            findChildTeams(childTeam._id);
          });
        };
        
        // Start recursive search for child teams
        findChildTeams(req.query.team);
        
        // Set team filter
        query.team = { $in: teamIdsToInclude };
      }
      
      // Get crawls based on final query
      const crawls = await Crawl.find(query)
        .sort({ createdAt: -1 })
        .populate('team', 'name _id')
        .populate('createdBy', 'name email')
        .lean();

      console.log(`Found ${crawls.length} crawls for CSV export`);

      // Get violation counts for each crawl
      const crawlsWithViolations = await Promise.all(crawls.map(async (crawl) => {
        const violationCounts = await Violation.aggregate([
          { $match: { crawlId: crawl._id } },
          { $group: {
            _id: '$impact',
            count: { $sum: 1 }
          }}
        ]);
        
        crawl.violationsByImpact = {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0
        };
        
        violationCounts.forEach(count => {
          if (count._id) {
            crawl.violationsByImpact[count._id] = count.count;
          }
        });
        
        return crawl;
      }));
      
      // Define the violation weights (same as in frontend)
      const VIOLATION_WEIGHTS = {
        critical: 25.0,     // Critical issues have severe impact
        serious: 10.0,      // Serious issues have significant impact
        moderate: 4.0,      // Moderate issues have medium impact
        minor: 1.0          // Minor issues have small impact
      };
      
      // Calculate weighted score for each crawl
      const calculateWeightedScore = (crawl) => {
        // If crawl hasn't started or no pages scanned yet, return null
        if (!crawl.status || crawl.status === 'pending' || !crawl.pagesScanned) {
          return null;
        }
        
        // If no violations found and scan is complete, return 100
        if (crawl.violationsFound === 0 && crawl.status === 'completed') {
          return 100;
        }
        
        // Calculate weighted deductions based on average violations per page
        if (crawl.violationsByImpact) {
          const { critical, serious, moderate, minor } = crawl.violationsByImpact;
          const pagesScanned = crawl.pagesScanned || 1; // Prevent division by zero
          
          // Calculate average violations per page for each severity
          const avgCritical = critical / pagesScanned;
          const avgSerious = serious / pagesScanned;
          const avgModerate = moderate / pagesScanned;
          const avgMinor = minor / pagesScanned;
          
          // Calculate total deduction using averages
          const totalDeduction = 
            (avgCritical * VIOLATION_WEIGHTS.critical) +
            (avgSerious * VIOLATION_WEIGHTS.serious) +
            (avgModerate * VIOLATION_WEIGHTS.moderate) +
            (avgMinor * VIOLATION_WEIGHTS.minor);
            
          let score = Math.max(0, Math.round(100 - totalDeduction));
          return score;
        }
        
        return null;
      };
      
      // Format data for CSV
      const csvData = crawlsWithViolations.map(crawl => {
        const startedAtDate = crawl.startedAt ? new Date(crawl.startedAt) : null;
        const completedAtDate = crawl.completedAt ? new Date(crawl.completedAt) : null;
        const createdAtDate = crawl.createdAt ? new Date(crawl.createdAt) : null;
        
        return {
          "Domain": crawl.domain || 'Unknown Domain',
          "URL": crawl.url || 'Unknown URL',
          "Team": crawl.team?.name || 'Unknown Team',
          "Created By": crawl.createdBy?.name || 'Unknown User',
          "Created At": createdAtDate ? createdAtDate.toISOString() : '',
          "Started At": startedAtDate ? startedAtDate.toISOString() : '',
          "Completed At": completedAtDate ? completedAtDate.toISOString() : '',
          "Status": crawl.status || 'Unknown Status',
          "WCAG Version": crawl.wcagVersion || '',
          "WCAG Level": crawl.wcagLevel || '',
          "Depth Limit": crawl.depthLimit || 0,
          "Page Limit": crawl.pageLimit || 0,
          "Pages Scanned": crawl.pagesScanned || 0,
          "Critical Violations": crawl.violationsByImpact.critical || 0,
          "Serious Violations": crawl.violationsByImpact.serious || 0,
          "Moderate Violations": crawl.violationsByImpact.moderate || 0,
          "Minor Violations": crawl.violationsByImpact.minor || 0,
          "Total Violations": 
            (crawl.violationsByImpact.critical || 0) + 
            (crawl.violationsByImpact.serious || 0) + 
            (crawl.violationsByImpact.moderate || 0) + 
            (crawl.violationsByImpact.minor || 0),
          "Raw Score": crawl.accessibilityScore || 0,
          "Weighted Score": calculateWeightedScore(crawl) || 0
        };
      });
      
      console.log(`Formatted ${csvData.length} rows for CSV export`);
      
      // Convert to CSV
      let csv = '';
      
      // Add header row
      if (csvData.length > 0) {
        csv += Object.keys(csvData[0]).join(',') + '\n';
      }
      
      // Add data rows
      csvData.forEach(row => {
        csv += Object.values(row).map(value => {
          // Handle commas in values by wrapping in quotes
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        }).join(',') + '\n';
      });
      
      console.log(`Generated CSV with ${csv.length} characters, ${csv.split('\n').length} rows`);
      
      // Set response headers for CSV download
      const filename = `crawl-export-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Send the CSV data
      console.log('Sending CSV response');
      return res.send(csv);
      
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all crawls
router.get('/', async (req, res) => {
  try {
    console.log('Fetching crawls with params:', req.query);
    
    // Build query object based on request parameters
    const query = {};
    
    // Add status filter if specified
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    console.log('Using query filter:', query);
    
    // If network admin, get all crawls with applied filters
    if (['network_admin', 'admin'].includes(req.user.role)) {
      const crawls = await Crawl.find(query)
        .sort({ createdAt: -1 })
        .populate('team', 'name _id')
        .lean();

      // Get violation counts for each crawl
      const crawlsWithViolations = await Promise.all(crawls.map(async (crawl) => {
        const violationCounts = await Violation.aggregate([
          { $match: { crawlId: crawl._id } },
          { $group: {
            _id: '$impact',
            count: { $sum: 1 }
          }}
        ]);
        
        crawl.violationsByImpact = {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0
        };
        
        violationCounts.forEach(count => {
          if (count._id) {
            crawl.violationsByImpact[count._id] = count.count;
          }
        });
        
        return crawl;
      }));

      return res.json(crawlsWithViolations);
    }
    
    // Otherwise get crawls for teams user is member of with applied filters
    // This includes parent teams and their child teams
    
    // First get the teams the user is directly a member of
    const userTeams = await Team.find({
      $or: [
        { members: req.user._id },
        { teamAdmins: req.user._id }
      ]
    });
    
    const directTeamIds = userTeams.map(team => team._id);
    
    // Then get all child teams of the user's teams (teams where the parent is one of the user's teams)
    const childTeams = await Team.find({
      parentTeam: { $in: directTeamIds }
    });
    
    const childTeamIds = childTeams.map(team => team._id);
    
    // Combine direct teams and child teams
    const allAccessibleTeamIds = [...directTeamIds, ...childTeamIds];
    
    // Combine team filter with other filters
    query.team = { $in: allAccessibleTeamIds };
    
    const crawls = await Crawl.find(query)
      .sort({ createdAt: -1 })
      .populate('team', 'name _id')
      .lean();

    // Get violation counts for each crawl
    const crawlsWithViolations = await Promise.all(crawls.map(async (crawl) => {
      const violationCounts = await Violation.aggregate([
        { $match: { crawlId: crawl._id } },
        { $group: {
          _id: '$impact',
          count: { $sum: 1 }
        }}
      ]);
      
      crawl.violationsByImpact = {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
      };
      
      violationCounts.forEach(count => {
        if (count._id) {
          crawl.violationsByImpact[count._id] = count.count;
        }
      });
      
      return crawl;
    }));
    
    res.json(crawlsWithViolations);
  } catch (error) {
    console.error('Error fetching crawls:', error);
    res.status(500).json({ error: 'Failed to fetch crawls' });
  }
});

// Get single crawl
router.get('/:id', auth, async (req, res) => {
  try {
    const crawl = await Crawl.findById(req.params.id)
      .populate('team', 'name _id')
      .lean();
    
    if (!crawl) {
      return res.status(404).json({ error: 'Crawl not found' });
    }
    
    // Check if user has access to this crawl
    let hasAccess = ['network_admin', 'admin'].includes(req.user.role);
    
    // If not admin, check if user created the crawl or is part of the team
    if (!hasAccess) {
      // Check if user created this crawl
      if (crawl.createdBy && crawl.createdBy.toString() === req.user._id.toString()) {
        hasAccess = true;
      } 
      // Check if user is part of the team or a parent team
      else if (crawl.team) {
        // Get the team for this crawl
        const team = await Team.findById(crawl.team._id);
        
        if (team) {
          // Check direct team membership
          if (team.members.includes(req.user._id) || team.teamAdmins.includes(req.user._id)) {
            hasAccess = true;
          }
          // Check parent team hierarchy
          else {
            // Start with the current team and traverse up the parent chain
            let currentTeam = team;
            while (currentTeam && currentTeam.parentTeam && !hasAccess) {
              // Get the parent team
              currentTeam = await Team.findById(currentTeam.parentTeam);
              // Check if user is a member or admin of the parent team
              if (currentTeam && (
                currentTeam.members.includes(req.user._id) || 
                currentTeam.teamAdmins.includes(req.user._id)
              )) {
                hasAccess = true;
                break;
              }
            }
          }
        }
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to view this scan' });
    }
    
    // Fetch violations separately
    const violations = await Violation.find({ crawlId: crawl._id })
      .select('-crawlId -createdAt -updatedAt -__v')
      .lean();
    
    // Add violations to crawl response
    crawl.violations = violations;

    // Update violation counts
    const violationCounts = await Violation.aggregate([
      { $match: { crawlId: crawl._id } },
      { $group: {
        _id: '$impact',
        count: { $sum: 1 }
      }}
    ]);

    // Reset impact counts
    crawl.violationsByImpact = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };

    // Update counts from actual violations
    violationCounts.forEach(count => {
      if (count._id) {
        crawl.violationsByImpact[count._id] = count.count;
      }
    });
    
    res.json(crawl);
  } catch (error) {
    console.error('Error fetching crawl:', error);
    res.status(500).json({ error: 'Failed to fetch crawl' });
  }
});

// Create new crawl
router.post('/', crawlController.createCrawl);

// Cancel crawl
router.post('/:id/cancel', crawlController.cancelCrawl);

// Delete crawl
router.delete('/:id', crawlController.deleteCrawl);

// Get crawl progress
router.get('/:id/progress', auth, async (req, res) => {
  try {
    const crawl = await Crawl.findById(req.params.id);
    if (!crawl) {
      return res.status(404).json({ message: 'Crawl not found' });
    }
    
    res.json({
      progress: crawl.progress,
      currentUrl: crawl.currentUrl,
      status: crawl.status
    });
  } catch (error) {
    console.error('Error fetching crawl progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 