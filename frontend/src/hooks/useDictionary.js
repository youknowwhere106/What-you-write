import { useQuery } from '@tanstack/react-query'
import { dictionaryAPI } from '@/services/api'

export function useDictionary(word) {
  return useQuery({
    queryKey: ['dictionary', word],
    queryFn: () => dictionaryAPI.lookup(word).then((r) => r.data),
    enabled: !!word && word.length > 1,
    staleTime: 5 * 60_000, // 5 minutes — definitions don't change
    retry: false,
  })
}
