const DomainMetadata = require('../models/DomainMetadata');
const Team = require('../models/team');

const domainMetadataController = {
  // Get metadata for a domain
  async getDomainMetadata(req, res) {
    try {
      const { teamId, domain } = req.params;
      
      // Verify user has access to team
      const hasAccess = await Team.exists({
        _id: teamId,
        $or: [
          { teamAdmins: req.user._id },
          { members: req.user._id }
        ]
      });

      if (!hasAccess && req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Not authorized to access team domain metadata' });
      }

      const metadata = await DomainMetadata.findOne({ 
        team: teamId,
        domain: domain.toLowerCase()
      }).populate('lastModifiedBy', 'name email');

      res.json(metadata || { domain, team: teamId, notes: '', isArchived: false });
    } catch (error) {
      console.error('Error fetching domain metadata:', error);
      res.status(500).json({ error: 'Failed to fetch domain metadata' });
    }
  },

  // Update metadata for a domain
  async updateDomainMetadata(req, res) {
    try {
      const { teamId, domain } = req.params;
      const { notes, isArchived } = req.body;

      // Verify user has access to team
      const hasAccess = await Team.exists({
        _id: teamId,
        $or: [
          { teamAdmins: req.user._id },
          { members: req.user._id }
        ]
      });

      if (!hasAccess && req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Not authorized to modify team domain metadata' });
      }

      const metadata = await DomainMetadata.findOneAndUpdate(
        { 
          team: teamId,
          domain: domain.toLowerCase()
        },
        {
          notes,
          isArchived,
          lastModifiedBy: req.user._id
        },
        {
          new: true,
          upsert: true
        }
      ).populate('lastModifiedBy', 'name email');

      res.json(metadata);
    } catch (error) {
      console.error('Error updating domain metadata:', error);
      res.status(500).json({ error: 'Failed to update domain metadata' });
    }
  },

  // Get all metadata for a team
  async getTeamDomainMetadata(req, res) {
    try {
      const { teamId } = req.params;

      // Verify user has access to team
      const hasAccess = await Team.exists({
        _id: teamId,
        $or: [
          { teamAdmins: req.user._id },
          { members: req.user._id }
        ]
      });

      if (!hasAccess && req.user.role !== 'network_admin') {
        return res.status(403).json({ error: 'Not authorized to access team domain metadata' });
      }

      const metadata = await DomainMetadata.find({ team: teamId })
        .populate('lastModifiedBy', 'name email')
        .sort('domain');

      res.json(metadata);
    } catch (error) {
      console.error('Error fetching team domain metadata:', error);
      res.status(500).json({ error: 'Failed to fetch team domain metadata' });
    }
  }
};

module.exports = domainMetadataController; 