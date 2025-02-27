import { AppManifest, InstalledAppManifest } from '@xmcl/runtime-api'
import { ensureDir, unlink, writeFile } from 'fs-extra'
import generateIco from 'icon-gen/dist/lib/ico'
import { join } from 'path'
import { URL } from 'url'
import LauncherApp from '../LauncherApp'
import { downloadIcon, resolveIcon } from '../utils'

export async function removeShortcut(outputDir: string, man: InstalledAppManifest) {
  let outputPath = join(outputDir, `${man.name}.lnk`)
  await unlink(outputPath).catch(() => { })
  outputPath = join(outputDir, `${man.name}.url`)
  await unlink(outputPath).catch(() => { })
}

export async function createLinkWin32(app: LauncherApp, exePath: string, outputDir: string, man: InstalledAppManifest, globalShortcut: boolean): Promise<void> {
  const urlContent =
  `[InternetShortcut]
  URL=xmcl://launcher/app?url=${man.url}
  WorkingDirectory=.
  IconIndex=0
  IconFile=${man.iconPath}`
  await writeFile(join(outputDir, `${man.name}.url`), urlContent)
}

export function createShortcutWin32(app: LauncherApp, exePath: string, outputDir: string, man: InstalledAppManifest, globalShortcut: boolean): boolean {
  const windowModes = {
    normal: 1,
    maximized: 3,
    minimized: 7,
  }

  const filePath = exePath
  let icon = man.iconPath
  let args = `--url=${man.url}`
  if (globalShortcut) {
    args += ' --global'
  }
  const description = man.description
  const cwd = ''
  // const windowMode = windowModes.normal.toString()
  // const hotkey = ''
  const outputPath = join(outputDir, `${man.name}.lnk`)

  if (!icon) {
    if (
      filePath.endsWith('.dll') ||
      filePath.endsWith('.exe')
    ) {
      icon = filePath + ',0'
    } else {
      icon = filePath
    }
  }

  const options = {
    target: exePath,
    args,
    description,
    cwd,
    icon,
    iconIndex: 0,
  }

  return app.createShortcut(outputPath, options)
}

export async function installWin32(url: string, appDir: string, man: AppManifest): Promise<InstalledAppManifest> {
  const processIcons = async () => {
    if (man.icons) {
      const resolvedIcons = man.icons.map(resolveIcon)
      const icoPath = join(appDir, 'app.ico')

      const ico = resolvedIcons.find(i => i.type === 'ico')
      if (ico) {
        // if has ico, we just use it
        await downloadIcon(new URL(ico.src, url).toString(), icoPath)
        return icoPath
      }

      // TODO: since svg use sharp which is too large. we skip svg for now
      // const svg = resolvedIcons.find(i => i.type === 'svg')
      // if (svg) {
      //   const svgPath = join(appDir, 'app.svg')
      //   // try to use svg to generate icon
      //   await downloadIcon(new URL(svg.src, url).toString(), svgPath)
      //   await generateIco(svgPath, appDir, {
      //     ico: {
      //       name: 'app.ico',
      //     },
      //     report: true,
      //   })
      //   return icoPath
      // }

      const pngs = resolvedIcons.filter(i => i.type === 'png')
      if (pngs.length > 0) {
        // try to use png to generate icon
        const anyIconDir = join(appDir, 'icons')
        await ensureDir(anyIconDir)
        // download all png
        const fileInfos = await Promise.all(pngs.map(async (f) => {
          const filePath = join(anyIconDir, `${f.allSizes[0]}.png`)
          await downloadIcon(new URL(f.src, url).toString(), join(anyIconDir, `${f.allSizes[0]}.png`))
          return { filePath, size: f.allSizes[0] }
        }))

        const result = await generateIco(fileInfos, appDir, console as any, {
          name: 'app.ico',
        }).catch((e) => [])

        if (result.length === 0) {
          const maxSizePng = pngs.sort((a, b) => b.allSizes[0] - a.allSizes[0]).map(f => join(anyIconDir, `${f.allSizes[0]}.png`))[0]
          return maxSizePng
        }

        return icoPath
      }
    }
  }
  const iconPath = await processIcons()

  return {
    name: man.name ?? '',
    description: man.description ?? '',
    icons: man.icons ?? [],
    screenshots: man.screenshots ?? [],

    url,
    iconPath: iconPath ?? '',
    minHeight: man.minHeight ?? 600,
    minWidth: man.minWidth ?? 800,
    ratio: man.ratio ?? false,
    background_color: man.background_color ?? '',
    display: man.display ?? 'frameless',
    vibrancy: false,
  }
}
