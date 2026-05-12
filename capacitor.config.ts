const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim()
const isProduction = process.env.NODE_ENV === 'production'

const config = {
  appId: 'com.jipbab.note',
  appName: '집밥노트',
  webDir: 'public',
  bundledWebRuntime: false,
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: !isProduction,
        },
      }
    : {}),
}

export default config
