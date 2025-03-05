const axios = require('axios');
require('dotenv').config();

class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-4-turbo'; // Using GPT-4 Turbo for better accessibility knowledge
  }

  /**
   * Generate a remediation suggestion for an accessibility violation
   * @param {Object} violationData - Data about the violation
   * @param {string} violationData.id - The axe rule ID
   * @param {string} violationData.help - The help text for the violation
   * @param {string} violationData.description - The description of the violation
   * @param {Object} violationData.node - The node that has the violation
   * @param {string} violationData.node.html - The HTML of the node
   * @param {string} violationData.node.target - The CSS selector for the node
   * @param {Array} violationData.node.any - Any checks that failed
   * @param {Array} violationData.node.all - All checks that failed
   * @param {Array} violationData.node.none - None checks that failed
   * @returns {Promise<string>} - The remediation suggestion
   */
  async generateRemediationSuggestion(violationData) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      // Create a prompt that includes all relevant information about the violation
      const prompt = this.createPrompt(violationData);
      
      console.log('Calling OpenAI API with prompt:', prompt);
      console.log('Using API key starting with:', this.apiKey.substring(0, 10) + '...');
      
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an accessibility expert that provides specific, actionable remediation suggestions for web accessibility violations. Your suggestions should be concise, technically accurate, and directly address the specific violation in the provided HTML.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3, // Lower temperature for more focused and precise responses
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      console.log('OpenAI API response received:', {
        status: response.status,
        hasChoices: !!response.data.choices,
        choicesLength: response.data.choices?.length,
        firstChoice: response.data.choices?.[0]?.message?.content?.substring(0, 50) + '...'
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating AI remediation suggestion:', error);
      if (error.response) {
        console.error('OpenAI API error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      throw new Error('Failed to generate remediation suggestion');
    }
  }

  /**
   * Create a prompt for the OpenAI API based on the violation data
   * @param {Object} violationData - Data about the violation
   * @returns {string} - The prompt for the OpenAI API
   */
  createPrompt(violationData) {
    const { id, help, description, node } = violationData;
    
    // Extract relevant check information
    const checkDetails = [];
    if (node.any && node.any.length > 0) {
      checkDetails.push(`Any checks that failed: ${node.any.map(check => check.message || check.id).join(', ')}`);
    }
    if (node.all && node.all.length > 0) {
      checkDetails.push(`All checks that failed: ${node.all.map(check => check.message || check.id).join(', ')}`);
    }
    if (node.none && node.none.length > 0) {
      checkDetails.push(`None checks that failed: ${node.none.map(check => check.message || check.id).join(', ')}`);
    }

    return `
I need a specific remediation suggestion for the following accessibility violation:

Rule ID: ${id}
Help Text: ${help}
Description: ${description}
CSS Selector: ${node.target}

HTML with the violation:
\`\`\`html
${node.html}
\`\`\`

${checkDetails.join('\n')}

Please provide a specific, actionable remediation suggestion that directly addresses this violation. Include example code showing how to fix the issue. Be concise but thorough.
`;
  }
}

module.exports = new AIService(); 