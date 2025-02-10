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
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
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
    name: 'ForgotPassword',
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
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else if (to.meta.requiresNetworkAdmin && user?.role !== 'network_admin') {
    next('/dashboard');
  } else if (to.meta.requiresTeamAdmin && !['network_admin', 'team_admin'].includes(user?.role)) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router; 