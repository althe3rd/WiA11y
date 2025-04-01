<template>
  <div class="team-selector">
    <select
      :id="id"
      v-model="localValue"
      @change="onChange"
      :required="required"
      :disabled="disabled"
      :class="selectClass"
    >
      <option v-if="showAllOption" :value="null">{{ allTeamsLabel }}</option>
      <template v-for="team in organizedTeams" :key="team._id">
        <!-- Parent team -->
        <option :value="team._id" class="parent-team">
          {{ team.name }}
        </option>
        <!-- Child teams (recursively) -->
        <template v-if="team.childTeams && team.childTeams.length">
          <option 
            v-for="childTeam in team.childTeams" 
            :key="childTeam._id" 
            :value="childTeam._id" 
            class="child-team level-1"
          >
            ↳ {{ childTeam.name }}
          </option>
          <!-- Nested child teams (level 2) -->
          <template v-for="childTeam in team.childTeams" :key="`sub-${childTeam._id}`">
            <template v-if="childTeam.childTeams && childTeam.childTeams.length">
              <option 
                v-for="grandChildTeam in childTeam.childTeams" 
                :key="grandChildTeam._id" 
                :value="grandChildTeam._id"
                class="child-team level-2"
              >
                ↳↳ {{ grandChildTeam.name }}
              </option>
              <!-- Add more nested levels if needed -->
            </template>
          </template>
        </template>
      </template>
    </select>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'TeamSelector',
  props: {
    id: {
      type: String,
      default: 'teamSelector'
    },
    modelValue: {
      type: [String, Number, null],
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    showAllOption: {
      type: Boolean,
      default: true
    },
    allTeamsLabel: {
      type: String,
      default: 'All Teams'
    },
    selectClass: {
      type: [String, Object],
      default: ''
    }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const store = useStore();
    const localValue = ref(props.modelValue);
    
    // Watch for external value changes
    watch(() => props.modelValue, (newValue) => {
      localValue.value = newValue;
    });
    
    const onChange = () => {
      emit('update:modelValue', localValue.value);
      emit('change', localValue.value);
    };
    
    // Organize teams into a hierarchical structure
    const organizedTeams = computed(() => {
      const allTeams = store.state.teams || [];
      if (!allTeams.length) return [];
      
      // Build a nested hierarchy
      // First, get the top-level teams (teams with no parent)
      const topLevelTeams = allTeams.filter(team => !team.parentTeam);
      
      // Create a map of teams by ID for easy lookup
      const teamsById = allTeams.reduce((acc, team) => {
        acc[team._id] = { ...team, childTeams: [] };
        return acc;
      }, {});
      
      // Build the hierarchy
      allTeams.forEach(team => {
        if (team.parentTeam) {
          const parentId = typeof team.parentTeam === 'object' 
            ? team.parentTeam._id 
            : team.parentTeam;
            
          if (teamsById[parentId]) {
            teamsById[parentId].childTeams.push(teamsById[team._id]);
          }
        }
      });
      
      // Sort all teams alphabetically within their level
      const sortTeams = (teams) => {
        teams.sort((a, b) => a.name.localeCompare(b.name));
        teams.forEach(team => {
          if (team.childTeams && team.childTeams.length) {
            sortTeams(team.childTeams);
          }
        });
        return teams;
      };
      
      // Return the sorted top-level teams with their nested children
      return sortTeams(topLevelTeams.map(team => teamsById[team._id]));
    });
    
    return {
      localValue,
      onChange,
      organizedTeams
    };
  }
};
</script>

<style scoped>
.team-selector select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-background);
  color: var(--text-color);
  font-size: 14px;
  appearance: revert;
}

.team-selector select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(56, 143, 236, 0.1);
}

/* Style options with CSS as much as possible - some browsers have limitations */
.team-selector option {
  padding: 8px;
}

.team-selector option.parent-team {
  font-weight: 500;
}

/* These styles won't work in all browsers but can enhance where supported */
.team-selector option.child-team {
  padding-left: 20px;
}

.team-selector option.level-1 {
  padding-left: 20px;
}

.team-selector option.level-2 {
  padding-left: 40px;
}
</style> 