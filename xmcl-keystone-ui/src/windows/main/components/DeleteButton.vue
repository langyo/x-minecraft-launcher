<template>
  <v-fab-transition>
    <v-btn
      v-if="visible"
      large
      absolute
      fab
      bottom
      color="red"
      @dragover.prevent
      @drop="drop"
    >
      <v-icon>delete</v-icon>
    </v-btn>
  </v-fab-transition>
</template>

<script lang=ts>
import { required } from '/@/util/props'

export default defineComponent({
  props: {
    visible: required<boolean>(Boolean),
    drop: required<(dropEvent: DragEvent) => void>(Function),
  },
})
</script>
