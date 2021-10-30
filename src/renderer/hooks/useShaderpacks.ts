import { computed, reactive } from '@vue/composition-api';
import { useService } from '.';
import { InstanceShaderPacksServiceKey } from '/@shared/services/InstanceShaderPacksService';
import { ResourceServiceKey } from '/@shared/services/ResourceService';

export function useShaderpacks() {
  const { state } = useService(ResourceServiceKey)
  const { state: shaderPackState } = useService(InstanceShaderPacksServiceKey)

  const shaderPacks = computed(() => state.shaderpacks)
  const data = reactive({
    shaderPack: shaderPackState.shaderConfig.shaderPack
  })

  return {
    shaderPacks,
  }
}
