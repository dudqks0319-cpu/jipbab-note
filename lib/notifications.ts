import { LocalNotifications } from '@capacitor/local-notifications'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_REMINDER_DAYS = [3, 1, 0] as const
const DEFAULT_NOTIFICATION_HOUR = 9
const SCHEDULE_STORAGE_KEY = 'jipbab-note-expiry-notification-jobs'

export type ExpiryReminderDay = (typeof DEFAULT_REMINDER_DAYS)[number]

export type ExpiryNotificationTarget = {
  ingredientId: string
  ingredientName: string
  expiryDate: string | null
}

export type ExpiryNotificationJob = {
  id: string
  ingredientId: string
  ingredientName: string
  dDay: ExpiryReminderDay
  scheduledAt: string
  title: string
  body: string
}

export type ExpiryScheduleOptions = {
  reminderDays?: ExpiryReminderDay[]
  notificationHour?: number
  now?: Date
}

export type NotificationSchedulerAdapter = {
  schedule: (jobs: ExpiryNotificationJob[]) => Promise<void> | void
}

type NativeNotificationPlugin = {
  requestPermissions?: () => Promise<{ display?: string }>
  getPending?: () => Promise<{
    notifications: Array<{ id: number }>
  }>
  cancel?: (payload: {
    notifications: Array<{ id: number }>
  }) => Promise<void>
  schedule?: (payload: {
    notifications: Array<{
      id: number
      title: string
      body: string
      schedule: { at: Date }
      extra?: Record<string, string>
    }>
  }) => Promise<unknown>
}

export type DeviceExpiryNotificationScheduleResult = {
  mode: 'native' | 'browser' | 'local-ledger' | 'server'
  permission: BrowserNotificationPermissionResult | 'native-granted' | 'native-denied'
  jobs: ExpiryNotificationJob[]
}

export type BrowserNotificationPermissionResult =
  | NotificationPermission
  | 'unsupported'

const normalizeHour = (hour: number): number => {
  if (!Number.isFinite(hour)) return DEFAULT_NOTIFICATION_HOUR
  return Math.min(Math.max(Math.floor(hour), 0), 23)
}

const toDateStart = (rawDate: string): Date | null => {
  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  parsed.setHours(0, 0, 0, 0)
  return parsed
}

const createNotificationDate = (
  expiryStart: Date,
  dDay: ExpiryReminderDay,
  hour: number,
): Date => {
  const target = new Date(expiryStart.getTime() - dDay * DAY_MS)
  target.setHours(hour, 0, 0, 0)
  return target
}

const createNotificationBody = (
  ingredientName: string,
  dDay: ExpiryReminderDay,
): string => {
  if (dDay === 0) {
    return `${ingredientName}이 오늘까지예요. 추천 레시피로 소진해볼까요?`
  }
  if (dDay === 1) {
    return `${ingredientName}이 내일까지예요. 오늘 메뉴에 써보세요.`
  }
  return `${ingredientName} 유통기한이 ${dDay}일 남았어요.`
}

export function buildExpiryNotificationJobs(
  target: ExpiryNotificationTarget,
  options: ExpiryScheduleOptions = {},
): ExpiryNotificationJob[] {
  if (!target.expiryDate) return []

  const expiryStart = toDateStart(target.expiryDate)
  if (!expiryStart) return []

  const now = options.now ?? new Date()
  const hour = normalizeHour(options.notificationHour ?? DEFAULT_NOTIFICATION_HOUR)
  const reminderDays = options.reminderDays ?? [...DEFAULT_REMINDER_DAYS]
  const ingredientName = target.ingredientName.trim() || '재료'

  const jobs: ExpiryNotificationJob[] = []

  for (const dDay of reminderDays) {
    const notificationDate = createNotificationDate(expiryStart, dDay, hour)
    if (notificationDate.getTime() <= now.getTime()) {
      continue
    }

    jobs.push({
      id: `expiry-${target.ingredientId}-d${dDay}`,
      ingredientId: target.ingredientId,
      ingredientName,
      dDay,
      scheduledAt: notificationDate.toISOString(),
      title: dDay === 0 ? '유통기한 당일' : `유통기한 D-${dDay}`,
      body: createNotificationBody(ingredientName, dDay),
    })
  }

  return jobs.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  )
}

export function buildExpiryNotificationSchedule(
  targets: ExpiryNotificationTarget[],
  options: ExpiryScheduleOptions = {},
): ExpiryNotificationJob[] {
  return targets
    .flatMap((target) => buildExpiryNotificationJobs(target, options))
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
}

