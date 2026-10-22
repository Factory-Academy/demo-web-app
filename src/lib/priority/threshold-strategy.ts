import { Item } from '@/models/item'
import { ageInDays } from './age'
import { PriorityLevel, PriorityResult, PriorityStrategy, ScoringContext } from './types'

/**
 * A single rule in the decision table. The first rule whose predicate matches
 * (top to bottom) wins, so rules must be ordered most-urgent first.
 */
export interface PriorityRule {
  level: PriorityLevel
  /** Human-readable label recorded in {@link PriorityResult.reasons}. */
  label: string
  /** True when this rule applies to the given item/age. */
  when: (ctx: { item: Item; ageDays: number }) => boolean
}

export interface ThresholdStrategyOptions {
  /** Ordered rules, evaluated top to bottom. First match wins. */
  rules: PriorityRule[]
  /** Level assigned when no rule matches. Defaults to `low`. */
  fallback: PriorityLevel
}

export const DEFAULT_THRESHOLD_RULES: PriorityRule[] = [
  {
    level: 'critical',
    label: 'urgent and aged > 30d',
    when: ({ item, ageDays }) => item.status === 'urgent' && ageDays > 30,
  },
  {
    level: 'high',
    label: 'urgent',
    when: ({ item }) => item.status === 'urgent',
  },
  {
    level: 'high',
    label: 'aged > 60d',
    when: ({ ageDays }) => ageDays > 60,
  },
  {
    level: 'medium',
    label: 'aged > 30d',
    when: ({ ageDays }) => ageDays > 30,
  },
]

/**
 * Rule-table scoring: walk an ordered list of predicates and take the first
 * match. Unlike the weighted approach there is no numeric score to re-tune;
 * the mapping from signals to levels is explicit and easy to read, at the cost
 * of combinatorial growth when many signals interact.
 *
 * `score` is reported as the index of the matched rule (lower = more urgent,
 * since rules are ordered most-urgent first), with the fallback reported as
 * the rule count.
 */
export class ThresholdStrategy implements PriorityStrategy {
  readonly name = 'threshold'
  private readonly rules: PriorityRule[]
  private readonly fallback: PriorityLevel

  constructor(options?: Partial<ThresholdStrategyOptions>) {
    this.rules = options?.rules ?? DEFAULT_THRESHOLD_RULES
    this.fallback = options?.fallback ?? 'low'
    if (this.rules.length === 0) {
      throw new RangeError('threshold strategy requires at least one rule')
    }
  }

  score(item: Item, context?: ScoringContext): PriorityResult {
    const ageDays = ageInDays(item, context)

    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i]
      if (rule.when({ item, ageDays })) {
        return {
          level: rule.level,
          score: i,
          reasons: [`matched rule #${i}: ${rule.label}`],
        }
      }
    }

    return {
      level: this.fallback,
      score: this.rules.length,
      reasons: [`no rule matched; fallback=${this.fallback}`],
    }
  }
}
