<template>
  <div class="page-preview">
    <div class="preview-header">
      <div class="breadcrumb">
        <router-link :to="`/scans/${scanId}`">← Back to Scan Results</router-link>
      </div>
      <h2>{{ decodeURIComponent(url) }}</h2>
    </div>

    <div class="preview-container" ref="previewContainer">
      <div class="violations-sidebar" ref="sidebar" :style="{ width: sidebarWidth + 'px' }">
        <h3>Violations on this page</h3>
        <div v-for="violation in pageViolations" :key="violation.id" class="violation-item">
          <div 
            class="violation-header" 
            @click="highlightViolation(violation)"
            :class="{ active: selectedViolation?.id === violation.id }"
          >
            <span :class="['impact-badge', violation.impact]">{{ violation.impact }}</span>
            <h4>{{ violation.help }}</h4>
          </div>
          <div class="violation-details" v-if="selectedViolation?.id === violation.id">
            <div class="violation-actions">
              <a :href="violation.helpUrl" target="_blank" class="help-link">Learn More at Deque University</a>
            </div>
            
            <div class="violation-nodes">
              <div 
                v-for="(node, index) in violation.nodes" 
                :key="index"
                class="violation-node"
                :class="{ 'highlighted': isNodeHighlighted(node) }"
                @click="scrollToElement(node.target)"
              >
                <CodeBlock>{{ formatHtml(node.html) }}</CodeBlock>
                <p class="failure-summary">{{ node.failureSummary }}</p>
                
                <!-- AI Remediation Suggestion Button and Result -->
                <div class="ai-suggestion-container">
                  <button 
                    class="ai-suggestion-button" 
                    @click.stop="getAISuggestion(violation, node)"
                    :disabled="isLoadingSuggestion(node)"
                  >
                    <span v-if="isLoadingSuggestion(node)">
                      <span class="loading-spinner"></span> Generating suggestion...
                    </span>
                    <span v-else>
                      <i class="fas fa-robot"></i> Get AI Suggestion
                    </span>
                  </button>
                  
                  <!-- Debug info about suggestion status -->
                  <div class="debug-status" v-if="!isLoadingSuggestion(node)">
                    <span v-if="getNodeSuggestion(node)">✅ Suggestion available</span>
                    <span v-else>❌ No suggestion yet</span>
                  </div>
                  
                  <!-- AI Suggestion Result -->
                  <div v-if="getNodeSuggestion(node)" class="ai-suggestion-result">
                    <h5>AI Suggested Fix:</h5>
                    <div class="suggestion-content" v-html="getNodeSuggestion(node)"></div>
                  </div>
                  
                  <!-- Debug info - remove in production -->
                  <div class="debug-info" v-if="aiSuggestions && Object.keys(aiSuggestions).length > 0">
                    <details>
                      <summary>Debug Info</summary>
                      <pre>{{ JSON.stringify({
                        nodeKey: `${violation.id || violation._id}-${node.target.join('-')}`,
                        hasSuggestion: !!getNodeSuggestion(node),
                        suggestionKeys: Object.keys(aiSuggestions || {}),
                        violationId: violation.id || violation._id,
                        selectedViolationId: selectedViolation?.id || selectedViolation?._id
                      }, null, 2) }}</pre>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="resize-handle" 
           @mousedown="startResize" 
           title="Drag to resize"
           :style="{ left: sidebarWidth + 'px' }">
        <div class="handle-line"></div>
      </div>
      <div class="preview-frame">
        <div class="loading" v-if="loading">Loading preview...</div>
        <iframe 
          v-else
          ref="previewFrame"
          :src="proxyUrl"
          @load="onFrameLoad"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch, reactive } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import CodeBlock from '../components/CodeBlock.vue'
import aiService from '../services/aiService'

// Cache utility for AI suggestions
const AI_SUGGESTION_CACHE_KEY = 'wia11y_ai_suggestions_cache';

const getSuggestionCache = () => {
  try {
    const cache = localStorage.getItem(AI_SUGGESTION_CACHE_KEY);
    return cache ? JSON.parse(cache) : {};
  } catch (error) {
    console.error('Error reading suggestion cache:', error);
    return {};
  }
};

