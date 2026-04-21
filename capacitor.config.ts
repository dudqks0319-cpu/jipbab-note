const runtimeAppUrl = process.env.CAPACITOR_SERVER_URL?.trim()
const useRemoteServer = Boolean(runtimeAppUrl?.startsWith("http://localhost"))
const cleartext = runtimeAppUrl?.startsWith('http://') ?? false

const config = {
  appId: 'com.jipbab.note',
  appName: '집밥노트',
  webDir: 'public',
  bundledWebRuntime: false,
  packageClassList: [
    'JipbabGemmaPlugin',
    'CapApp_SPM.JipbabGemmaPlugin',
  ],
  ...(useRemoteServer
    ? {
        server: {
          url: runtimeAppUrl,
          cleartext,
        },
      }
    : {}),
}

export default config
