// lib/ukTime.ts - UK Timezone Utilities
// Handles all date/time operations in Europe/London timezone

/**
 * Converts any date to UK timezone and returns formatted string
 * Prevents "Invalid Date" errors by validating input
 */
export function toUKTime(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    
    // Convert to UK timezone string, then parse back
    const ukString = date.toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    // Parse UK format: DD/MM/YYYY, HH:MM:SS
    const [datePart, timePart] = ukString.split(', ')
    const [day, month, year] = datePart.split('/')
    const [hour, minute, second] = timePart.split(':')
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
  } catch (error) {
    console.error('Error converting to UK time:', error)
    return null
  }
}

/**
 * Formats time in UK timezone (e.g., "21:00")
 */
export function formatUKTime(dateString: string | null | undefined): string {
  const date = toUKTime(dateString)
  if (!date) return 'TBC'
  
  try {
    return date.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch (error) {
    return 'TBC'
  }
}

/**
 * Formats date in UK timezone (e.g., "Sat 18 Jan")
 */
export function formatUKDate(dateString: string | null | undefined): string {
  const date = toUKTime(dateString)
  if (!date) return 'TBC'
  
  try {
    return date.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  } catch (error) {
    return 'TBC'
  }
}

/**
 * Gets date label (Tonight/Tomorrow/Day of week)
 */
export function getUKDateLabel(dateString: string | null | undefined): string {
  const date = toUKTime(dateString)
  if (!date) return 'TBC'
  
  try {
    const now = new Date()
    const ukNow = toUKTime(now.toISOString())
    if (!ukNow) return formatUKDate(dateString)
    
    // Compare dates in UK timezone
    const eventDate = date.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })
    const todayDate = ukNow.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })
    
    if (eventDate === todayDate) return 'Tonight'
    
    // Check tomorrow
    const tomorrow = new Date(ukNow)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })
    
    if (eventDate === tomorrowDate) return 'Tomorrow'
    
    return formatUKDate(dateString)
  } catch (error) {
    return formatUKDate(dateString)
  }
}

/**
 * Checks if date is today in UK timezone
 */
export function isUKToday(dateString: string | null | undefined): boolean {
  const date = toUKTime(dateString)
  if (!date) return false
  
  try {
    const now = new Date()
    const ukNow = toUKTime(now.toISOString())
    if (!ukNow) return false
    
    const eventDate = date.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })
    const todayDate = ukNow.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })
    
    return eventDate === todayDate
  } catch (error) {
    return false
  }
}

/**
 * Checks if date is tomorrow in UK timezone
 */
export function isUKTomorrow(dateString: string | null | undefined): boolean {
  const date = toUKTime(dateString)
  if (!date) return false
  
  try {
    const now = new Date()
    const ukNow = toUKTime(now.toISOString())
    if (!ukNow) return false
    
    const tomorrow = new Date(ukNow)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const eventDate = date.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })
    const tomorrowDate = tomorrow.toLocaleDateString('en-GB', { timeZone: 'Europe/London' })
    
    return eventDate === tomorrowDate
  } catch (error) {
    return false
  }
}

/**
 * Checks if date is this weekend in UK timezone
 */
export function isUKWeekend(dateString: string | null | undefined): boolean {
  const date = toUKTime(dateString)
  if (!date) return false
  
  try {
    const now = new Date()
    const ukNow = toUKTime(now.toISOString())
    if (!ukNow) return false
    
    const dayOfWeek = ukNow.getDay() // 0 = Sunday, 6 = Saturday
    
    // Calculate this weekend's Friday
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7
    if (dayOfWeek >= 5) daysUntilFriday = 0 // Already weekend
    
    const friday = new Date(ukNow)
    friday.setDate(ukNow.getDate() + daysUntilFriday)
    friday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(friday)
    sunday.setDate(friday.getDate() + (7 - friday.getDay()))
    sunday.setHours(23, 59, 59, 999)
    
    return date >= friday && date <= sunday
  } catch (error) {
    return false
  }
}

/**
 * Gets UK date string for filtering (YYYY-MM-DD format in UK timezone)
 */
export function getUKDateString(date: Date): string {
  try {
    return date.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) // YYYY-MM-DD format
  } catch (error) {
    return date.toISOString().split('T')[0]
  }
}
