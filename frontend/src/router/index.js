import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import TeamManagement from '../views/TeamManagement.vue';
import UserManagement from '../views/UserManagement.vue';
import Users from '../views/Users.vue';
import ScanResults from '../views/ScanResults.vue';
import PagePreview from '../views/PagePreview.vue';
import AllScans from '../views/AllScans.vue';
import ForgotPassword from '../views/ForgotPassword.vue';
import ResetPassword from '../views/ResetPassword.vue';
import store from '../store';

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: Login
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/team-management',
    name: 'TeamManagement',
    component: TeamManagement,
    meta: { requiresAuth: true, requiresTeamAdmin: true }
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { requiresAuth: true }
  },
  {
    path: '/scans/:id',
    name: 'ScanResults',
    component: ScanResults,
    meta: { requiresAuth: true }
  },
  {
    path: '/scans/:scanId/page/:url',
    name: 'PagePreview',
    component: PagePreview,
    props: route => ({
      scanId: route.params.scanId,
      url: route.params.url,
      selectedViolationId: route.query.violationId
    })
  },
  {
    path: '/scans',
    name: 'AllScans',
    component: AllScans,
    meta: { requiresAuth: true }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPassword
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = store.state.token != null;
  
  // Add public routes that don't require authentication
  const publicRoutes = ['login', 'register', 'forgot-password'];
  
  if (!isAuthenticated && !publicRoutes.includes(to.name)) {
    // Redirect to login if trying to access protected route
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (to.name === 'login' && isAuthenticated) {
    // If user is already authenticated and tries to access login, redirect to dashboard
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router; 