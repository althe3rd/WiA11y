<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <h3>{{ team ? 'Edit Team' : 'Create Team' }}</h3>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="name">Team Name</label>
          <input 
            type="text" 
            id="name" 
            v-model="formData.name" 
            required
          >
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea 
            id="description" 
            v-model="formData.description" 
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Domains</label>
          <div v-for="(domain, index) in formData.domains" :key="index" class="domain-entry">
            <input 
              type="text" 
              v-model="domain.domain" 
              placeholder="example.com"
            >
            <input 
              type="text" 
              v-model="domain.notes" 
              placeholder="Notes"
            >
            <button 
              type="button" 
              @click="removeDomain(index)" 
              class="remove-btn"
              title="Remove domain"
            >
              <font-awesome-icon icon="trash" />
            </button>
          </div>
          <button type="button" @click="addDomain" class="add-btn">
            <font-awesome-icon icon="plus" /> Add Domain
          </button>
        </div>

        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">
            <font-awesome-icon icon="save" /> Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

export default {
  name: 'TeamModal',
  components: {
    FontAwesomeIcon
  },
  props: {
    team: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const formData = ref({
      name: '',
      description: '',
      domains: []
    });

    const addDomain = () => {
      formData.value.domains.push({ domain: '', notes: '' });
    };

    const removeDomain = (index) => {
      formData.value.domains.splice(index, 1);
    };

    const handleSubmit = () => {
      emit('save', {
        name: formData.value.name,
        description: formData.value.description,
        domains: formData.value.domains.filter(d => d.domain.trim())
      });
    };

    onMounted(() => {
      if (props.team) {
        formData.value = {
          name: props.team.name || '',
          description: props.team.description || '',
          domains: Array.isArray(props.team.domains) 
            ? [...props.team.domains]
            : []
        };
      } else {
        formData.value = {
          name: '',
          description: '',
          domains: []
        };
      }
    });

    return {
      formData,
      addDomain,
      removeDomain,
      handleSubmit
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: var(--card-background);
  padding: 30px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input, textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.domain-entry {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.domain-entry input {
  flex: 1;
}

.remove-btn {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 10px;
  cursor: pointer;
}

.add-btn {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
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
  background: #2196F3;
  color: white;
}

.cancel-btn, .save-btn {
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}
</style> 