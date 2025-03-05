#!/usr/bin/env node

/**
 * This script helps set up the OpenAI API key for the AI remediation feature.
 * It checks if the key is already configured and guides the user through the setup process.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env file
const envPath = path.join(__dirname, '..', '.env');

// Check if .env file exists
const envExists = fs.existsSync(envPath);

// Function to check if OpenAI API key is already configured
function checkOpenAIKey() {
  if (!envExists) {
    console.log('\x1b[33m%s\x1b[0m', 'No .env file found. Creating one now...');
    return false;
  }

  // Load environment variables from .env file
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  
  // Check if OpenAI API key is already configured
  if (envConfig.OPENAI_API_KEY && envConfig.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    console.log('\x1b[32m%s\x1b[0m', '✓ OpenAI API key is already configured.');
    return true;
  }
  
  return false;
}

// Function to set up OpenAI API key
function setupOpenAIKey() {
  console.log('\x1b[36m%s\x1b[0m', '🤖 WiA11y AI Remediation Setup');
  console.log('\x1b[36m%s\x1b[0m', '================================');
  console.log('This script will help you set up the OpenAI API key for the AI remediation feature.');
  console.log('You can get an API key from https://platform.openai.com/api-keys');
  console.log();

  if (checkOpenAIKey()) {
    rl.question('Do you want to update your existing OpenAI API key? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        promptForAPIKey();
      } else {
        console.log('\x1b[32m%s\x1b[0m', 'Setup complete! Your existing API key will be used.');
        rl.close();
      }
    });
  } else {
    promptForAPIKey();
  }
}

// Function to prompt for API key
function promptForAPIKey() {
  rl.question('Please enter your OpenAI API key: ', (apiKey) => {
    if (!apiKey.trim()) {
      console.log('\x1b[31m%s\x1b[0m', 'Error: API key cannot be empty.');
      promptForAPIKey();
      return;
    }

    // Update or create .env file with the API key
    updateEnvFile(apiKey.trim());
    
    console.log('\x1b[32m%s\x1b[0m', '✓ OpenAI API key has been configured successfully!');
    console.log('\x1b[33m%s\x1b[0m', 'Note: You need to restart the server for changes to take effect.');
    rl.close();
  });
}

// Function to update .env file
function updateEnvFile(apiKey) {
  let envContent = '';
  
  if (envExists) {
    // Read existing .env file
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if OPENAI_API_KEY already exists in the file
    if (envContent.includes('OPENAI_API_KEY=')) {
      // Replace existing key
      envContent = envContent.replace(/OPENAI_API_KEY=.*(\r?\n|$)/g, `OPENAI_API_KEY=${apiKey}$1`);
    } else {
      // Add key to the end of the file
      envContent += `\n\n# AI Configuration\nOPENAI_API_KEY=${apiKey}\n`;
    }
  } else {
    // Create new .env file with minimal configuration
    envContent = `# Server Configuration
PORT=3000
MONGODB_URI=mongodb://localhost:27017/accessibility-crawler
JWT_SECRET=temporary_jwt_secret_please_change
CORS_ORIGIN=http://localhost:8080
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080

# AI Configuration
OPENAI_API_KEY=${apiKey}
`;
  }
  
  // Write to .env file
  fs.writeFileSync(envPath, envContent);
}

// Start setup process
setupOpenAIKey(); 