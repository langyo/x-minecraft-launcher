import { LibraryInfo, MinecraftFolder, Version } from '@xmcl/core'
import { DownloadTask, installResolvedLibrariesTask } from '@xmcl/installer'
import { ExternalAuthSkinService as IExternalAuthSkinService, ExternalAuthSkinServiceKey, IssueReport } from '@xmcl/runtime-api'
import { ensureFile, readJson, writeFile } from 'fs-extra'
import { join } from 'path'
import LauncherApp from '../app/LauncherApp'
import { validateSha256 } from '../util/fs'
import { DiagnoseService } from './DiagnoseService'
import { ResourceService } from './ResourceService'
import { AbstractService, Inject, Singleton } from './Service'
import { UserService } from './UserService'

const AUTHLIB_ORG_NAME = 'org.to2mbn:authlibinjector'

/**
 * Majorly support the third party skin using authlib injector
 */
export class ExternalAuthSkinService extends AbstractService implements IExternalAuthSkinService {
  constructor(
    app: LauncherApp,
    @Inject(DiagnoseService) private diagnoseService: DiagnoseService,
    @Inject(UserService) private userService: UserService,
    @Inject(ResourceService) private resourceService: ResourceService,
  ) {
    super(app, ExternalAuthSkinServiceKey)
    diagnoseService.registerMatchedFix(['missingAuthlibInjector'],
      () => this.installAuthlibInjection(),
      this.diagnoseAuthlibInjector.bind(this))
    this.storeManager.subscribeAll(['userGameProfileSelect', 'userProfileUpdate', 'userSnapshot'], async () => {
      const report: Partial<IssueReport> = {}
      await this.diagnoseAuthlibInjector(report)
      this.diagnoseService.report(report)
    })
  }

  async downloadCustomSkinLoader(type: 'forge' | 'fabric' = 'forge') {
    const url = type === 'forge'
      ? 'https://github.com/xfl03/MCCustomSkinLoader/releases/download/14.12/CustomSkinLoader_Forge-14.12.jar'
      : 'https://github.com/xfl03/MCCustomSkinLoader/releases/download/14.12/CustomSkinLoader_Fabric-14.12.jar'
    const destination = type === 'forge'
      ? join(this.app.temporaryPath, 'CustomSkinLoader_Forge-14.12.jar')
      : join(this.app.temporaryPath, 'CustomSkinLoader_Fabric-14.12.jar')
    await ensureFile(destination)
    await this.submit(new DownloadTask({
      url,
      destination,
    }).setName('downloadCustomSkinLoader'))
    return this.resourceService.importResource({
      path: destination,
      type: 'mods',
    })
  }

  async installAuthlibInjection(): Promise<string> {
    const jsonPath = this.getPath('authlib-injection.json')
    const root = this.getPath()
    const mc = new MinecraftFolder(root)

    const download = async (content: any) => {
      const name = `${AUTHLIB_ORG_NAME}:${content.version}`
      const info = LibraryInfo.resolve(name)
      const authlib: Version.Library = {
        name,
        downloads: {
          artifact: {
            sha1: '',
            size: -1,
            path: info.path,
            url: content.download_url,
          },
        },
      }
      await this.submit(installResolvedLibrariesTask(Version.resolveLibraries([authlib]), root).setName('installAuthlibInjector'))
      return mc.getLibraryByPath(info.path)
    }

    const content = await readJson(jsonPath).catch(() => undefined)
    let path: string
    if (!content) {
      const body = await this.networkManager.request('https://authlib-injector.yushi.moe/artifact/latest.json').json()
      await writeFile(jsonPath, JSON.stringify(body))
      path = await download(body)
    } else {
      const info = LibraryInfo.resolve(`${AUTHLIB_ORG_NAME}:${content.version}`)
      const libPath = mc.getLibraryByPath(info.path)
      if (await validateSha256(libPath, content.checksums.sha256)) {
        path = libPath
      } else {
        path = await download(content)
      }
    }

    const report: Partial<IssueReport> = {}
    this.diagnoseAuthlibInjector(report)
    this.diagnoseService.report(report)

    return path
  }

  @Singleton()
  async diagnoseAuthlibInjector(report: Partial<IssueReport>) {
    this.up('diagnose')
    const doesAuthlibInjectionExisted = async () => {
      const jsonPath = this.getPath('authlib-injection.json')
      const content = await readJson(jsonPath).catch(() => undefined)
      if (!content) return false
      const info = LibraryInfo.resolve(`${AUTHLIB_ORG_NAME}:${content.version}`)
      const mc = new MinecraftFolder(this.getPath())
      const libPath = mc.getLibraryByPath(info.path)
      return validateSha256(libPath, content.checksums.sha256)
    }
    try {
      const user = this.userService.state.users[this.userService.state.selectedUser.id]

      if (user) {
        this.log(`Diagnose user ${user.username}`)
        const tree: Pick<IssueReport, 'missingAuthlibInjector'> = {
          missingAuthlibInjector: [],
        }

        if (this.userService.state.isThirdPartyAuthentication) {
          if (!await doesAuthlibInjectionExisted()) {
            tree.missingAuthlibInjector.push({})
          }
        }
        Object.assign(report, tree)
      }
    } finally {
      this.down('diagnose')
    }
  }
}
