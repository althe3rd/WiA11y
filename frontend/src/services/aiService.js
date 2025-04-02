import api from '../api/axios';
import store from '../store';

/**
 * Service for handling AI-related functionality
 */
class AIService {
  /**
   * Get an AI-generated remediation suggestion for a specific violation
   * @param {Object} violationData - Data about the violation
   * @param {string} violationData.id - The axe rule ID
   * @param {string} violationData.help - The help text for the violation
   * @param {string} violationData.description - The description of the violation
   * @param {Object} violationData.node - The node that has the violation
   * @returns {Promise<string>} - The remediation suggestion
   */
  async getRemediationSuggestion(violationData) {
    console.log('aiService.getRemediationSuggestion called with:', {
      id: violationData.id,
      help: violationData.help,
      descriptionLength: violationData.description?.length,
      nodeHtmlLength: violationData.node?.html?.length
    });
    
    try {
      // Get the current user's type
      const userType = store.state.user?.userType || 'technical';
      console.log('User type for suggestion request:', userType);
      
      // Add userType to the request data
      const requestData = {
        ...violationData,
        userType
      };
      
      const response = await api.post('/api/violations/remediation-suggestion', requestData);
      
      console.log('aiService received response:', {
        status: response.status,
        hasSuggestion: !!response.data.suggestion,
        suggestionLength: response.data.suggestion?.length,
        suggestionPreview: response.data.suggestion?.substring(0, 50) + '...'
      });
      
      return response.data.suggestion;
    } catch (error) {
      console.error('Error getting AI remediation suggestion:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorMessage: error.response?.data?.message,
        errorData: error.response?.data
      });
      throw new Error(error.response?.data?.message || 'Failed to get remediation suggestion');
    }
  }
}

export default new AIService(); 