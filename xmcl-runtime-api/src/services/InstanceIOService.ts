import { InstanceFileCurseforge, InstanceFileModrinth, InstanceFileUrl, InstanceManifest } from '../entities/instance'
import { ServiceKey } from './Service'

export interface InstanceFile {
  path: string
  isDirectory: boolean
  size: number
  createAt: number
  updateAt: number
  sources: Array<'modrinth' | 'curseforge'>
}

export interface ExportInstanceOptions {
  /**
   * The src path of the instance
   */
  src?: string
  /**
   * The dest path of the exported instance
   */
  destinationPath: string
  /**
   * Does this export include the libraries?
   * @default true
   */
  includeLibraries?: boolean
  /**
   * Does this export includes assets?
   * @default true
   */
  includeAssets?: boolean
  /**
   * Does this export includes the minecraft version jar? (like <minecraft>/versions/1.14.4.jar).
   * If this is false, then it will only export with version json.
   * @default true
   */
  includeVersionJar?: boolean
  /**
   * If this is present, it will only exports the file paths in this array.
   * By default this is `undefined`, and it will export everything in the instance.
   */
  files?: string[]
}

export interface InstanceUpdate {
  updates: Array<{
    /**
     * Either or add or update the file
     */
    operation: 'update' | 'add'
    /**
     * The file need to apply update
     */
    file: InstanceFileCurseforge | InstanceFileUrl | InstanceFileModrinth
  }>

  manifest: InstanceManifest
}

/**
 * Provide the abilities to import/export instance from/to modpack
 */
export interface InstanceIOService {
  /**
   * Export current instance as a modpack. Can be either curseforge or normal full Minecraft
   * @param options The export instance options
   */
  exportInstance(options: ExportInstanceOptions): Promise<void>
  /**
   * Scan all the files under the current instance.
   * It will hint if a mod resource is in curseforge
   */
  getInstanceFiles(): Promise<InstanceFile[]>
  /**
   * Import an instance from a game zip file or a game directory. The location root must be the game directory.
   * @param location The zip or directory path
   * @returns The newly created instance path
   */
  importInstance(location: string): Promise<string>
  /**
   * Fetch the instance update and return the difference.
   * If this instance is not a remote hooked instance, this will return
   */
  getInstanceUpdate(path?: string): Promise<InstanceUpdate | undefined>
  /**
   * Apply the instance files update.
   *
   * You can use this function to ensure the files in this instance matched with your files manifest,
   *
   * like the files under
   * - mods
   * - configs
   * - resourcepacks
   * - shaderpacks
   * or any other files
   */
  applyInstanceUpdate(options: {
    /**
     * The instance path
     */
    path: string
    updates: Array<InstanceFileCurseforge | InstanceFileUrl | InstanceFileModrinth>
  }): Promise<void>
}

export const InstanceIOServiceKey: ServiceKey<InstanceIOService> = 'InstanceIOService'
