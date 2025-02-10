<template>
  <div class="user-management">
    <h2>User Management</h2>
    <div class="user-list">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Teams</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user._id">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>
              <select 
                v-model="user.role" 
                @change="updateUserRole(user._id, user.role)"
                :disabled="user._id === currentUser._id"
              >
                <option value="team_member">Team Member</option>
                <option value="team_admin">Team Admin</option>
                <option value="admin">Admin</option>
                <option v-if="isNetworkAdmin" value="network_admin">Network Admin</option>
              </select>
            </td>
            <td>{{ user.teams?.length || 0 }} teams</td>
            <td>{{ formatDate(user.lastLogin) }}</td>
            <td>
              <button 
                @click="viewUserDetails(user)"
                class="view-btn"
              >
                View Details
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import api from '../api/axios';

export default {
  name: 'UserManagement',
  setup() {
    const store = useStore();
    const users = ref([]);
    const currentUser = computed(() => store.state.user);
    const isNetworkAdmin = computed(() => store.getters.isNetworkAdmin);

    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/api/users/all');
        users.value = data;
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    const updateUserRole = async (userId, newRole) => {
      try {
        await api.patch(`/api/users/promote/${userId}`, 
          { role: newRole }
        );
      } catch (error) {
        console.error('Failed to update user role:', error);
      }
    };

    const formatDate = (date) => {
      if (!date) return 'Never';
      return new Date(date).toLocaleString();
    };

    onMounted(fetchUsers);

    return {
      users,
      currentUser,
      isNetworkAdmin,
      updateUserRole,
      formatDate,
      viewUserDetails: (user) => {
        console.log('View user details:', user);
        // TODO: Implement user details view
      }
    };
  }
};
</script>

<style scoped>
.user-management {
  padding: 40px;
  padding-top: 60px;
  max-width: 1200px;
  margin: 0 auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background-color: #f5f5f5;
  font-weight: 600;
}

select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.view-btn {
  padding: 4px 8px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.view-btn:hover {
  background-color: #1976D2;
}
</style> 