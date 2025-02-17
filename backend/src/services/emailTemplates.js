const getPasswordResetTemplate = (resetUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 1px solid #eee;
    }
    .logo {
      color: #4CAF50;
      font-size: 24px;
      font-weight: bold;
      text-decoration: none;
    }
    .content {
      padding: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
    .note {
      background-color: #f8f8f8;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">WiA11y</div>
    </div>
    <div class="content">
      <h1>Reset Your Password</h1>
      <p>Hello,</p>
      <p>We received a request to reset your password for your WiA11y Web Accessibility Crawler account. Click the button below to reset it:</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      
      <div class="note">
        <strong>Note:</strong> This link will expire in 1 hour for security reasons.
      </div>
      
      <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      
      <p>For security reasons, this link can only be used once. If you need to reset your password again, please visit <a href="${process.env.FRONTEND_URL}/forgot-password">our website</a> and request another reset.</p>
    </div>
    <div class="footer">
      <p>WiA11y Web Accessibility Crawler</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

const getAccessibilitySummaryTemplate = (data) => {
  const { userName, frequency, domains, period } = data;
  
  const domainRows = domains.map(domain => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${domain.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${domain.averageScore}%</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${domain.trend}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${domain.lastScan}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #388fec; color: white; padding: 20px; border-radius: 4px; }
        .content { padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; padding: 10px; background: #f5f5f5; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Accessibility Summary Report</h1>
          <p>${frequency} Report for ${period}</p>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Here's your ${frequency.toLowerCase()} accessibility summary for your domains:</p>
          
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Average Score</th>
                <th>Trend</th>
                <th>Last Scan</th>
              </tr>
            </thead>
            <tbody>
              ${domainRows}
            </tbody>
          </table>

          <div class="footer">
            <p>This is an automated report from WiA11y. You can adjust your email preferences in your settings.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  getPasswordResetTemplate,
  getAccessibilitySummaryTemplate
}; 