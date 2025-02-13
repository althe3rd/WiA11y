<template>
  <div class="user-management">
    <div class="header">
      <h2 class="title">User Management</h2>
      <div class="search-bar">
        <i class="fas fa-search search-icon"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search users..."
          class="search-input"
        >
      </div>
      <button @click="showAddUserModal" class="btn-add">
        <i class="fas fa-plus"></i> Add User
      </button>
    </div>

    <div class="users-list">
      <!-- Header Row -->
      <div class="user-row header-row">
        <div class="user-info">Name</div>
        <div class="user-email">Email</div>
        <div class="user-role">Role</div>
        <div class="user-actions">Actions</div>
      </div>

      <!-- User Rows -->
      <div v-for="user in filteredUsers" :key="user._id" class="user-row">
        <div class="user-info">
          <span class="user-name">{{ user.name }}</span>
        </div>
        <div class="user-email">{{ user.email }}</div>
        <div class="user-role">
          <span :class="['role-badge', getRoleBadgeClass(user.role)]">
            {{ formatRole(user.role) }}
          </span>
        </div>
        <div class="user-actions">
          <button 
            @click="editUser(user)" 
            class="btn-action edit"
            :disabled="user.role === 'network_admin' && currentUser?.role !== 'network_admin'"
          >
            <i class="fas fa-edit"></i> Edit
          </button>
          <button 
            @click="confirmDelete(user)" 
            class="btn-action delete"
            :disabled="user.role === 'network_admin' || user._id === currentUser?._id"
          >
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit User Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ editingUser ? 'Edit User' : 'Add New User' }}</h3>
        <form @submit.prevent="submitUser">
          <div class="form-group">
            <label for="name">Name</label>
            <input 
              type="text" 
              id="name" 
              v-model="userForm.name"
              required
            >
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              v-model="userForm.email"
              required
              :disabled="editingUser"
            >
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              v-model="userForm.password"
              :required="!editingUser"
              :placeholder="editingUser ? 'Leave blank to keep current password' : ''"
            >
          </div>

          <div class="form-group">
            <label for="role">Role</label>
            <select id="role" v-model="userForm.role" required>
              <option value="user">User</option>
              <option value="team_admin">Team Admin</option>
              <option value="admin">Admin</option>
              <option value="network_admin">Network Admin</option>
            </select>
          </div>

          <div class="form-group">
            <label>Teams</label>
            <div class="teams-selection">
              <div v-for="team in availableTeams" :key="team._id" class="team-checkbox">
                <input 
                  type="checkbox" 
                  :id="'team-' + team._id"
                  :value="team._id"
                  v-model="userForm.teams"
                >
                <label :for="'team-' + team._id">{{ team.name }}</label>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="cancel-btn">
              Cancel
            </button>
            <button type="submit" class="save-btn">
              {{ editingUser ? 'Save Changes' : 'Create User' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../api/axios';  // Import the configured instance

export default {
  name: 'UserManagement',
  data() {
    return {
      users: [],
      showModal: false,
      editingUser: null,
      availableTeams: [],
      currentUser: JSON.parse(localStorage.getItem('user')),
      searchQuery: '',
      userForm: {
        name: '',
        email: '',
        password: '',
        role: 'user',
        teams: []
      }
    }
  },
  methods: {
    showAddUserModal() {
      this.editingUser = null;
      this.userForm = {
        name: '',
        email: '',
        password: '',
        role: 'user',
        teams: []
      };
      this.showModal = true;
    },
    async fetchUsers() {
      try {
        const response = await api.get('/api/users/all');  // Use configured instance
        this.users = response.data;
      } catch (error) {
        console.error('Failed to fetch users:', error);
        alert('Failed to fetch users');
      }
    },
    async fetchTeams() {
      try {
        const response = await api.get('/api/teams');  // Use configured instance
        this.availableTeams = response.data;
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      }
    },
    formatRole(role) {
      return role.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    },
    getRoleBadgeClass(role) {
      const classes = {
        'network_admin': 'role-network-admin',
        'admin': 'role-admin',
        'team_admin': 'role-team-admin',
        'team_member': 'role-team-member'
      };
      return classes[role] || 'role-default';
    },
    editUser(user) {
      this.editingUser = user;
      this.userForm = {
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        teams: user.teams?.map(team => team._id) || []
      };
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.editingUser = null;
      this.userForm = {
        name: '',
        email: '',
        password: '',
        role: 'user',
        teams: []
      };
    },
    async submitUser() {
      try {
        if (this.editingUser) {
          // Update existing user
          const updateData = {
            name: this.userForm.name,
            role: this.userForm.role,
            teams: this.userForm.teams
          };
          if (this.userForm.password) {
            updateData.password = this.userForm.password;
          }
          await api.patch(`/api/users/${this.editingUser._id}`, updateData);  // Use configured instance
        } else {
          // Create new user
          await api.post('/api/users/create', this.userForm);  // Use configured instance
        }
        
        this.closeModal();
        await this.fetchUsers();
      } catch (error) {
        console.error('Failed to save user:', error);
        alert(error.response?.data?.error || 'Failed to save user');
      }
    },
    async confirmDelete(user) {
      if (user._id === this.currentUser?._id) {
        alert('Cannot delete your own account');
        return;
      }
      
      if (!confirm(`Are you sure you want to delete user ${user.name}?`)) {
        return;
      }
      
      try {
        await api.delete(`/api/users/${user._id}`);  // Use configured instance
        
        // Remove user from local state
        this.users = this.users.filter(u => u._id !== user._id);
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert(error.response?.data?.error || 'Failed to delete user');
      }
    }
  },
  async created() {
    // Get current user from Vuex store
    const store = this.$store;
    this.currentUser = store.state.user;
    
    await this.fetchUsers();
    await this.fetchTeams();
  },
  watch: {
    '$store.state.user': {
      handler(newUser) {
        this.currentUser = newUser;
      },
      immediate: true
    }
  },
  computed: {
    filteredUsers() {
      if (!this.searchQuery) return this.users;
      
      const query = this.searchQuery.toLowerCase();
      return this.users.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        this.formatRole(user.role).toLowerCase().includes(query)
      );
    }
  }
}
</script>

<style scoped>
.user-management {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.title {
  font-size: 24px;
  color: #2c3e50;
  margin: 0;
  white-space: nowrap;
}

.btn-add {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.users-list {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.user-row {
  display: grid;
  grid-template-columns: 2fr 3fr 1.5fr 1.5fr;
  padding: 16px;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.user-row:last-child {
  border-bottom: none;
}

.header-row {
  background: #f5f7fa;
  font-weight: 600;
  color: #2c3e50;
}

.user-name {
  font-weight: 500;
}

.user-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit {
  background: #2196F3;
  color: white;
}

.delete {
  background: #f44336;
  color: white;
}

.role-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.role-network-admin {
  background: #E3F2FD;
  color: #1976D2;
}

.role-admin {
  background: #E8F5E9;
  color: #388E3C;
}

.role-team-admin {
  background: #FFF3E0;
  color: #F57C00;
}

.role-team-member {
  background: #F5F5F5;
  color: #616161;
}

.role-default {
  background: #ECEFF1;
  color: #607D8B;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  background: #9e9e9e;
  color: white;
}

.save-btn {
  background: #4CAF50;
  color: white;
}

.cancel-btn, .save-btn {
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}

.user-teams {
  margin-top: 10px;
}

.team-badge {
  display: inline-block;
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  margin: 2px;
}

.team-checkbox {
  margin: 5px 0;
}

.team-checkbox label {
  margin-left: 8px;
  display: inline;
}

.search-bar {
  flex: 1;
  max-width: 400px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #2196F3;
}

.search-input::placeholder {
  color: #999;
}
</style> 