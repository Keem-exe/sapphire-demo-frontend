/**
 * Learning Intelligence Engine - Recommendation System
 * Provides adaptive learning recommendations based on performance data
 */

import type {
  PersonalizedContent,
  AdaptivePacing,
  TargetedFeedback,
  StudyGuidance,
  EarlyRiskAlert,
  QuizPerformance,
  FlashcardSession,
  TopicMastery,
  RiskLevel,
} from "@/lib/types/analytics";
import { analyticsService } from "./analytics";

class IntelligenceEngineService {
  /**
   * Get personalized content recommendations
   */
  getContentRecommendations(userId: number, subjectId: string): PersonalizedContent {
    const analytics = analyticsService.getAnalytics(userId);
    const subjectMastery = analytics.topic_mastery.filter(t => t.subject_id === subjectId);

    // Find weak topics (confidence < 70%)
    const weakTopics = subjectMastery
      .filter(t => t.confidence_score < 70)
      .sort((a, b) => a.confidence_score - b.confidence_score)
      .slice(0, 5)
      .map(t => t.topic);

    // Find topics that haven't been practiced recently
    const now = new Date();
    const reviewTopics = subjectMastery
      .filter(t => {
        const daysSinceReview = Math.floor(
          (now.getTime() - new Date(t.last_practiced).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceReview > 3 && t.confidence_score < 85;
      })
      .map(t => t.topic);

    // Determine next study suggestion
    let nextSuggestion = {
      topic: "Start with any topic",
      reason: "Begin your learning journey",
      priority: "medium" as const,
    };

    if (weakTopics.length > 0) {
      nextSuggestion = {
        topic: weakTopics[0],
        reason: `This topic needs more practice (${subjectMastery.find(t => t.topic === weakTopics[0])?.confidence_score}% mastery)`,
        priority: "high" as const,
      };
    } else if (reviewTopics.length > 0) {
      nextSuggestion = {
        topic: reviewTopics[0],
        reason: "It's been a while since you reviewed this",
        priority: "medium" as const,
      };
    } else if (subjectMastery.length > 0) {
      const strongTopics = subjectMastery.filter(t => t.confidence_score >= 85);
      if (strongTopics.length < subjectMastery.length) {
        const improveTopic = subjectMastery.find(t => t.confidence_score >= 70 && t.confidence_score < 85);
        if (improveTopic) {
          nextSuggestion = {
            topic: improveTopic.topic,
            reason: "You're doing well! Let's aim for mastery",
            priority: "low" as const,
          };
        }
      }
    }

    return {
      recommended_topics: [...new Set([...weakTopics, ...reviewTopics])].slice(0, 5),
      next_study_suggestion: nextSuggestion,
      review_topics: reviewTopics.slice(0, 3),
    };
  }

  /**
   * Get adaptive pacing guidance
   */
  getPacingGuidance(userId: number, currentTopic: string, subjectId: string): AdaptivePacing {
    const analytics = analyticsService.getAnalytics(userId);
    const topicData = analytics.topic_mastery.find(
      t => t.topic === currentTopic && t.subject_id === subjectId
    );

    if (!topicData) {
      return {
        current_topic: currentTopic,
        should_advance: false,
        should_reinforce: true,
        recommendation: "Start practicing this topic to build understanding",
        pace_level: "slow",
      };
    }

    const confidence = topicData.confidence_score;
    const practiceCount = topicData.practice_count;

    // Determine if student should advance or reinforce
    const shouldAdvance = confidence >= 80 && practiceCount >= 3;
    const shouldReinforce = confidence < 70 || practiceCount < 2;

    let recommendation = "";
    let paceLevel: "slow" | "moderate" | "fast" = "moderate";

    if (shouldAdvance) {
      recommendation = `Great work! You've mastered ${currentTopic}. Ready to move forward.`;
      paceLevel = "fast";
    } else if (shouldReinforce) {
      recommendation = `Keep practicing ${currentTopic}. Try different practice methods to strengthen understanding.`;
      paceLevel = "slow";
    } else {
      recommendation = `You're making good progress on ${currentTopic}. A few more practice sessions will help solidify your knowledge.`;
      paceLevel = "moderate";
    }

    return {
      current_topic: currentTopic,
      should_advance: shouldAdvance,
      should_reinforce: shouldReinforce,
      recommendation,
      pace_level: paceLevel,
    };
  }

  /**
   * Get targeted feedback for a topic
   */
  getTargetedFeedback(userId: number, topic: string, subjectId: string): TargetedFeedback {
    const quizHistory = analyticsService.getQuizHistory();
    const topicQuizzes = quizHistory.filter(q => q.topic === topic && q.subject_id === subjectId);

    // Extract knowledge gaps as common mistakes
    const commonMistakes = topicQuizzes
      .flatMap(q => q.knowledge_gaps)
      .reduce((acc, gap) => {
        acc[gap] = (acc[gap] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const sortedMistakes = Object.entries(commonMistakes)
      .sort(([, a], [, b]) => b - a)
      .map(([mistake]) => mistake)
      .slice(0, 5);

    // Generate improvement suggestions
    const suggestions: string[] = [];
    const analytics = analyticsService.getAnalytics(userId);
    const topicData = analytics.topic_mastery.find(t => t.topic === topic && t.subject_id === subjectId);

    if (topicData) {
      if (topicData.quiz_average < 60) {
        suggestions.push("Review fundamental concepts before attempting practice questions");
        suggestions.push("Break down complex problems into smaller steps");
      }
      if (topicData.flashcard_accuracy < 70) {
        suggestions.push("Use spaced repetition to improve memory retention");
        suggestions.push("Create mnemonics or visual aids for difficult concepts");
      }
      if (topicData.practice_count < 3) {
        suggestions.push("Consistent practice is key - aim for daily review sessions");
      }
    }

    // Generate resource recommendations
    const resources = [
      {
        type: "video" as const,
        title: `${topic} - Complete Tutorial`,
      },
      {
        type: "practice" as const,
        title: `${topic} - Practice Problems`,
      },
      {
        type: "article" as const,
        title: `${topic} - Study Guide`,
      },
    ];

    return {
      topic,
      common_mistakes: sortedMistakes,
      misconceptions: sortedMistakes.slice(0, 3), // Top 3 as misconceptions
      improvement_suggestions: suggestions,
      resources,
    };
  }

  /**
   * Get study guidance and motivation
   */
  getStudyGuidance(userId: number): StudyGuidance {
    const analytics = analyticsService.getAnalytics(userId);
    const sessions = analyticsService.getStudySessions().filter(s => s.user_id === userId);

    const now = new Date();
    const lastActive = new Date(analytics.last_active);
    const daysSinceStudy = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate daily goal based on current streak and performance
    let dailyGoal = 30; // Default 30 minutes
    if (analytics.current_streak > 7) dailyGoal = 45;
    if (analytics.current_streak > 14) dailyGoal = 60;

    // Generate motivation message
    let motivationMessage = "";
    if (analytics.current_streak === 0) {
      motivationMessage = "Start your learning streak today! Even 10 minutes makes a difference.";
    } else if (analytics.current_streak < 3) {
      motivationMessage = `You're on a ${analytics.current_streak}-day streak! Keep the momentum going.`;
    } else if (analytics.current_streak < 7) {
      motivationMessage = `Amazing! ${analytics.current_streak} days strong. You're building a great habit!`;
    } else {
      motivationMessage = `Incredible ${analytics.current_streak}-day streak! You're crushing it! 🔥`;
    }

    // Suggest break time based on session length
    const averageSessionLength = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 60
      : 25;
    const suggestedBreakTime = averageSessionLength > 40 ? 10 : 5;

    return {
      daily_goal: dailyGoal,
      current_streak: analytics.current_streak,
      suggested_break_time: suggestedBreakTime,
      motivation_message: motivationMessage,
      accountability_check: {
        last_study_date: lastActive,
        days_since_study: daysSinceStudy,
        needs_nudge: daysSinceStudy > 2,
      },
    };
  }

  /**
   * Generate early risk alerts
   */
  getRiskAlert(userId: number): EarlyRiskAlert | null {
    const analytics = analyticsService.getAnalytics(userId);

    if (analytics.risk_level === "none") {
      return null;
    }

    const riskFactors: string[] = [];
    const suggestedActions: string[] = [];

    // Analyze risk factors
    if (analytics.quiz_performance.average_score < 60) {
      riskFactors.push("Low quiz performance");
      suggestedActions.push("Review fundamental concepts before attempting quizzes");
    }

    const daysSinceActive = Math.floor(
      (new Date().getTime() - new Date(analytics.last_active).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceActive > 7) {
      riskFactors.push("Inactive for over a week");
      suggestedActions.push("Set a daily reminder to practice for at least 15 minutes");
    }

    if (analytics.current_streak === 0 && analytics.sessions_completed > 5) {
      riskFactors.push("Lost study streak");
      suggestedActions.push("Start small - commit to just 10 minutes today");
    }

    if (analytics.knowledge_gaps.length > 5) {
      riskFactors.push("Multiple knowledge gaps detected");
      suggestedActions.push("Focus on one topic at a time to build confidence");
    }

    const strugglingTopics = analytics.topic_mastery
      .filter(t => t.mastery_level === "beginner" || t.confidence_score < 50)
      .map(t => t.topic);

    if (strugglingTopics.length > 3) {
      riskFactors.push("Struggling with multiple topics");
      suggestedActions.push("Consider seeking help from a tutor or study group");
    }

    const interventionNeeded = analytics.risk_level === "high" || daysSinceActive > 14;

    if (interventionNeeded) {
      suggestedActions.push("Consider scheduling a session with a mentor or teacher");
    }

    return {
      user_id: userId,
      risk_level: analytics.risk_level,
      risk_factors: riskFactors,
      intervention_needed: interventionNeeded,
      suggested_actions: suggestedActions,
      struggling_topics: strugglingTopics.slice(0, 5),
      last_activity: new Date(analytics.last_active),
    };
  }

  /**
   * Get complete learning intelligence for a user
   */
  getLearningIntelligence(userId: number, subjectId: string) {
    const analytics = analyticsService.getAnalytics(userId);
    const contentRecs = this.getContentRecommendations(userId, subjectId);
    const studyGuidance = this.getStudyGuidance(userId);
    const riskAlert = this.getRiskAlert(userId);

    const currentTopic = contentRecs.next_study_suggestion.topic;
    const pacingGuidance = this.getPacingGuidance(userId, currentTopic, subjectId);

    // Get feedback for knowledge gaps
    const feedback = analytics.knowledge_gaps.slice(0, 3).map(gap => 
      this.getTargetedFeedback(userId, gap, subjectId)
    );

    return {
      user_id: userId,
      student_signals: {
        recent_quizzes: analyticsService.getQuizHistory().slice(-5),
        recent_flashcards: analyticsService.getFlashcardHistory().slice(-5),
        recent_notebooks: analyticsService.getNotebookHistory().slice(-5),
        recent_chats: analyticsService.getChatHistory().slice(-5),
        active_sessions: analyticsService.getStudySessions().filter(s => !s.completed),
      },
      personalized_actions: {
        content_recommendations: contentRecs,
        pacing_guidance: pacingGuidance,
        feedback,
        study_guidance: studyGuidance,
        risk_alerts: riskAlert,
      },
      analytics,
      last_updated: new Date(),
    };
  }
}

export const intelligenceEngine = new IntelligenceEngineService();
