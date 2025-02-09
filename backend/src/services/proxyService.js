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
            if (event.origin === 'http://localhost:8080') {
              if (event.data.type === 'highlight') {
                const selector = event.data.selector;
                const impact = event.data.impact;
                document.querySelectorAll('.a11y-highlight').forEach(el => {
                  el.classList.remove('a11y-highlight');
                  el.removeAttribute('data-impact');
                });
                if (selector) {
                  const element = document.querySelector(selector);
                  if (element) {
                    element.classList.add('a11y-highlight');
                    if (impact) {
                      element.setAttribute('data-impact', impact);
                    }
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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