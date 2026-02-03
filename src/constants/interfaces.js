export const DEFAULT_INTERFACE_TYPE = 'user'

export const INTERFACE_OPTIONS = [
  {
    id: 'user',
    label: 'Пользователь',
    apiValue: 'user',
    bodyClass: 'interface-user',
  },
  {
    id: 'duty_officer',
    label: 'Оперативный дежурный',
    apiValue: 'duty_officer',
    bodyClass: 'interface-duty-officer',
  },
]

export const resolveInterfaceType = (value) => {
  if (INTERFACE_OPTIONS.some((item) => item.id === value)) return value
  return DEFAULT_INTERFACE_TYPE
}

export const toApiInterfaceType = (value) => {
  const option = INTERFACE_OPTIONS.find((item) => item.id === value)
  return option ? option.apiValue : DEFAULT_INTERFACE_TYPE
}

export const getInterfaceBodyClass = (value) => {
  const option = INTERFACE_OPTIONS.find((item) => item.id === value)
  return option ? option.bodyClass : 'interface-user'
}
