<template>
  <tr :class="{'parent-team': team.childTeams?.length, 'child-team': level > 0}">
    <td>
      <div class="team-name" :style="{'padding-left': level * 24 + 'px'}">
        <button 
          v-if="team.childTeams?.length"
          @click="toggleExpand"
          class="expand-btn"
          :class="{ 'expanded': isExpanded }"
        >
          <font-awesome-icon :icon="isExpanded ? 'chevron-down' : 'chevron-right'" />
        </button>
        <span v-else-if="level > 0" class="child-indent">↳</span>
        {{ team.name }}
        <span v-if="team.childTeams?.length" class="badge">
          {{ team.childTeams.length }} sub-team{{ team.childTeams.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </td>
    <td>{{ team.description || '-' }}</td>
    <td>{{ team.members?.length || 0 }}</td>
    <td>{{ team.teamAdmins?.length || 0 }}</td>
    <td class="actions-cell">
      <button 
        @click="editTeam"
        class="action-btn edit-btn"
        title="Edit team"
      >
        <font-awesome-icon icon="edit" />
      </button>
      <button 
        @click="manageMembers"
        class="action-btn members-btn"
        title="Manage members"
      >
        <font-awesome-icon icon="users" />
      </button>
    </td>
  </tr>
  <template v-if="isExpanded && team.childTeams?.length">
    <team-row 
      v-for="childTeam in team.childTeams" 
      :key="childTeam._id" 
      :team="childTeam" 
      :level="level + 1"
      :expanded-teams="expandedTeams"
      @edit="$emit('edit', $event)"
      @manage="$emit('manage', $event)"
      @toggle="$emit('toggle', $event)"
    />
  </template>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'TeamRow',
  props: {
    team: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    },
    expandedTeams: {
      type: Array,
      default: () => []
    }
  },
  emits: ['edit', 'manage', 'toggle'],
  setup(props, { emit }) {
    const isExpanded = computed(() => 
      props.expandedTeams.includes(props.team._id)
    );
    
    const toggleExpand = () => {
      emit('toggle', props.team._id);
    };
    
    const editTeam = () => {
      emit('edit', props.team);
    };
    
    const manageMembers = () => {
      emit('manage', props.team);
    };
    
    return {
      isExpanded,
      toggleExpand,
      editTeam,
      manageMembers
    };
  }
}
</script>

<style scoped>

td {
  padding: 14px;
}

.team-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--primary-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.expand-btn.expanded {
  transform: rotate(0deg);
}

.child-indent {
  color: var(--primary-color);
  margin-right: 4px;
}

.badge {
  background-color: var(--primary-color);
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.edit-btn {
  color: var(--primary-color);
}

.members-btn {
  color: #4CAF50;
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style> 