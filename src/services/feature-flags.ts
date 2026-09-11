/**
 * Interface for feature flag providers.
 * Allows different implementations (env-based, remote config, etc.)
 */
export interface IFeatureFlagProvider {
  /**
   * Check if a feature is enabled.
   * @param flagName - The name of the feature flag
   * @returns true if the feature is enabled, false otherwise
   */
  isEnabled(flagName: string): boolean

  /**
   * Get a numeric value for percentage-based rollouts.
   * @param flagName - The name of the feature flag
   * @returns A number between 0-100, or undefined if not set
   */
  getRolloutPercentage(flagName: string): number | undefined
}

/**
 * Environment-driven feature flag provider.
 * Reads flags from process.env with the prefix FEATURE_FLAG_
 *
 * @example
 * // Set environment variable: FEATURE_FLAG_ENHANCED_PRIORITY=true
 * const flags = new EnvFeatureFlagProvider()
 * const enabled = flags.isEnabled('ENHANCED_PRIORITY') // returns true
 *
 * @example
 * // Percentage-based rollout: FEATURE_FLAG_NEW_UI_PERCENT=25
 * const flags = new EnvFeatureFlagProvider()
 * const percent = flags.getRolloutPercentage('NEW_UI') // returns 25
 */
export class EnvFeatureFlagProvider implements IFeatureFlagProvider {
  private readonly prefix = 'FEATURE_FLAG_'
  private readonly percentSuffix = '_PERCENT'

  /**
   * Check if a feature flag is enabled via environment variable.
   * Looks for FEATURE_FLAG_{flagName}=true|false|1|0
   *
   * @param flagName - The feature flag name (without prefix)
   * @returns true if enabled, false otherwise
   */
  isEnabled(flagName: string): boolean {
    if (!flagName || typeof flagName !== 'string' || !flagName.trim()) {
      return false
    }

    const envKey = `${this.prefix}${flagName}`
    const value = process.env[envKey]
    
    if (value === undefined || value === '') {
      return false
    }

    const normalized = value.toLowerCase().trim()
    return normalized === 'true' || normalized === '1'
  }

  /**
   * Get percentage value for gradual rollout features.
   * Looks for FEATURE_FLAG_{flagName}_PERCENT=0-100
   *
   * @param flagName - The feature flag name (without prefix or suffix)
   * @returns Percentage (0-100) or undefined if not set or invalid
   */
  getRolloutPercentage(flagName: string): number | undefined {
    if (!flagName || typeof flagName !== 'string' || !flagName.trim()) {
      return undefined
    }

    const envKey = `${this.prefix}${flagName}${this.percentSuffix}`
    const value = process.env[envKey]

    if (value === undefined || value === '') {
      return undefined
    }

    const trimmedValue = value.trim()
    const parsed = parseFloat(trimmedValue)
    
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      return undefined
    }

    // Round to nearest integer for consistent percentage handling
    return Math.round(parsed)
  }
}

/**
 * Feature flag service with defaults and convenience methods.
 * Wraps a provider and adds default behavior for common features.
 *
 * @example
 * const service = new FeatureFlagService()
 * if (service.isEnhancedPriorityEnabled()) {
 *   // Use enhanced priority calculation
 * }
 */
export class FeatureFlagService {
  private provider: IFeatureFlagProvider

  constructor(provider?: IFeatureFlagProvider) {
    this.provider = provider ?? new EnvFeatureFlagProvider()
  }

  /**
   * Check if enhanced priority calculation is enabled.
   * Flag: FEATURE_FLAG_ENHANCED_PRIORITY
   *
   * @returns true if enhanced priority is enabled
   */
  isEnhancedPriorityEnabled(): boolean {
    return this.provider.isEnabled('ENHANCED_PRIORITY')
  }

  /**
   * Get the rollout percentage for a gradual feature launch.
   * Useful for A/B testing or phased rollouts.
   *
   * @param flagName - The feature flag name
   * @returns Percentage (0-100) or 0 if not set or invalid
   */
  getRollout(flagName: string): number {
    if (!flagName || typeof flagName !== 'string' || !flagName.trim()) {
      return 0
    }
    return this.provider.getRolloutPercentage(flagName) ?? 0
  }

  /**
   * Generic feature flag check.
   *
   * @param flagName - The feature flag name
   * @returns true if enabled, false otherwise
   */
  isEnabled(flagName: string): boolean {
    if (!flagName || typeof flagName !== 'string' || !flagName.trim()) {
      return false
    }
    return this.provider.isEnabled(flagName)
  }
}
