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
import QueueView from '../views/QueueView.vue';
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
  },
  {
    path: '/queue',
    name: 'Queue',
    component: QueueView,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard
router.beforeEach(async (to, from, next) => {
  console.log('Route navigation:', { to: to.path, from: from.path });
  
  const isAuthenticated = store.state.token != null;
  const publicRoutes = ['login', 'register', 'forgot-password'];
  
  console.log('Auth check:', {
    isAuthenticated,
    requiresAuth: !publicRoutes.includes(to.name),
    route: to.name
  });
  
  if (!isAuthenticated && !publicRoutes.includes(to.name)) {
    console.log('Unauthenticated access to protected route, redirecting to login');
    next({ 
      name: 'login', 
      query: { redirect: to.fullPath }
    });
  } else if (isAuthenticated && publicRoutes.includes(to.name)) {
    console.log('Authenticated user accessing public route, redirecting to dashboard');
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router; 