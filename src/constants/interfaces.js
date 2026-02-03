export const DEFAULT_INTERFACE_TYPE = 'user_new'

export const INTERFACE_OPTIONS = [
  {
    id: 'user_new',
    label: 'Обычный новый',
    apiValue: 'user_new',
    bodyClass: 'interface-user-new',
  },
  {
    id: 'operator',
    label: 'Оперативный дежурный',
    apiValue: 'guard',
    bodyClass: 'interface-operator',
  },
]

export const resolveInterfaceType = (value) => {
  if (value === 'guard') return 'operator'
  if (INTERFACE_OPTIONS.some((item) => item.id === value)) return value
  return DEFAULT_INTERFACE_TYPE
}

export const toApiInterfaceType = (value) => {
  const option = INTERFACE_OPTIONS.find((item) => item.id === value)
  return option ? option.apiValue : DEFAULT_INTERFACE_TYPE
}

export const getInterfaceBodyClass = (value) => {
  const option = INTERFACE_OPTIONS.find((item) => item.id === value)
  return option ? option.bodyClass : 'interface-user-new'
}
