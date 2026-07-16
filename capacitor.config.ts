const runtimeAppUrl = process.env.CAPACITOR_SERVER_URL?.trim()
const useRemoteServer = Boolean(
  runtimeAppUrl?.startsWith('https://') || runtimeAppUrl?.startsWith('http://localhost'),
)
const cleartext = runtimeAppUrl?.startsWith('http://') ?? false
function hostFromUrl(value: string | undefined) {
  if (!value) {
    return null
  }
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

const oauthNavigationHosts = [
  'jipbab-note-app.vercel.app',
  hostFromUrl(runtimeAppUrl),
  process.env.CAPACITOR_CLOUDFLARE_HOST?.trim(),
  'xqelabiwtjntwrjqcteo.supabase.co',
].filter((host): host is string => Boolean(host))

const config = {
  appId: 'com.jipbab.note',
  appName: '집밥노트',
  webDir: 'capacitor-shell',
  bundledWebRuntime: false,
  packageClassList: [
    'JipbabGemmaPlugin',
    'JipbabOAuthPlugin',
    'CapApp_SPM.JipbabGemmaPlugin',
    'CapApp_SPM.JipbabOAuthPlugin',
  ],
  ...(useRemoteServer
    ? {
        server: {
          url: runtimeAppUrl,
          cleartext,
          allowNavigation: Array.from(new Set(oauthNavigationHosts)),
        },
      }
    : {}),
}

export default config
