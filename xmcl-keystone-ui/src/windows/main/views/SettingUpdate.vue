<template>
  <v-list
    three-line
    subheader
    style="background: transparent"
    class="flex-grow"
  >
    <v-subheader v-if="!disableUpdate">
      {{ $t("setting.update") }}
    </v-subheader>
    <v-list-item v-if="!disableUpdate">
      <v-list-item-action class="self-center">
        <v-btn
          icon
          :loading="checkingUpdate"
          @click="checkUpdate"
        >
          <v-icon>refresh</v-icon>
        </v-btn>
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>
          {{
            $t("setting.latestVersion")
          }}
        </v-list-item-title>
        <v-list-item-subtitle>
          v{{ version }}
          {{
            hasNewUpdate && updateInfo ? `-> ${updateInfo.name}` : ""
          }}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action class="self-center">
        <v-btn
          :loading="checkingUpdate || installing"
          :disabled="updateStatus === 'none'"
          :color="updateStatus !== 'none' ? 'primary' : ''"
          :text="updateStatus === 'none'"
          @click="showUpdateInfo()"
        >
          {{
            updateStatus === "none"
              ? $t("setting.alreadyLatest")
              : updateStatus === "pending"
                ? $t("setting.updateToThisVersion")
                : $t("setting.installAndQuit")
          }}
        </v-btn>
      </v-list-item-action>
    </v-list-item>
    <!-- <v-list-item avatar>
            <v-list-item-action>
              <v-checkbox v-model="autoInstallOnAppQuit" />
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ $t('setting.autoInstallOnAppQuit') }}</v-list-item-title>
              <v-list-item-subtitle>{{ $t('setting.autoInstallOnAppQuitDescription') }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item avatar>
            <v-list-item-action>
              <v-checkbox
                v-model="autoDownload"

              />
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ $t('setting.autoDownload') }}</v-list-item-title>
              <v-list-item-subtitle>{{ $t('setting.autoDownloadDescription') }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item avatar>
            <v-list-item-action>
              <v-checkbox v-model="allowPrerelease" />
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ $t('setting.allowPrerelease') }}</v-list-item-title>
              <v-list-item-subtitle>{{ $t('setting.allowPrereleaseDescription') }}</v-list-item-subtitle>
            </v-list-item-content>
        </v-list-item>-->
  </v-list>
</template>
<script lang="ts" setup>
import { BaseServiceKey } from '@xmcl/runtime-api'
import { useDialog } from '../composables/dialog'
import { useLauncherVersion, useUpdateSettings } from '../composables/setting'
import { useServiceBusy } from '/@/composables'

const { show: showUpdateInfo } = useDialog('update-info')
const disableUpdate = false // state.env !== 'raw'
const { updateInfo, updateStatus, checkUpdate, checkingUpdate, downloadingUpdate } = useUpdateSettings()
const { version, build } = useLauncherVersion()
const hasNewUpdate = computed(() => updateInfo.value?.name !== version.value)
const installing = useServiceBusy(BaseServiceKey, 'quitAndInstall')

</script>
