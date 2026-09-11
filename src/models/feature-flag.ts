/**
 * Configuration for a feature flag
 */
export interface FeatureFlagConfig {
  /**
   * Unique identifier for the feature flag
   */
  key: string

  /**
   * Default value if the feature flag is not configured
   */
  defaultValue: boolean

  /**
   * Optional description of the feature flag's purpose
   */
  description?: string
}

/**
 * Interface for feature flag evaluation
 */
export interface IFeatureFlagProvider {
  /**
   * Check if a feature flag is enabled
   * 
   * @param key - The feature flag key to check
   * @returns true if the feature is enabled, false otherwise
   */
  isEnabled(key: string): boolean

  /**
   * Check if a feature flag is enabled with a default fallback
   * 
   * @param key - The feature flag key to check
   * @param defaultValue - The default value if the flag is not configured
   * @returns true if the feature is enabled, false otherwise
   */
  isEnabledWithDefault(key: string, defaultValue: boolean): boolean

  /**
   * Get all configured feature flags
   * 
   * @returns Record of all feature flag keys and their enabled state
   */
  getAllFlags(): Record<string, boolean>
}
