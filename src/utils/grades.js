export function calculateFinalGrade(note1, note2, note3) {
  const values = [note1, note2, note3].map((value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  })

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.round(average * 100) / 100
}
