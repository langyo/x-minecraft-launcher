import { FSWatcher, lstat, readdir, readFile, readlink, remove, symlink, unlink, writeFile } from 'fs-extra';
import watch from 'node-watch';
import { join } from 'path';
import { LauncherApp } from '../app/LauncherApp';
import { isSystemError } from '../util/error';
import { ENOENT_ERROR } from '../util/fs';
import InstanceService from './InstanceService';
import ResourceService from './ResourceService';
import { Inject, Singleton, StatefulService, Subscribe } from './Service';
import { Exception } from '/@shared/entities/exception';
import { isPersistedResource, isShaderPackResource } from '/@shared/entities/resource';
import { ResourceDomain } from '/@shared/entities/resource.schema';
import { parseShaderOptions, stringifyShaderOptions } from '/@shared/entities/shaderpack';
import { EditShaderConfigOptions, InstanceShaderPacksService as IInstanceShaderPacksService, InstanceShaderPacksState } from '/@shared/services/InstanceShaderPacksService';

export default class InstanceShaderPacksService extends StatefulService<InstanceShaderPacksState> implements IInstanceShaderPacksService {
  private watcher: FSWatcher | undefined

  constructor(
    app: LauncherApp,
    @Inject(ResourceService) private resourceService: ResourceService,
    @Inject(InstanceService) private instanceService: InstanceService,
  ) {
    super(app)
  }

  createState() {
    return new InstanceShaderPacksState()
  }


  @Subscribe('instanceSelect')
  protected async onInstance(payload: string) {
    this.mount(payload)
  }

  /**
   * Load `optionsshader.txt` file
   */
  async getShaderConfig(instancePath: string) {
    const configFile = join(instancePath, 'optionsshaders.txt')

    const content = await readFile(configFile, 'utf-8').catch((e) => '')
    const options = parseShaderOptions(content)

    return options
  }

  async edit(options: EditShaderConfigOptions): Promise<void> {
    const instancePath = options.instancePath ?? this.state.instance
    const instance = this.instanceService.state.all[instancePath]
    if (!instance) {
      throw new Exception({ type: 'instanceNotFound', instancePath: options.instancePath! })
    }
    const current = instancePath !== this.state.instance
      ? await this.getShaderConfig(instancePath)
      : this.state.shaderConfig

    current.shaderPack = options.shaderPack

    const configFile = join(instancePath, 'optionsshaders.txt')
    await writeFile(configFile, stringifyShaderOptions(current))
  }

  async ensureShaderpacksDirectory(instancePath: string = this.state.instance) {
    const destPath = join(instancePath, 'shaderpacks')
    const srcPath = this.getPath('shaderpacks')
    const stat = await lstat(destPath).catch((e) => {
      if (isSystemError(e) && e.code === ENOENT_ERROR) {
        return
      }
      throw e
    })

    await this.resourceService.whenReady(ResourceDomain.ShaderPacks)
    this.log(`Linking the shaderpacks at domain to ${instancePath}`)
    if (stat) {
      if (stat.isSymbolicLink()) {
        if (await readlink(destPath) === srcPath) {
          this.log(`Skip linking the shaderpacks at domain as it already linked: ${instancePath}`)
          return
        }
        this.log(`Relink the shaderpacks domain: ${instancePath}`)
        await unlink(destPath)
      } else {
        // Import all directory content
        if (stat.isDirectory()) {
          const files = await readdir(destPath)

          this.log(`Import shaderpacks directories while linking: ${instancePath}`)
          await Promise.all(files.map(f => join(destPath, f)).map(async (filePath) => {
            const [resource, icon] = await this.resourceService.parseFile({ path: filePath, type: 'shaderpacks' })
            if (isShaderPackResource(resource)) {
              this.log(`Add shader pack ${filePath}`)
            } else {
              this.warn(`Non shader pack resource added in /shaderpacks directory! ${filePath}`)
            }
            if (!isPersistedResource(resource)) {
              await this.resourceService.importParsedResource({ path: filePath }, resource, icon).catch((e) => {
                this.emit('error', {})
                this.warn(e)
              })
              this.log(`Found new resource in /shaderpacks directory! ${filePath}`)
            }
          }))

          await remove(destPath)
        } else {
          // TODO: handle this case
          throw new Error()
        }
      }
    }

    await symlink(srcPath, destPath, 'dir')
  }

  @Singleton()
  async mount(instancePath: string): Promise<void> {
    if (instancePath === this.state.instance) {
      return
    }

    this.ensureShaderpacksDirectory(instancePath).catch(e => {
      this.emit('error', e)
    })

    // load config
    const config = await this.getShaderConfig(instancePath)
    this.state.instanceShaders({ config, instance: instancePath })

    // watch the options file
    if (this.watcher) {
      this.watcher.close()
    }
    this.watcher = watch(instancePath, (event, filePath) => {
      if (filePath === 'optionsshaders.txt') {
        this.getShaderConfig(instancePath).then(config => {
          this.state.instanceShaders({ config, instance: instancePath })
        })
      }
    })
  }

  @Singleton()
  refresh(force?: boolean): Promise<void> {
    throw new Error('Method not implemented.');
  }
}