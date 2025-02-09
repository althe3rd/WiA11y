<template>
  <div class="users">
    <UserManagement v-if="isNetworkAdmin" />
    <div v-else class="unauthorized">
      <h2>Unauthorized</h2>
      <p>You don't have permission to view this page.</p>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import UserManagement from '@/components/UserManagement.vue';

export default {
  name: 'Users',
  components: {
    UserManagement
  },
  computed: {
    ...mapGetters(['isNetworkAdmin'])
  }
}
</script>

<style scoped>
.users {
  padding: 40px;
  padding-top: 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.unauthorized {
  text-align: center;
  color: #666;
  padding: 40px;
}
</style> 