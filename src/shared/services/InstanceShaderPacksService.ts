import { ServiceKey, ServiceTemplate, StatefulService } from './Service'

export interface ShaderConfig {
  shaderPack: string
}

export class InstanceShaderPacksState {
  /**
   * mounted instance
   */
  instance = ''

  shaderConfig: ShaderConfig = {
    shaderPack: ''
  }

  instanceShaders(payload: { instance: string; config: ShaderConfig }) {
    this.shaderConfig = payload.config
    this.instance = payload.instance
  }
}

export interface EditShaderConfigOptions extends ShaderConfig {
  /**
   * The instance to edit shader config.
   *
   * By default this will be the selected instance.
   */
   instancePath?: string
}

export interface InstanceShaderPacksService extends StatefulService<InstanceShaderPacksState> {
  /**
   * It will start to watch `shaderpacks` directory and `optionsshaders.txt` under the instance path
   * @param instancePath The instance absolute path
   */
  mount(instancePath: string): Promise<void>

  /**
   * Refresh current mounted shader packs.
   * @param force 
   */
  refresh(force?: boolean): Promise<void>

  edit(config: EditShaderConfigOptions): Promise<void>
}

export const InstanceShaderPacksServiceKey: ServiceKey<InstanceShaderPacksService> = 'InstanceShaderPacksService'
export const InstanceShaderPacksServiceTemplate: ServiceTemplate<InstanceShaderPacksService> = {
  mount: undefined,
  refresh: undefined,
  state: undefined,
  edit: undefined
}
