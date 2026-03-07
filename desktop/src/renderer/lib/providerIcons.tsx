import openaiIcon from '../assets/provider-icons/openai.svg'
import claudeIcon from '../assets/provider-icons/claude.svg'
import googleIcon from '../assets/provider-icons/google.svg'
import type { ProviderType } from '../../main/contracts.js'

export const PROVIDER_ICONS: Record<ProviderType, string> = {
  openai: openaiIcon,
  anthropic: claudeIcon,
  google: googleIcon,
}

export function ProviderIcon({
  provider,
  size = 20,
  className = '',
}: {
  provider: ProviderType
  size?: number
  className?: string
}) {
  const src = PROVIDER_ICONS[provider]
  return (
    <img
      src={src}
      alt={provider}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  )
}
