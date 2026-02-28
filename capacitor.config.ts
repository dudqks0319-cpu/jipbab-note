const liveReloadUrl = process.env.CAPACITOR_SERVER_URL?.trim()

const config = {
  appId: 'com.jipbab.note',
  appName: 'jipbab-note',
  webDir: 'public',
  bundledWebRuntime: false,
  ...(liveReloadUrl
    ? {
        server: {
          url: liveReloadUrl,
          cleartext: true,
        },
      }
    : {}),
}

export default config
