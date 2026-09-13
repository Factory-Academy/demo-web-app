import { IFeatureFlagProvider } from '@/models/feature-flag'

/**
 * Environment-driven feature flag provider that reads flags from environment variables.
 * 
 * Feature flags are read from environment variables with the prefix `FEATURE_FLAG_`.
 * For example, `FEATURE_FLAG_NEW_UI=true` enables the `new_ui` feature.
 * 
 * @example
 * // Set environment variable: FEATURE_FLAG_ENHANCED_VALIDATION=true
 * const flags = new EnvFeatureFlagProvider()
 * 
 * if (flags.isEnabled('enhanced_validation')) {
 *   // Use enhanced validation logic
 * }
 * 
 * // With default fallback
 * if (flags.isEnabledWithDefault('experimental_feature', false)) {
 *   // Use experimental feature
 * }
 */
export class EnvFeatureFlagProvider implements IFeatureFlagProvider {
  private readonly prefix: string

  /**
   * Creates a new environment-driven feature flag provider
   * 
   * @param prefix - The environment variable prefix (default: 'FEATURE_FLAG_')
   */
  constructor(prefix: string = 'FEATURE_FLAG_') {
    this.prefix = prefix
  }

  /**
   * Converts a feature flag key to its environment variable name
   * 
   * @param key - The feature flag key (e.g., 'new_ui')
   * @returns The environment variable name (e.g., 'FEATURE_FLAG_NEW_UI')
   */
  private getEnvKey(key: string): string {
    return `${this.prefix}${key.toUpperCase()}`
  }

  /**
   * Parses a string value to a boolean
   * Treats 'true', '1', 'yes', 'on' as true (case-insensitive)
   * 
   * @param value - The string value to parse
   * @returns true if the value represents a truthy value, false otherwise
   */
  private parseBoolean(value: string | undefined): boolean | null {
    if (!value) return null
    const normalized = value.toLowerCase().trim()
    return ['true', '1', 'yes', 'on'].includes(normalized)
  }

  /**
   * Check if a feature flag is enabled
   * Returns false by default if the flag is not configured
   * 
   * @param key - The feature flag key to check
   * @returns true if the feature is enabled, false otherwise
   */
  isEnabled(key: string): boolean {
    return this.isEnabledWithDefault(key, false)
  }

  /**
   * Check if a feature flag is enabled with a default fallback
   * 
   * @param key - The feature flag key to check
   * @param defaultValue - The default value if the flag is not configured
   * @returns true if the feature is enabled, false otherwise
   * 
   * @example
   * // Returns true if FEATURE_FLAG_NEW_FEATURE is set to 'true', otherwise false
   * const enabled = provider.isEnabledWithDefault('new_feature', false)
   */
  isEnabledWithDefault(key: string, defaultValue: boolean): boolean {
    const envKey = this.getEnvKey(key)
    const envValue = process.env[envKey]
    const parsed = this.parseBoolean(envValue)
    return parsed !== null ? parsed : defaultValue
  }

  /**
   * Get all configured feature flags
   * Only returns flags that are explicitly set in environment variables
   * 
   * @returns Record of all feature flag keys and their enabled state
   * 
   * @example
   * const flags = provider.getAllFlags()
   * console.log(flags) // { new_ui: true, beta_features: false }
   */
  getAllFlags(): Record<string, boolean> {
    const flags: Record<string, boolean> = {}
    
    // Scan environment variables for feature flags
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix)) {
        const flagKey = key.slice(this.prefix.length).toLowerCase()
        const parsed = this.parseBoolean(value)
        if (parsed !== null) {
          flags[flagKey] = parsed
        }
      }
    }
    
    return flags
  }
}

/**
 * Default feature flag provider instance
 * Uses environment variables with the FEATURE_FLAG_ prefix
 */
export const featureFlags = new EnvFeatureFlagProvider()
