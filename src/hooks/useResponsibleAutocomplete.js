import { useState, useEffect, useRef } from 'react'
import { getResponsibleAutocomplete } from '../utils/api'

const useResponsibleAutocomplete = (value) => {
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const currentPrefixRef = useRef('')
  const allSuggestionsRef = useRef([]) // Храним все варианты для текущего префикса

  useEffect(() => {
    // Получаем первые 3 символа
    const prefix = value.slice(0, 3).toLowerCase()
    
    // Если меньше 3 символов, очищаем результаты
    if (value.length < 3) {
      setSuggestions([])
      setShowDropdown(false)
      currentPrefixRef.current = ''
      allSuggestionsRef.current = []
      return
    }

    // Если первые 3 символа изменились, делаем новый запрос (всегда свежие данные)
    if (prefix !== currentPrefixRef.current) {
      currentPrefixRef.current = prefix
      
      // Всегда запрашиваем свежие данные
      setIsLoading(true)
      getResponsibleAutocomplete(value.slice(0, 3))
        .then((response) => {
          const newSuggestions = response.suggestions || []
          allSuggestionsRef.current = newSuggestions
          // Фильтруем по текущему значению (на случай если пользователь уже дописал)
          const filtered = newSuggestions.filter((suggestion) =>
            suggestion.toLowerCase().startsWith(value.toLowerCase())
          )
          setSuggestions(filtered)
          // Не показываем дропдаун, если значение точно совпадает с одним из вариантов
          const exactMatch = newSuggestions.some(
            (suggestion) => suggestion.toLowerCase() === value.toLowerCase()
          )
          setShowDropdown(filtered.length > 0 && !exactMatch)
        })
        .catch((error) => {
          console.error('Ошибка при получении автокомплита:', error)
          setSuggestions([])
          setShowDropdown(false)
          allSuggestionsRef.current = []
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      // Если первые 3 символа не изменились, фильтруем уже загруженные варианты
      const filtered = allSuggestionsRef.current.filter((suggestion) =>
        suggestion.toLowerCase().startsWith(value.toLowerCase())
      )
      setSuggestions(filtered)
      // Не показываем дропдаун, если значение точно совпадает с одним из вариантов
      const exactMatch = allSuggestionsRef.current.some(
        (suggestion) => suggestion.toLowerCase() === value.toLowerCase()
      )
      setShowDropdown(filtered.length > 0 && !exactMatch)
    }
  }, [value])

  return {
    suggestions,
    isLoading,
    showDropdown,
    setShowDropdown,
  }
}

export default useResponsibleAutocomplete
