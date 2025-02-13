FROM node:18-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    libgbm1 \
    libxss1 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxtst6 \
    xvfb \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Set environment variable for Chrome binary path
ENV CHROME_BIN=/usr/bin/chromium

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create directory for Chrome
RUN mkdir -p /tmp/chrome-tmp && chmod 777 /tmp/chrome-tmp

# Expose port
EXPOSE 3000

CMD ["npm", "start"] 