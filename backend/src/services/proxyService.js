const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

class ProxyService {
  async fetchAndModifyPage(url) {
    try {
      // Fetch the original page
      const response = await axios.get(url);
      const html = response.data;
      const $ = cheerio.load(html);

      // Modify the page to handle CORS and security issues
      // Remove scripts that might break the page
      $('script').remove();

      // Convert all resources to absolute URLs
      $('img, link, source').each((i, elem) => {
        const srcAttr = $(elem).attr('src') || $(elem).attr('href');
        if (srcAttr && !srcAttr.startsWith('http')) {
          const absoluteUrl = new URL(srcAttr, url).href;
          if ($(elem).attr('src')) {
            $(elem).attr('src', absoluteUrl);
          } else {
            $(elem).attr('href', absoluteUrl);
          }
        }
      });

      // Add base tag to handle relative URLs
      $('head').prepend(`<base href="${url}">`);

      // Add our custom highlight styles
      const customStyles = `
        <style>
          .a11y-highlight {
            outline: 3px solid #dc3545 !important;
            background-color: rgba(220, 53, 69, 0.1) !important;
          }
          .a11y-highlight[data-impact="critical"] {
            outline-color: #dc3545 !important;
            background-color: rgba(220, 53, 69, 0.1) !important;
          }
          .a11y-highlight[data-impact="serious"] {
            outline-color: #fd7e14 !important;
            background-color: rgba(253, 126, 20, 0.1) !important;
          }
          .a11y-highlight[data-impact="moderate"] {
            outline-color: #ffc107 !important;
            background-color: rgba(255, 193, 7, 0.1) !important;
          }
          .a11y-highlight[data-impact="minor"] {
            outline-color: #6c757d !important;
            background-color: rgba(108, 117, 125, 0.1) !important;
          }
        </style>
        <script>
          window.addEventListener('message', function(event) {
            const allowedOrigins = ['${process.env.FRONTEND_URL}', 'http://localhost:8080'];
            if (allowedOrigins.includes(event.origin)) {
              if (event.data.type === 'highlight') {
                // Clear existing highlights if clearAll is true or selector is null
                if (event.data.clearAll || !event.data.selector) {
                  document.querySelectorAll('.a11y-highlight').forEach(el => {
                    el.classList.remove('a11y-highlight');
                    el.removeAttribute('data-impact');
                    el.removeAttribute('data-highlighted');
                  });
                }
                
                // Add new highlight if selector is provided
                if (event.data.selector) {
                  const element = document.querySelector(event.data.selector);
                  if (element) {
                    // Only highlight if not already highlighted
                    if (!element.hasAttribute('data-highlighted')) {
                      element.classList.add('a11y-highlight');
                      if (event.data.impact) {
                        element.setAttribute('data-impact', event.data.impact);
                      }
                      element.setAttribute('data-highlighted', 'true');
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }
                }
              }
            }
          });
        </script>
      `;
      $('head').append(customStyles);

      return $.html();
    } catch (error) {
      console.error('Error fetching page:', error);
      throw error;
    }
  }
}

module.exports = new ProxyService(); 