export async function scheduleExpiryNotifications(
  targets: ExpiryNotificationTarget[],
  adapter: NotificationSchedulerAdapter,
  options: ExpiryScheduleOptions = {},
): Promise<ExpiryNotificationJob[]> {
  const jobs = buildExpiryNotificationSchedule(targets, options)
  if (jobs.length === 0) {
    return []
  }

  await adapter.schedule(jobs)
  return jobs
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermissionResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return window.Notification.requestPermission()
}

function persistScheduledJobs(jobs: ExpiryNotificationJob[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify({
    scheduledAt: new Date().toISOString(),
    jobs,
  }))
}

function readPersistedScheduledJobs(): ExpiryNotificationJob[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawPayload = window.localStorage.getItem(SCHEDULE_STORAGE_KEY)
    if (!rawPayload) {
      return []
    }
    const parsed = JSON.parse(rawPayload) as { jobs?: unknown }
    if (!Array.isArray(parsed.jobs)) {
      return []
    }
    return parsed.jobs.filter((job): job is ExpiryNotificationJob => (
      typeof job === 'object' &&
      job !== null &&
      typeof (job as ExpiryNotificationJob).id === 'string' &&
      typeof (job as ExpiryNotificationJob).ingredientId === 'string' &&
      typeof (job as ExpiryNotificationJob).ingredientName === 'string' &&
      typeof (job as ExpiryNotificationJob).scheduledAt === 'string'
    ))
  } catch {
    return []
  }
}

function makeNativeNotificationId(jobId: string): number {
  let hash = 0
  for (let index = 0; index < jobId.length; index += 1) {
    hash = (hash * 31 + jobId.charCodeAt(index)) >>> 0
  }
  return Math.max(1, hash % 2_147_483_647)
}

async function cancelNativeExpiryNotifications(
  nativePlugin: NativeNotificationPlugin,
  jobs: ExpiryNotificationJob[],
) {
  if (!nativePlugin.cancel || jobs.length === 0) {
    return
  }

  const ids = new Set(jobs.map((job) => makeNativeNotificationId(job.id)))
  const pending = nativePlugin.getPending ? await nativePlugin.getPending() : null
  const notifications = pending?.notifications
    ? pending.notifications.filter((item) => ids.has(item.id)).map((item) => ({ id: item.id }))
    : [...ids].map((id) => ({ id }))

  if (notifications.length > 0) {
    await nativePlugin.cancel({ notifications })
  }
}

export async function scheduleNativeNotifications(
  jobs: ExpiryNotificationJob[],
  previousJobs: ExpiryNotificationJob[] = [],
): Promise<'native-granted' | 'native-denied'> {
  const nativePlugin = LocalNotifications as unknown as NativeNotificationPlugin
  const permission = await nativePlugin.requestPermissions?.()
  const displayPermission = permission?.display ?? 'granted'

  if (displayPermission !== 'granted') {
    await cancelNativeExpiryNotifications(nativePlugin, previousJobs)
    persistScheduledJobs([])
    return 'native-denied'
  }

  await cancelNativeExpiryNotifications(nativePlugin, [...previousJobs, ...jobs])

  if (jobs.length > 0 && nativePlugin.schedule) {
    await nativePlugin.schedule({
      notifications: jobs.map((job) => ({
        id: makeNativeNotificationId(job.id),
        title: job.title,
        body: job.body,
        schedule: { at: new Date(job.scheduledAt) },
        extra: {
          ingredientId: job.ingredientId,
          url: `/recipe?expiringIngredient=${encodeURIComponent(job.ingredientName)}`,
        },
      })),
    })
  }

  persistScheduledJobs(jobs)
  return 'native-granted'
}

export async function scheduleDeviceExpiryNotifications(
  targets: ExpiryNotificationTarget[],
  options: ExpiryScheduleOptions = {},
): Promise<DeviceExpiryNotificationScheduleResult> {
  const jobs = buildExpiryNotificationSchedule(targets, options)
  if (typeof window === 'undefined') {
    return { mode: 'server', permission: 'unsupported', jobs }
  }

  const previousJobs = readPersistedScheduledJobs()

  try {
    const permission = await scheduleNativeNotifications(jobs, previousJobs)
    return { mode: 'native', permission, jobs }
  } catch {
    persistScheduledJobs(jobs)
  }

  const browserPermission = await requestBrowserNotificationPermission()
  return {
    mode: browserPermission === 'granted' ? 'browser' : 'local-ledger',
    permission: browserPermission,
    jobs,
  }
}
