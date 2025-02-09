<template>
  <div class="code-block">
    <pre><code ref="codeBlock" :class="language"><slot></slot></code></pre>
  </div>
</template>

<script>
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/atom-one-light.css';

hljs.registerLanguage('html', xml);

export default {
  name: 'CodeBlock',
  props: {
    language: {
      type: String,
      default: 'html'
    }
  },
  methods: {
    decodeHtml(html) {
      return html
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
    }
  },
  mounted() {
    // Get the raw content and decode it
    const rawContent = this.$slots.default()[0].children;
    const decodedContent = this.decodeHtml(rawContent);
    
    // Set the content and apply highlighting
    this.$refs.codeBlock.textContent = decodedContent;
    hljs.highlightElement(this.$refs.codeBlock);
  },
  updated() {
    const rawContent = this.$slots.default()[0].children;
    const decodedContent = this.decodeHtml(rawContent);
    this.$refs.codeBlock.textContent = decodedContent;
    hljs.highlightElement(this.$refs.codeBlock);
  }
}
</script>

<style scoped>
.code-block {
  position: relative;
  background: #ffffff;
  border-radius: 6px;
  margin: 8px 0;
  border: 1px solid #e0e0e0;
}

.code-block pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 0.9em;
  line-height: 1.5;
}

.code-block code {
  background: transparent;
  padding: 0;
}
</style>

<style>
/* Override highlight.js styles for better contrast */
.hljs-tag {
  color: #22863a !important;
}

.hljs-name {
  color: #0184bc !important;
}

.hljs-attr {
  color: #b76c09 !important;
}

.hljs-string {
  color: #032f62 !important;
}

.hljs-meta {
  color: #005cc5 !important;
}

.hljs-punctuation {
  color: #24292e !important;
}

/* Additional syntax highlighting styles */
.hljs-comment {
  color: #6a737d !important;
}

.hljs-doctag {
  color: #d73a49 !important;
}

.hljs-keyword {
  color: #d73a49 !important;
}

.hljs-literal {
  color: #005cc5 !important;
}
</style> 