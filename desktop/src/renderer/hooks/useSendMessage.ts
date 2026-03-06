import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SendMessageInput, SendMessageOutput } from '../../main/contracts'

const api = window.sapOpsDesktop

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation<SendMessageOutput, Error, SendMessageInput>({
    mutationFn: (input) => api.sendMessage(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
