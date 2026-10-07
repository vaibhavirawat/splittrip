// Lightweight reminders: browser notifications while the app is open + shareable reminder messages.
export async function notifyOverdue(lines: string[]) {
  if (!lines.length || !('Notification' in window)) return
  if (Notification.permission === 'default') await Notification.requestPermission()
  if (Notification.permission === 'granted') new Notification('SplitTrip: overdue payments', { body: lines.join('\n') })
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`
