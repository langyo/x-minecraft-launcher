import { ResolvedLibrary, Version } from '@xmcl/core'
import { LauncherAppPlugin } from '~/app'
import { kSettings } from '~/settings'
import { VersionService } from '~/version'

export const pluginNativeReplacer: LauncherAppPlugin = async (app) => {
  const settings = await app.registry.get(kSettings)
  app.registry.get(VersionService).then(serv => {
    serv.registerResolver(async (version) => {
      if (!settings.replaceNatives) {
        return
      }
      const mcVersion = version.minecraftVersion.split('.')
      const minor = parseInt(mcVersion[1])

      let libraries = version.libraries
      if (minor >= 19) {
        if (settings.replaceNatives === 'legacy-only') {
          return
        }
        libraries = libraries.filter((lib) =>
          !(lib.groupId === 'org.lwjgl' &&
            lib.classifier?.startsWith('natives') &&
            (lib.artifactId === 'lwjgl-glfw' || lib.artifactId === 'lwjgl-openal')
          ))
      }

      const natives: Record<string, Record<string, Version.Library | null>> = (await import('./natives.json')).default
      const archMapping: Record<string, 'loongarch64' | 'arm32' | 'x86_64' | undefined> = {
        loong64: 'loongarch64',
        arm: 'arm32',
        x64: 'x86_64',
      }
      let arch = archMapping[app.platform.arch] ?? app.platform.arch
      if (arch === 'loongarch64' && app.platform.osRelease.localeCompare('5.19') < 0) {
        arch += '_ow'
      }
      const platformArch = `${app.platform.os}-${arch}`
      const replacement = natives[platformArch]
      if (!replacement) {
        return
      }
      const replaced: ResolvedLibrary[] = []
      for (const original of libraries) {
        const candidate = replacement[original.isNative ? original.name + ':natives' : original.name]
        const resolved = candidate ? Version.resolveLibrary(candidate, app.platform as any) : undefined
        replaced.push(resolved || original)
      }
      version.libraries = replaced
    })
  })
}
