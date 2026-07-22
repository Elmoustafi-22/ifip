/**
 * @deprecated This BullMQ queue has been removed.
 *
 * Emails are now sent directly via the emailService functions called
 * from notificationBroadcast.ts. This eliminated the constant Redis
 * polling (bzpopmin) that was exhausting the Upstash free-tier command
 * quota within days.
 *
 * This file can be safely deleted.
 */
