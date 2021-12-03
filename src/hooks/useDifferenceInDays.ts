import { useMemo } from 'react'

export const useDifferenceInDays = (date1?: Date, date2?: Date): number => {
  return useMemo(() => {
    if (!date1 || !date2) {
      return 0
    }
    const oneDay = 24 * 60 * 60 * 1000 // hours*minutes*seconds*milliseconds

    return Math.round(Math.abs(((date1 as any) - (date2 as any)) / oneDay))
  }, [date1?.getTime(), date2?.getTime()].sort())
}
