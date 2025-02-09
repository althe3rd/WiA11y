<template>
  <div class="user-management">
    <div class="header">
      <h2>User Management</h2>
      <button @click="showAddModal" class="add-user-btn">
        Add User
      </button>
    </div>

    <div class="users-list">
      <div v-for="user in users" :key="user._id" class="user-item">
        <div class="user-info">
          <h3>{{ user.name }}</h3>
          <p>{{ user.email }}</p>
          <span class="role-badge" :class="user.role">{{ formatRole(user.role) }}</span>
          <div class="user-teams" v-if="user.teams && user.teams.length">
            <h4>Teams:</h4>
            <span v-for="team in user.teams" :key="team._id" class="team-badge">
              {{ team.name }}
            </span>
          </div>
          <div class="user-actions">
            <button @click="editUser(user)" class="edit-btn">
              Edit
            </button>
            <button 
              @click="confirmDeleteUser(user)" 
              class="delete-btn"
              :disabled="user._id === currentUserId"
            >
              Delete
            </button>
          </div>
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
import axios from 'axios';

export default {
  name: 'UserManagement',
  data() {
    return {
      users: [],
      showModal: false,
      editingUser: null,
      availableTeams: [],
      currentUserId: JSON.parse(localStorage.getItem('user'))?.id,
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
    showAddModal() {
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
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/users/all', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        this.users = response.data;
      } catch (error) {
        console.error('Failed to fetch users:', error);
        alert('Failed to fetch users');
      }
    },
    async fetchTeams() {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/teams', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
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
        const token = localStorage.getItem('token');
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
          await axios.patch(`http://localhost:3000/api/users/${this.editingUser._id}`, updateData, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } else {
          // Create new user
          await axios.post('http://localhost:3000/api/users/create', this.userForm, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }
        
        this.closeModal();
        await this.fetchUsers();
      } catch (error) {
        console.error('Failed to save user:', error);
        alert(error.response?.data?.error || 'Failed to save user');
      }
    },
    async confirmDeleteUser(user) {
      if (user._id === this.currentUserId) {
        alert('Cannot delete your own account');
        return;
      }
      
      if (!confirm(`Are you sure you want to delete user ${user.name}?`)) {
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/users/${user._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Remove user from local state
        this.users = this.users.filter(u => u._id !== user._id);
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert(error.response?.data?.error || 'Failed to delete user');
      }
    }
  },
  async created() {
    await this.fetchUsers();
    await this.fetchTeams();
  }
}
</script>

<style scoped>
.user-management {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.add-user-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.users-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.user-item {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.user-info h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.user-info p {
  margin: 0;
  color: #666;
}

.role-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-top: 10px;
}

.role-badge.network_admin {
  background-color: #2196F3;
  color: white;
}

.role-badge.admin {
  background-color: #9C27B0;
  color: white;
}

.role-badge.team_admin {
  background-color: #FF9800;
  color: white;
}

.role-badge.user {
  background-color: #4CAF50;
  color: white;
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

.user-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.edit-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.teams-selection {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
}

.team-checkbox {
  margin: 5px 0;
}

.team-checkbox label {
  margin-left: 8px;
  display: inline;
}
</style> 