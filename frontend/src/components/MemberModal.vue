<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <h3>Manage Team Members</h3>
      
      <div class="search-section">
        <h4>Add Members</h4>
        <input 
          type="text" 
          v-model="searchQuery" 
          @input="searchUsers"
          placeholder="Search users by name or email"
          class="search-input"
        >
        <div v-if="searchResults.length" class="search-results">
          <div 
            v-for="user in searchResults" 
            :key="user._id"
            class="search-result-item"
          >
            <div class="user-info">
              <span class="name">{{ user.name }}</span>
              <span class="email">({{ user.email }})</span>
            </div>
            <div class="actions">
              <button 
                @click="addMember(user)"
                :disabled="isUserInTeam(user._id)"
                class="add-btn"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="current-members">
        <div class="admins-section">
          <h4>Team Admins</h4>
          <div v-for="admin in team.teamAdmins" :key="admin._id" class="member-item">
            <div class="user-info">
              <span class="name">{{ admin.name }}</span>
              <span class="email">({{ admin.email }})</span>
            </div>
            <button 
              @click="removeAdmin(admin._id)"
              class="remove-btn"
              :disabled="isCreator(admin._id)"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="members-section">
          <h4>Team Members</h4>
          <div v-for="member in team.members" :key="member._id" class="member-item">
            <div class="user-info">
              <span class="name">{{ member.name }}</span>
              <span class="email">({{ member.email }})</span>
            </div>
            <div class="actions">
              <button 
                @click="promoteToAdmin(member._id)"
                class="promote-btn"
              >
                Make Admin
              </button>
              <button 
                @click="removeMember(member._id)"
                class="remove-btn"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="$emit('close')" class="cancel-btn">Close</button>
        <button @click="saveChanges" class="save-btn">Save Changes</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import api from '../api/axios';

export default {
  name: 'MemberModal',
  props: {
    team: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const store = useStore();
    const searchQuery = ref('');
    const searchResults = ref([]);
    const memberUpdates = ref({
      addAdmins: [],
      removeAdmins: [],
      addMembers: [],
      removeMembers: []
    });

    const isUserInTeam = (userId) => {
      const members = props.team.members || [];
      const admins = props.team.teamAdmins || [];
      return members.some(m => m._id === userId) || 
             admins.some(a => a._id === userId);
    };

    const isCreator = (userId) => {
      return userId === props.team.createdBy;
    };

    const searchUsers = async () => {
      if (searchQuery.value.length < 2) {
        searchResults.value = [];
        return;
      }

      try {
        const results = await store.dispatch('searchUsers', searchQuery.value);
        searchResults.value = results.filter(user => 
          !isUserInTeam(user._id)
        );
      } catch (error) {
        console.error('Failed to search users:', error);
      }
    };

    const addMember = (user) => {
      memberUpdates.value.addMembers.push(user._id);
      
      if (!props.team.members) {
        props.team.members = [];
      }
      props.team.members.push(user);
      
      searchResults.value = searchResults.value.filter(u => u._id !== user._id);
      
      searchQuery.value = '';
    };

    const removeMember = (userId) => {
      memberUpdates.value.removeMembers.push(userId);
      // Remove from UI
      const memberIndex = props.team.members.findIndex(m => m._id === userId);
      if (memberIndex !== -1) {
        props.team.members.splice(memberIndex, 1);
      }
    };

    const promoteToAdmin = (userId) => {
      memberUpdates.value.addAdmins.push(userId);
      memberUpdates.value.removeMembers.push(userId);
      
      // Find the member and move them to admins
      const memberIndex = props.team.members.findIndex(m => m._id === userId);
      if (memberIndex !== -1) {
        const member = props.team.members[memberIndex];
        props.team.members.splice(memberIndex, 1);
        if (!props.team.teamAdmins) {
          props.team.teamAdmins = [];
        }
        props.team.teamAdmins.push(member);
      }
    };

    const removeAdmin = (userId) => {
      if (!isCreator(userId)) {
        memberUpdates.value.removeAdmins.push(userId);
        // Remove from UI
        const adminIndex = props.team.teamAdmins.findIndex(a => a._id === userId);
        if (adminIndex !== -1) {
          props.team.teamAdmins.splice(adminIndex, 1);
        }
      }
    };

    const saveChanges = async () => {
      try {
        // Remove any duplicate IDs from the updates
        const updates = {
          addAdmins: [...new Set(memberUpdates.value.addAdmins)],
          removeAdmins: [...new Set(memberUpdates.value.removeAdmins)],
          addMembers: [...new Set(memberUpdates.value.addMembers)],
          removeMembers: [...new Set(memberUpdates.value.removeMembers)]
        };
        
        // Only include arrays that have items
        const filteredUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, arr]) => arr.length > 0)
        );
        
        emit('save', filteredUpdates);
      } catch (error) {
        console.error('Error saving member updates:', error);
      }
    };

    return {
      searchQuery,
      searchResults,
      isUserInTeam,
      isCreator,
      searchUsers,
      addMember,
      removeMember,
      promoteToAdmin,
      removeAdmin,
      saveChanges
    };
  }
};
</script>

<style scoped>
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
  background: var(--card-background);
  padding: 30px;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.search-section {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-bottom: 10px;
}

.search-results {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  padding: 10px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-item {
  padding: 10px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

.email {
  color: #666;
  font-size: 0.9em;
}

.actions {
  display: flex;
  gap: 10px;
}

button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-btn {
  background-color: #4CAF50;
  color: white;
}

.remove-btn {
  background-color: #f44336;
  color: white;
}

.promote-btn {
  background-color: #2196F3;
  color: white;
}

.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn {
  background-color: #9e9e9e;
  color: white;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
}

.current-members {
  margin: 20px 0;
}

.admins-section, .members-section {
  margin-bottom: 20px;
}

h4 {
  margin-bottom: 10px;
  color: var(--text-color);
}
</style> 