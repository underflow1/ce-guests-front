let nextEntryId = 1

export const createEntry = ({ name, responsible = '', time }) => ({
  id: String(nextEntryId++),
  name,
  responsible,
  time,
})

export const cloneEntries = (entries) =>
  entries.map((entry) =>
    createEntry({
      name: entry.name,
      responsible: entry.responsible,
      time: entry.time,
    }),
  )
