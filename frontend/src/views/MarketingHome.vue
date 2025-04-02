<template>
  <div class="marketing-home">
    <!-- Navigation -->
    <nav class="navbar">
      <div class="container">
        <div class="logo">
          <Logo />
        </div>
        <div class="nav-right">
          <DarkModeToggle />
          <router-link to="/login" class="login-button">Login</router-link>
          <router-link to="/register" class="register-button">Register</router-link>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <logo-default class="hero-logo" />
          <h1>WiA11y</h1>
          <p class="tagline">Empower Your Digital Accessibility Journey</p>
          <p class="hero-description">
            Comprehensive web accessibility monitoring and reporting platform that helps organizations 
            ensure their digital content is accessible to everyone.
          </p>
          <div class="cta-buttons">
            <router-link to="/register" class="cta-button primary">Get Started</router-link>
            <router-link to="/login" class="cta-button secondary">Sign In</router-link>
          </div>
        </div>
        <div class="hero-image">
          <img src="@/assets/accessibility-illustration.svg" alt="Accessibility Illustration" />
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <h2>Why Choose WiA11y?</h2>
      <div class="features-grid">
        <div class="feature-card">
          <i class="fas fa-chart-line"></i>
          <h3>Continuous Monitoring</h3>
          <p>Automatically scan your websites for accessibility issues and track improvements over time.</p>
        </div>
        <div class="feature-card">
          <i class="fas fa-users"></i>
          <h3>Team Collaboration</h3>
          <p>Work together with your team to identify, prioritize, and resolve accessibility challenges.</p>
        </div>
        <div class="feature-card">
          <i class="fas fa-file-alt"></i>
          <h3>Detailed Reports</h3>
          <p>Get comprehensive reports with actionable insights to improve your website's accessibility.</p>
        </div>
        <div class="feature-card">
          <i class="fas fa-check-circle"></i>
          <h3>WCAG Compliance</h3>
          <p>Stay compliant with the latest WCAG guidelines (2.0, 2.1, and 2.2) and conformance levels.</p>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <section class="benefits">
      <div class="benefits-content">
        <h2>Transform Your Digital Accessibility</h2>
        <div class="benefits-list">
          <div class="benefit-item">
            <i class="fas fa-robot"></i>
            <div class="benefit-text">
              <h3>Automated Scanning</h3>
              <p>Save time with automated accessibility scans that identify issues across your entire website.</p>
            </div>
          </div>
          <div class="benefit-item">
            <i class="fas fa-tasks"></i>
            <div class="benefit-text">
              <h3>Issue Tracking</h3>
              <p>Keep track of accessibility issues and monitor progress as your team resolves them.</p>
            </div>
          </div>
          <div class="benefit-item">
            <i class="fas fa-history"></i>
            <div class="benefit-text">
              <h3>Historical Data</h3>
              <p>View trends and improvements in your accessibility scores over time.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Call to Action Section -->
    <section class="cta-section">
      <div class="cta-content">
        <h2>Ready to Make Your Website More Accessible?</h2>
        <p>Join organizations that trust WiA11y to monitor and improve their digital accessibility.</p>
        <div class="cta-buttons">
          <router-link to="/register" class="cta-button primary">Start Free Trial</router-link>
          <router-link to="/login" class="cta-button secondary">Sign In</router-link>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="marketing-footer">
      <div class="footer-content">
        <div class="footer-logo">
          <logo-default />
          <span>WiA11y</span>
        </div>
        <div class="footer-links">
          <router-link to="/login">Sign In</router-link>
          <router-link to="/register">Register</router-link>
          <a href="#features">Features</a>
          <a href="#benefits">Benefits</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import LogoDefault from '@/components/Logo-default.vue'
import DarkModeToggle from '@/components/DarkModeToggle.vue'
import Logo from '@/components/Logo.vue'

export default {
  name: 'MarketingHome',
  components: {
    LogoDefault,
    DarkModeToggle,
    Logo
  }
}
</script>

<style scoped>
.marketing-home {
  min-height: 100vh;
  background-color: var(--background-color);
  color: var(--text-color);
}

/* Hero Section */
.hero {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 100px 20px;
  text-align: center;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
}

.hero-text {
  padding-right: 40px;
}

.hero-logo {
  margin-bottom: 20px;
}

.hero h1 {
  font-size: 4rem;
  margin-bottom: 20px;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
}

.tagline {
  font-size: 1.5rem;
  color: #000;
  margin-bottom: 20px;
  font-weight: 500;
}

.hero-description {
  font-size: 1.2rem;
  color: #6c757d;
  margin-bottom: 40px;
  line-height: 1.6;
}

.hero-image img {
  width: 100%;
  max-width: 600px;
  height: auto;
}

/* Features Section */
.features {
  padding: 100px 20px;
  background-color: var(--background-color);
  text-align: center;
}

.features h2 {
  font-size: 2.5rem;
  margin-bottom: 60px;
  color: var(--text-color);
}

.features-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-card {
  padding: 30px;
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, background-color 0.3s ease;
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card i {
  font-size: 2.5rem;
  color: var(--primary-color);
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  color: var(--text-color);
}

.feature-card p {
  color: var(--text-muted);
  line-height: 1.6;
}

/* Benefits Section */
.benefits {
  padding: 100px 20px;
  background-color: var(--background-color);
}

.benefits-content {
  max-width: 1200px;
  margin: 0 auto;
}

.benefits h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 60px;
  color: var(--text-color);
}

.benefits-list {
  display: grid;
  gap: 40px;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.benefit-item i {
  font-size: 2rem;
  color: var(--primary-color);
  padding: 15px;
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.benefit-text h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  color: var(--text-color);
}

.benefit-text p {
  color: var(--text-muted);
  line-height: 1.6;
}

/* CTA Section */
.cta-section {
  padding: 100px 20px;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  text-align: center;
}

.cta-content {
  max-width: 800px;
  margin: 0 auto;
}

.cta-content h2 {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.cta-content p {
  font-size: 1.2rem;
  margin-bottom: 40px;
  opacity: 0.9;
}

/* Buttons */
.cta-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 30px;
}

.cta-button {
  padding: 15px 30px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.cta-button.primary {
  background-color: white;
  color: var(--primary-color);
}

.cta-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.cta-button.secondary {
  background-color: transparent;
  border: 2px solid rgb(29, 153, 242);
  color: rgb(64, 64, 64);
}

.cta-button.secondary:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

/* Footer */
.marketing-footer {
  background-color: var(--text-color);
  color: white;
  padding: 40px 20px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  font-weight: 600;
}

.footer-links {
  display: flex;
  gap: 30px;
}

.footer-links a {
  color: white;
  text-decoration: none;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.footer-links a:hover {
  opacity: 1;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-text {
    padding-right: 0;
  }

  .hero-image {
    order: -1;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .benefit-item {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }

  .footer-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .footer-links {
    flex-direction: column;
    gap: 15px;
  }
}

/* Navbar */
.navbar {
  background-color: var(--nav-background);
  padding: 10px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: background-color 0.3s ease;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  font-weight: 600;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.login-button,
.register-button {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.login-button {
  background-color: transparent;
  border: 2px solid var(--primary-color);
  color: var(--text-color);
}

.login-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.register-button {
  background-color: var(--primary-color);
  color: white;
}

.register-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .nav-right {
    gap: 10px;
  }
}
</style> 