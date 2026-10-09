/**
 * Feature Flag utility for environment-driven feature toggles.
 * Flags are sourced from environment variables with NEXT_PUBLIC_FEATURE_ prefix.
 * Example: NEXT_PUBLIC_FEATURE_ADVANCED_PRIORITY=true
 */

export interface FeatureFlagConfig {
  [key: string]: boolean
}

export class FeatureFlags {
  private flags: FeatureFlagConfig = {}
  private readonly PREFIX = 'NEXT_PUBLIC_FEATURE_'

  constructor() {
    this.loadFlags()
  }

  /**
   * Load all feature flags from environment variables.
   * Only processes variables with NEXT_PUBLIC_FEATURE_ prefix.
   */
  private loadFlags(): void {
    if (typeof window !== 'undefined') {
      // Client-side: flags are injected into window.__NEXT_DATA__
      this.flags = this.parseClientFlags()
    } else {
      // Server-side: read from process.env
      this.flags = this.parseServerFlags()
    }
  }

  /**
   * Parse flags from server-side environment (Node.js process.env)
   */
  private parseServerFlags(): FeatureFlagConfig {
    const flags: FeatureFlagConfig = {}
    Object.entries(process.env).forEach(([key, value]) => {
      if (key.startsWith(this.PREFIX)) {
        const flagName = key.slice(this.PREFIX.length).toLowerCase()
        flags[flagName] = this.parseBoolean(value)
      }
    })
    return flags
  }

  /**
   * Parse flags from client-side (mock for client-side rendering)
   */
  private parseClientFlags(): FeatureFlagConfig {
    // In a real app, you'd populate this from __NEXT_DATA__ or similar
    return {}
  }

  /**
   * Check if a feature flag is enabled.
   * Returns false if the flag does not exist.
   * Re-loads flags on each check to support dynamic changes (e.g., in tests).
   *
   * @param flagName - The name of the flag (without NEXT_PUBLIC_FEATURE_ prefix)
   * @returns true if enabled, false otherwise
   */
  isEnabled(flagName: string): boolean {
    // Reload flags on each check to support dynamic env var changes
    this.loadFlags()
    const key = flagName.toLowerCase()
    return this.flags[key] ?? false
  }

  /**
   * Get all currently enabled flags (for debugging).
   * Re-loads flags to reflect current environment state.
   */
  getEnabledFlags(): string[] {
    this.loadFlags()
    return Object.entries(this.flags)
      .filter(([, value]) => value)
      .map(([key]) => key)
  }

  /**
   * Get all loaded flags with their values (for debugging).
   * Re-loads flags to reflect current environment state.
   */
  getAllFlags(): FeatureFlagConfig {
    this.loadFlags()
    return { ...this.flags }
  }

  /**
   * Parse a string boolean value ('true', 'false', '1', '0', etc.)
   */
  private parseBoolean(value: string | undefined): boolean {
    if (!value) return false
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlags()