const saveSuggestionCache = (cache) => {
  try {
    localStorage.setItem(AI_SUGGESTION_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving suggestion cache:', error);
  }
};

export default {
  name: 'PagePreview',
  components: {
    CodeBlock
  },
  props: {
    scanId: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    selectedViolationId: {
      type: String,
      required: false,
      default: null
    }
  },
  setup(props) {
    const route = useRoute()
    const loading = ref(true)
    const previewFrame = ref(null)
    const pageViolations = ref([])
    const selectedViolation = ref(null)
    const previewMode = ref('proxy')
    const token = ref(localStorage.getItem('token'))
    const highlightedNode = ref(null)
    const aiSuggestions = ref({})
    const loadingSuggestions = ref({})
    const previewContainer = ref(null)
    const sidebar = ref(null)
    const sidebarWidth = ref(400)

    const proxyUrl = computed(() => {
      const tokenValue = token.value.startsWith('Bearer ') ? token.value.slice(7) : token.value;
      return `${process.env.VUE_APP_API_URL}/api/proxy/${encodeURIComponent(props.url)}?token=${tokenValue}`
    })

    const fetchViolations = async () => {
      loading.value = true;
      try {
        const { data } = await axios.get(
          `${process.env.VUE_APP_API_URL}/api/violations/${props.scanId}/${encodeURIComponent(props.url)}`,
          {
            headers: {
              'Authorization': `Bearer ${token.value}`
            }
          }
        );
        pageViolations.value = data;
        
        // If we have a selectedViolationId, find and highlight it
        if (props.selectedViolationId) {
          const selectedViolation = data.find(v => 
            v.id === props.selectedViolationId || 
            `${v.id}-${v.help}` === props.selectedViolationId
          );
          if (selectedViolation) {
            highlightViolation(selectedViolation);
          }
        }
      } catch (error) {
        console.error('Error fetching violations:', error);
        pageViolations.value = [];
      } finally {
        loading.value = false;
      }
    }

    const highlightViolation = (violation) => {
      // If clicking the same violation, unselect it and clear highlights
      if (selectedViolation.value?.id === violation.id) {
        selectedViolation.value = null
        // Clear all highlights
        if (previewFrame.value) {
          previewFrame.value.contentWindow.postMessage({
            type: 'highlight',
            selector: null,
            clearAll: true
          }, process.env.VUE_APP_API_URL)
        }
      } else {
        // Selecting a new violation
        selectedViolation.value = violation
        
        if (previewFrame.value) {
          // First clear any existing highlights
          previewFrame.value.contentWindow.postMessage({
            type: 'highlight',
            selector: null,
            clearAll: true
          }, process.env.VUE_APP_API_URL)
          
          // Then highlight the new violation nodes
          violation.nodes.forEach(node => {
            node.target.forEach(selector => {
              previewFrame.value.contentWindow.postMessage({
                type: 'highlight',
                selector: selector,
                clearAll: false
              }, process.env.VUE_APP_API_URL)
            })
          })
        }
      }
      highlightedNode.value = null
    }

    const scrollToElement = (selectors) => {
      if (previewFrame.value) {
        // First clear existing highlights
        previewFrame.value.contentWindow.postMessage({
          type: 'highlight',
          selector: null,
          clearAll: true
        }, process.env.VUE_APP_API_URL)
        
        // Then highlight the selected elements
        selectors.forEach(selector => {
          previewFrame.value.contentWindow.postMessage({
            type: 'highlight',
            selector: selector,
            clearAll: false
          }, process.env.VUE_APP_API_URL)
        })
        highlightedNode.value = selectors
      }
    }

    const isNodeHighlighted = (node) => {
      return highlightedNode.value && 
        node.target.some(t => highlightedNode.value.includes(t));
    }

    const onFrameLoad = () => {
      loading.value = false
    }

    const handlePreviewError = async () => {
      if (previewMode.value === 'proxy') {
        previewMode.value = 'screenshot';
        // Fetch and display screenshot version
      }
    }

    const formatHtml = (html) => {
      return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .trim();
    }

    const getAISuggestion = async (violation, node) => {
      if (!violation || !node || !node.target) {
        console.error('Missing required data for AI suggestion:', { violation, node });
        return;
      }
      
      // Create a unique key for this node
      const nodeKey = `${violation.id || violation._id}-${node.target.join('-')}`
      
      console.log('getAISuggestion called with nodeKey:', nodeKey);
      console.log('Violation details:', { id: violation.id, _id: violation._id, help: violation.help });
      
      // If we already have a valid suggestion for this node, don't fetch again
      // Check that the suggestion exists and is not an error message
      if (aiSuggestions.value && 
          aiSuggestions.value[nodeKey] && 
          !aiSuggestions.value[nodeKey].startsWith('Error:')) {
        console.log('Valid suggestion already exists for this node, returning early');
        return;
      }
      
      // If we have an error suggestion, we should try again
      if (aiSuggestions.value && 
          aiSuggestions.value[nodeKey] && 
          aiSuggestions.value[nodeKey].startsWith('Error:')) {
        console.log('Previous attempt resulted in an error, trying again');
      }
      
      // Set loading state
      loadingSuggestions.value = {
        ...loadingSuggestions.value,
        [nodeKey]: true
      };
      console.log('Set loading state for nodeKey:', nodeKey, 'loadingSuggestions:', loadingSuggestions.value);
      
      // Create a cache key based on the violation details and HTML content
      // This allows us to reuse suggestions for identical markup across different pages
      const cacheKey = JSON.stringify({
        ruleId: violation.id || violation._id || 'unknown',
        help: violation.help || '',
        html: node.html || '',
        target: node.target ? node.target.join('-') : ''
      });
      
      // Check if we have a cached suggestion
      const suggestionCache = getSuggestionCache();
      const cachedSuggestion = suggestionCache[cacheKey];
      
      if (cachedSuggestion) {
        console.log('Found cached suggestion for this markup');
        
        // Store the cached suggestion using Vue's reactivity system
        aiSuggestions.value = {
          ...aiSuggestions.value,
          [nodeKey]: cachedSuggestion
        };
        
        // Update loading state
        loadingSuggestions.value = {
          ...loadingSuggestions.value,
          [nodeKey]: false
        };
        
        console.log('Used cached suggestion for nodeKey:', nodeKey);
        return;
      }
      
      console.log('Requesting AI suggestion for:', {
        nodeKey,
        violationId: violation.id || violation._id,
        help: violation.help,
        description: violation.description || ''
      });
      
      try {
        const suggestion = await aiService.getRemediationSuggestion({
          id: violation.id || violation._id,
          help: violation.help,
          description: violation.description || '',
          node: node
        })
        
        console.log('Received AI suggestion:', {
          nodeKey,
          suggestionLength: suggestion?.length,
          suggestionPreview: suggestion?.substring(0, 50) + '...',
          fullSuggestion: suggestion
        });
        
        // Check if the suggestion is valid
        if (!suggestion || suggestion.trim() === '') {
          throw new Error('Received empty suggestion from API');
        }
        
        // Store the suggestion using Vue's reactivity system
        // This ensures the UI updates when the suggestion is received
        aiSuggestions.value = {
          ...aiSuggestions.value,
          [nodeKey]: suggestion
        };
        
        // Save to cache for future use
        if (suggestion) {
          suggestionCache[cacheKey] = suggestion;
          saveSuggestionCache(suggestionCache);
          console.log('Saved suggestion to cache with key:', cacheKey);
        }
        
        console.log('Stored suggestion in aiSuggestions for nodeKey:', nodeKey, 'aiSuggestions now has keys:', Object.keys(aiSuggestions.value || {}));
        console.log('Verification - suggestion exists:', !!aiSuggestions.value[nodeKey], 'length:', aiSuggestions.value[nodeKey]?.length || 0);
      } catch (error) {
        console.error('Failed to get AI suggestion:', error)
        
        // Create a user-friendly error message
        let errorMessage = 'Error: Unable to generate suggestion. Please try again.';
        
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = `Error: Server responded with status ${error.response.status}. Please try again.`;
          console.error('Error response data:', error.response.data);
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'Error: No response received from server. Please check your connection.';
        } else if (error.message) {
          // Something happened in setting up the request that triggered an Error
          errorMessage = `Error: ${error.message}`;
        }
        
        // Store the error message using Vue's reactivity system
        aiSuggestions.value = {
          ...aiSuggestions.value,
          [nodeKey]: errorMessage
        };
        console.log('Stored error message in aiSuggestions for nodeKey:', nodeKey);
      } finally {
        // Update loading state using Vue's reactivity system
        loadingSuggestions.value = {
          ...loadingSuggestions.value,
          [nodeKey]: false
        };
        console.log('Cleared loading state for nodeKey:', nodeKey);
      }
    }
    
    const isLoadingSuggestion = (node) => {
      if (!node || !node.target || !loadingSuggestions.value) return false;
      
      // Create the same nodeKey as used in getAISuggestion and getNodeSuggestion
      let nodeKey = selectedViolation.value ? 
        `${selectedViolation.value.id || selectedViolation.value._id}-${node.target.join('-')}` :
        `undefined-${node.target.join('-')}`;
      
      return !!loadingSuggestions.value[nodeKey];
    }
    
    const getNodeSuggestion = (node) => {
      if (!node || !node.target || !aiSuggestions.value) {
        console.log('getNodeSuggestion: Early return due to missing data', {
          hasNode: !!node,
          hasNodeTarget: !!(node && node.target),
          hasAiSuggestions: !!aiSuggestions.value
        });
        return null;
      }
      
      // First try with the selected violation if available
      let nodeKey = selectedViolation.value ? 
        `${selectedViolation.value.id || selectedViolation.value._id}-${node.target.join('-')}` :
        `undefined-${node.target.join('-')}`;
      
      console.log('Checking for suggestion with key:', nodeKey);
      
      // Try to get the suggestion with the nodeKey
      let suggestion = aiSuggestions.value[nodeKey];
      
      // If no suggestion found, try looking for any key that ends with this node target
      if (!suggestion) {
        const alternativeKeys = Object.keys(aiSuggestions.value).filter(key => 
          key.endsWith(`-${node.target.join('-')}`)
        );
        
        console.log('Alternative keys found:', alternativeKeys);
        
        if (alternativeKeys.length > 0) {
          suggestion = aiSuggestions.value[alternativeKeys[0]];
          console.log('Found suggestion using alternative key:', alternativeKeys[0]);
        }
      }
      
      // Log all available suggestions for debugging
      if (aiSuggestions.value) {
        console.log('All available suggestions:', Object.keys(aiSuggestions.value).map(key => ({
          key,
          hasValue: !!aiSuggestions.value[key],
          valueLength: aiSuggestions.value[key]?.length || 0
        })));
      }
      
      if (!suggestion) {
        console.log('No suggestion found for node target:', node.target.join('-'));
        return null;
      }
      
      // Check if this is an error message and add appropriate class
      if (suggestion.startsWith('Error:')) {
        return `<span class="error-message">${suggestion}</span>`;
      }
      
      // Format the suggestion for display with proper HTML code formatting
      let formattedSuggestion = suggestion;
      
      // Replace newlines with <br> tags
      formattedSuggestion = formattedSuggestion.replace(/\n/g, '<br>');
      
      // First handle code blocks with ```html ... ``` syntax
      formattedSuggestion = formattedSuggestion.replace(
        /```html\s*([\s\S]*?)\s*```/g, 
        (match, codeBlock) => {
          if (!codeBlock) return match;
          
          // Escape HTML entities to prevent rendering as actual HTML
          const escapedCode = codeBlock
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
          
          return `<div class="code-block"><pre><code class="language-html">${escapedCode}</code></pre></div>`;
        }
      );
      
      // Then handle inline code with backticks that should be displayed as code
      formattedSuggestion = formattedSuggestion.replace(
        /`([^`]+)`/g,
        (match, inlineCode) => {
          // Check if this is HTML code that should be rendered
          if (inlineCode.trim().startsWith('<') && inlineCode.trim().endsWith('>')) {
            // This is HTML that should be rendered
            return inlineCode;
          } else {
            // This is code that should be displayed as text
            const escapedCode = inlineCode
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
            
            return `<code class="inline-code">${escapedCode}</code>`;
          }
        }
      );
      
      console.log('Returning formatted suggestion with length:', formattedSuggestion.length);
      return formattedSuggestion;
    }

    const clearSuggestionCache = () => {
      try {
        localStorage.removeItem(AI_SUGGESTION_CACHE_KEY);
        console.log('AI suggestion cache cleared');
        return true;
      } catch (error) {
        console.error('Error clearing suggestion cache:', error);
        return false;
      }
    }

    const startResize = (event) => {
      const initialX = event.clientX
      const initialWidth = sidebarWidth.value

      const resize = (event) => {
        const deltaX = event.clientX - initialX
        const newWidth = initialWidth + deltaX
        sidebarWidth.value = Math.max(200, Math.min(800, newWidth))
      }

      const stopResize = () => {
        document.removeEventListener('mousemove', resize)
        document.removeEventListener('mouseup', stopResize)
      }

      document.addEventListener('mousemove', resize)
      document.addEventListener('mouseup', stopResize)
      
      // Prevent text selection during resize
      event.preventDefault()
    }

    onMounted(() => {
      // Refresh token value on mount
      token.value = localStorage.getItem('token')
      fetchViolations()
    })

    return {
      loading,
      previewFrame,
      pageViolations,
      selectedViolation,
      highlightViolation,
      scrollToElement,
      onFrameLoad,
      handlePreviewError,
      proxyUrl,
      formatHtml,
      isNodeHighlighted,
      getAISuggestion,
      isLoadingSuggestion,
      getNodeSuggestion,
      aiSuggestions,
      loadingSuggestions,
      clearSuggestionCache,
      previewContainer,
      sidebar,
      sidebarWidth,
      startResize
    }
  }
}
</script>

<style scoped>
.page-preview {
  padding: 20px;
}

.preview-header {
  margin-bottom: 20px;
}

.breadcrumb {
  margin-bottom: 10px;
}

.preview-container {
  display: flex;
  height: calc(100vh - 150px);
  position: relative;
}

.resize-handle {
  width: 10px;
  cursor: col-resize;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 400px; /* Match initial sidebar width */
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.handle-line {
  width: 4px;
  height: 50px;
  background-color: #ddd;
  border-radius: 2px;
}

.resize-handle:hover .handle-line {
  background-color: #0d6efd;
}

.violations-sidebar {
  background: var(--card-background);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-y: auto;
  min-width: 200px;
  max-width: 800px;
  flex-shrink: 0;
}

.violation-item {
  margin-bottom: 15px;
}

.violation-header {
  cursor: pointer;
  padding: 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.violation-header:hover {
  background-color: #f0f0f0;
}

.violation-header.active {
  background-color: rgba(13, 110, 253, 0.1);
  border-left: 3px solid #0d6efd;
}

.violation-details {
  margin-top: 10px;
  padding-left: 15px;
}

.violation-actions {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.help-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.9rem;
  display: inline-block;
}

.help-link:hover {
  text-decoration: underline;
}

.violation-nodes {
  margin-top: 10px;
  padding-left: 15px;
}

.violation-node {
  cursor: pointer;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  background: var(--background-color);
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.violation-node:hover {
  background: #e9ecef;
}

.violation-node.highlighted {
  border-color: #0d6efd;
  background-color: rgba(13, 110, 253, 0.05);
}

.impact-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.impact-badge.critical {
  background-color: #dc3545;
  color: white;
}

.impact-badge.serious {
  background-color: #fd7e14;
  color: white;
}

.impact-badge.moderate {
  background-color: #ffc107;
  color: black;
}

.impact-badge.minor {
  background-color: #6c757d;
  color: white;
}

.preview-frame {
  background: var(--card-background);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  flex-grow: 1;
  margin-left: 20px;
}

.preview-frame iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.2em;
  color: #666;
}

.ai-suggestion-container {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-suggestion-button {
  background-color: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.ai-suggestion-button:hover {
  background-color: #4f46e5;
}

.ai-suggestion-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-suggestion-result {
  background-color: #f3f4f6;
  border-radius: 4px;
  padding: 12px;
  border-left: 4px solid #6366f1;
}

.ai-suggestion-result h5 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 14px;
  color: #4b5563;
}

.suggestion-content {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
}

.code-block {
  margin: 16px 0;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  overflow: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.code-block pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
}

.code-block code {
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  display: block;
  tab-size: 2;
}

.inline-code {
  font-family: 'Courier New', Courier, monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 13px;
  color: #e83e8c;
  border: 1px solid #e9ecef;
}

.debug-info {
  margin-top: 10px;
  padding: 8px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 12px;
}

.debug-info summary {
  cursor: pointer;
  color: #6c757d;
  font-weight: bold;
}

.debug-info pre {
  margin-top: 8px;
  white-space: pre-wrap;
  overflow-x: auto;
}

.debug-status {
  margin-top: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suggestion-content .language-html {
  white-space: normal;
}
</style>

<!-- Non-scoped styles for dynamically inserted content -->
<style>
/* Styles for AI suggestion content */
.suggestion-content .language-html {
  white-space: normal;
}

.suggestion-content code {
  font-family: 'Courier New', Courier, monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 13px;
  color: #e83e8c;
  border: 1px solid #e9ecef;
}

.suggestion-content .code-block {
  margin: 16px 0;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  overflow: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.suggestion-content .code-block pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
}

.suggestion-content .code-block code {
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  display: block;
  tab-size: 2;
}

/* Additional styles for better readability */
.suggestion-content p {
  margin: 12px 0;
}

.suggestion-content ul, 
.suggestion-content ol {
  margin: 12px 0;
  padding-left: 24px;
}

.suggestion-content li {
  margin-bottom: 6px;
}

.suggestion-content h1, 
.suggestion-content h2, 
.suggestion-content h3, 
.suggestion-content h4, 
.suggestion-content h5, 
.suggestion-content h6 {
  margin-top: 16px;
  margin-bottom: 8px;
  color: #333;
}

.suggestion-content a {
  color: #0d6efd;
  text-decoration: none;
}

.suggestion-content a:hover {
  text-decoration: underline;
}

/* Styles for error messages */
.error-message {
  color: #dc3545;
  font-weight: 500;
  display: block;
}
</style> 