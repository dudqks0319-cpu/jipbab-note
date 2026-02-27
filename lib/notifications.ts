const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_REMINDER_DAYS = [3, 1] as const
const DEFAULT_NOTIFICATION_HOUR = 9

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
  if (dDay === 1) {
    return `${ingredientName} 유통기한이 내일 만료됩니다.`
  }
  return `${ingredientName} 유통기한이 ${dDay}일 후 만료됩니다.`
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
      title: `유통기한 D-${dDay}`,
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
