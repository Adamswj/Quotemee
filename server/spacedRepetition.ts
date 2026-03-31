/**
 * Advanced Spaced Repetition Algorithm based on SuperMemo SM-2
 * Optimizes learning intervals for maximum retention
 */

export interface SpacedRepetitionData {
  easeFactor: number;
  interval: number;
  nextReview: Date;
  repetitions: number;
  stage: 'learning' | 'review' | 'mastered';
}

export interface ReviewResult {
  quality: number; // 0-5 scale (0=total blackout, 5=perfect response)
  responseTime?: number; // Optional: time taken to respond in seconds
}

export class SpacedRepetitionEngine {
  // Minimum ease factor to prevent cards from becoming too difficult
  private static readonly MIN_EASE_FACTOR = 1.3;
  
  // Maximum interval in days (6 months)
  private static readonly MAX_INTERVAL = 180;
  
  // Learning steps for new cards (in minutes)
  private static readonly LEARNING_STEPS = [1, 10, 60, 1440]; // 1min, 10min, 1hour, 1day
  
  // Graduate to review phase after this many successful learning steps
  private static readonly GRADUATION_THRESHOLD = 3;

  /**
   * Calculate next review based on performance
   */
  static calculateNextReview(
    currentData: SpacedRepetitionData,
    result: ReviewResult
  ): SpacedRepetitionData {
    const { quality } = result;
    let { easeFactor, interval, repetitions, stage } = currentData;

    // Handle learning phase
    if (stage === 'learning') {
      return this.handleLearningPhase(currentData, quality);
    }

    // Handle review phase (graduated cards)
    if (quality < 3) {
      // Failed review - reset to learning
      return {
        easeFactor: Math.max(easeFactor - 0.2, this.MIN_EASE_FACTOR),
        interval: 1,
        nextReview: this.addMinutesToDate(new Date(), this.LEARNING_STEPS[0]),
        repetitions: 0,
        stage: 'learning'
      };
    }

    // Successful review - update ease factor
    easeFactor = Math.max(
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
      this.MIN_EASE_FACTOR
    );

    // Calculate new interval
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.min(
        Math.round(interval * easeFactor),
        this.MAX_INTERVAL
      );
    }

    repetitions += 1;

    // Determine if mastered (high repetitions with good performance)
    const newStage = repetitions >= 8 && quality >= 4 ? 'mastered' : 'review';

    return {
      easeFactor,
      interval,
      nextReview: this.addDaysToDate(new Date(), interval),
      repetitions,
      stage: newStage
    };
  }

  /**
   * Handle learning phase progression
   */
  private static handleLearningPhase(
    currentData: SpacedRepetitionData,
    quality: number
  ): SpacedRepetitionData {
    const { repetitions } = currentData;

    if (quality < 3) {
      // Failed - restart learning
      return {
        ...currentData,
        repetitions: 0,
        nextReview: this.addMinutesToDate(new Date(), this.LEARNING_STEPS[0]),
        stage: 'learning'
      };
    }

    // Successful learning step
    const newRepetitions = repetitions + 1;

    if (newRepetitions >= this.GRADUATION_THRESHOLD) {
      // Graduate to review phase
      return {
        easeFactor: 2.5,
        interval: 1,
        nextReview: this.addDaysToDate(new Date(), 1),
        repetitions: 0,
        stage: 'review'
      };
    }

    // Continue learning
    const stepIndex = Math.min(newRepetitions, this.LEARNING_STEPS.length - 1);
    const nextStepMinutes = this.LEARNING_STEPS[stepIndex];

    return {
      ...currentData,
      repetitions: newRepetitions,
      nextReview: this.addMinutesToDate(new Date(), nextStepMinutes),
      stage: 'learning'
    };
  }

  /**
   * Get cards due for review
   */
  static getCardsForReview(progressData: any[]): any[] {
    const now = new Date();
    return progressData.filter(card => {
      const nextReview = new Date(card.nextReview);
      return nextReview <= now;
    });
  }

  /**
   * Prioritize cards for optimal learning
   */
  static prioritizeCards(cards: any[]): any[] {
    return cards.sort((a, b) => {
      // Priority order:
      // 1. Failed cards (learning stage with high repetitions)
      // 2. Overdue review cards
      // 3. Learning cards
      // 4. Regular review cards

      const aOverdue = this.getDaysOverdue(a);
      const bOverdue = this.getDaysOverdue(b);

      // Failed cards first
      if (a.stage === 'learning' && a.repetitions > 2 && b.stage !== 'learning') return -1;
      if (b.stage === 'learning' && b.repetitions > 2 && a.stage !== 'learning') return 1;

      // Then overdue cards
      if (aOverdue > 0 && bOverdue <= 0) return -1;
      if (bOverdue > 0 && aOverdue <= 0) return 1;

      // Sort by overdue amount
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;

      // Then learning cards
      if (a.stage === 'learning' && b.stage !== 'learning') return -1;
      if (b.stage === 'learning' && a.stage !== 'learning') return 1;

      // Finally by next review time
      return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
    });
  }

  /**
   * Get recommended study session size
   */
  static getRecommendedSessionSize(totalDue: number, userLevel: number): number {
    // Adjust session size based on user level and workload
    const baseSize = Math.min(totalDue, 20);
    const levelMultiplier = Math.min(userLevel / 10, 2); // Max 2x multiplier
    
    return Math.max(5, Math.min(Math.round(baseSize * levelMultiplier), 50));
  }

  /**
   * Calculate study statistics
   */
  static calculateStudyStats(progressData: any[]): {
    totalCards: number;
    dueToday: number;
    learning: number;
    review: number;
    mastered: number;
    averageEase: number;
  } {
    const now = new Date();

    // Count cards that are due NOW (nextReview <= current time)
    // This ensures cards you've already studied today don't show as "due"
    const dueToday = progressData.filter(card => {
      const nextReview = new Date(card.nextReview);
      return nextReview <= now;
    }).length;

    const learning = progressData.filter(card => card.stage === 'learning').length;
    const review = progressData.filter(card => card.stage === 'review').length;
    // Use masteryLevel >= 5 for consistent "mastered" count across the app
    const mastered = progressData.filter(card => (card.masteryLevel || 0) >= 5).length;

    const averageEase = progressData.length > 0
      ? progressData.reduce((sum, card) => sum + (card.easeFactor || 2.5), 0) / progressData.length
      : 2.5;

    return {
      totalCards: progressData.length,
      dueToday,
      learning,
      review,
      mastered,
      averageEase: Math.round(averageEase * 100) / 100
    };
  }

  /**
   * Helper: Add days to date
   */
  private static addDaysToDate(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Helper: Add minutes to date
   */
  private static addMinutesToDate(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  /**
   * Helper: Get days overdue
   */
  private static getDaysOverdue(card: any): number {
    const now = new Date();
    const nextReview = new Date(card.nextReview);
    const diffTime = now.getTime() - nextReview.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}