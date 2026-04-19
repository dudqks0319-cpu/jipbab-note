const runtimeAppUrl = process.env.CAPACITOR_SERVER_URL?.trim()
const useRemoteServer = Boolean(runtimeAppUrl)
const cleartext = runtimeAppUrl?.startsWith('http://') ?? false

const config = {
  appId: 'com.jipbab.note',
  appName: '집밥노트',
  webDir: 'public',
  bundledWebRuntime: false,
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
