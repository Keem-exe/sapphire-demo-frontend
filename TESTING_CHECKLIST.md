# Learning Intelligence Testing Checklist

## Pre-Test Setup ✅
- [x] Frontend running: http://localhost:3000
- [x] Backend API: https://sapphire-2x9z.onrender.com
- [x] Database seeded with enhanced learning data

## Test Users (Demo Accounts)
Use these demo users to test different learning profiles:

| User ID | Profile Type | Description |
|---------|-------------|-------------|
| 2 | High Performer | Consistent high scores, mastery across topics |
| 3 | Struggling Student | Low scores, multiple knowledge gaps |
| 4 | Inconsistent Learner | Mixed performance, some mastery gaps |
| 5 | Crammer | Study in bursts, poor retention |
| 6 | Slow & Steady | Regular practice, gradual improvement |
| 7 | At-Risk Student | High risk indicators, needs intervention |

## Testing Steps

### 1. Profile Page Integration ✅
**URL:** `http://localhost:3000/profile`

**What to Test:**
- [ ] LearningDashboard component renders without errors
- [ ] Risk alerts display for at-risk users (try User ID 7)
- [ ] Study statistics show correct counts
- [ ] Mastery progress bars display for each topic
- [ ] Knowledge gaps section shows identified gaps
- [ ] Recommended actions appear

**Expected Behavior:**
- Dashboard loads within 2-3 seconds
- All data displays in organized cards
- Progress bars animate smoothly
- Risk alerts show appropriate severity (critical/high)

**Test with Different Users:**
```
1. Login as User ID 2 (High Performer)
   - Should see high mastery scores
   - Few or no risk alerts
   - Recommendations for new topics

2. Login as User ID 7 (At-Risk)
   - Should see critical risk alerts
   - Multiple knowledge gaps
   - Intervention recommendations
```

---

### 2. API Endpoint Testing

#### Test Learning Dashboard API
**Endpoint:** `GET /api/learning/dashboard/{userId}`

**Browser Test:**
```
Open: https://sapphire-2x9z.onrender.com/api/learning/dashboard/2
```

**Expected Response:**
```json
{
  "userId": 2,
  "subjectId": null,
  "masteryLevels": [...],
  "knowledgeGaps": [...],
  "riskIndicators": [...],
  "recommendations": [...],
  "insights": {...}
}
```

**Verify:**
- [ ] Returns 200 status
- [ ] Contains all expected fields
- [ ] Data matches user's learning history
- [ ] No null/undefined values for required fields

---

#### Test Mastery Levels API
**Endpoint:** `GET /api/learning/mastery/{userId}`

**Browser Test:**
```
Open: https://sapphire-2x9z.onrender.com/api/learning/mastery/2?subject_id=1
```

**Expected Response:**
```json
[
  {
    "topicId": 1,
    "topicName": "Algebra Basics",
    "masteryScore": 0.85,
    "confidence": 0.92,
    "totalAttempts": 15,
    "correctAttempts": 13,
    "lastPracticed": "2026-02-08T10:30:00Z"
  }
]
```

**Verify:**
- [ ] Returns array of mastery levels
- [ ] Scores are between 0 and 1
- [ ] Topic names are readable
- [ ] Dates are in ISO format

---

#### Test Knowledge Gaps API
**Endpoint:** `GET /api/learning/gaps/{userId}`

**Browser Test:**
```
Open: https://sapphire-2x9z.onrender.com/api/learning/gaps/3
```

**Expected Response:**
```json
[
  {
    "topicId": 5,
    "topicName": "Quadratic Equations",
    "severity": "high",
    "errorRate": 0.75,
    "lastAttempted": "2026-02-05T14:20:00Z",
    "recommendedAction": "Review fundamentals and practice basic problems"
  }
]
```

**Verify:**
- [ ] Gaps identified for struggling students
- [ ] Severity levels are appropriate
- [ ] Recommendations are actionable

---

#### Test Risk Detection API
**Endpoint:** `GET /api/learning/risks/{userId}`

**Browser Test:**
```
Open: https://sapphire-2x9z.onrender.com/api/learning/risks/7
```

**Expected Response:**
```json
{
  "riskLevel": "high",
  "riskScore": 0.82,
  "indicators": [
    {
      "type": "declining_performance",
      "severity": "high",
      "description": "Quiz scores dropped 25% in last week"
    }
  ],
  "interventions": [
    "Schedule review session",
    "Simplify content difficulty",
    "Increase practice frequency"
  ]
}
```

**Verify:**
- [ ] Risk level matches student profile
- [ ] Indicators are specific and actionable
- [ ] Interventions are realistic

---

#### Test Next Content Recommendation
**Endpoint:** `GET /api/learning/next/{userId}`

**Browser Test:**
```
Open: https://sapphire-2x9z.onrender.com/api/learning/next/2?subject_id=1
```

**Expected Response:**
```json
{
  "recommendationType": "next_topic",
  "topicId": 8,
  "topicName": "Linear Functions",
  "reason": "You've mastered prerequisites",
  "confidence": 0.88,
  "estimatedDifficulty": "medium"
}
```

**Verify:**
- [ ] Recommendation makes sense given mastery
- [ ] Difficulty is appropriate
- [ ] Reason is clear

---

### 3. React Hooks Testing

**Test in Browser Console:**

Open DevTools on profile page and run:

```javascript
// Test useLearningDashboard hook
// (View in React DevTools Components tab)
// Look for LearningDashboard component
// Check hooks state: dashboard, loading, error

// Test data refresh
// Click any refresh button and observe loading states

// Test error handling
// Temporarily change user ID to invalid value (999999)
// Should show error message gracefully
```

**Verify:**
- [ ] Hooks initialize with loading=true
- [ ] Data loads and loading=false after response
- [ ] Error states display user-friendly messages
- [ ] Refresh functions work without page reload

---

### 4. Quiz Completion Integration

**Test Recording Quiz Results:**

1. **Navigate to Quiz Page**
   ```
   http://localhost:3000/quiz
   ```

2. **Complete a Quiz**
   - Select subject and difficulty
   - Answer all questions
   - Submit quiz

3. **Check Profile Page**
   - Navigate back to profile
   - Verify new interaction appears
   - Mastery scores should update
   - Check if recommendations changed

**Verify:**
- [ ] Quiz completion is recorded via `useQuizCompletion` hook
- [ ] Profile data refreshes automatically
- [ ] New mastery levels reflect quiz performance
- [ ] Recommendations adapt to new data

---

### 5. Flashcard Practice Integration

**Test Recording Flashcard Practice:**

1. **Navigate to Flashcards**
   ```
   http://localhost:3000/flashcards
   ```

2. **Practice Flashcards**
   - Select a subject
   - Practice multiple cards
   - Mark some as known, others as needs review

3. **Check Profile**
   - Return to profile page
   - Verify flashcard stats updated
   - Check knowledge gaps reflect practice

**Verify:**
- [ ] Flashcard practice is tracked
- [ ] Recall accuracy impacts mastery
- [ ] Knowledge gaps update based on missed cards

---

### 6. Performance Testing

**Load Time Metrics:**
- [ ] Profile page loads in < 3 seconds
- [ ] Dashboard data fetches in < 2 seconds
- [ ] No React errors in console
- [ ] No memory leaks (check DevTools Performance)

**Network Requests:**
- [ ] API calls use correct endpoints
- [ ] Authorization headers included
- [ ] Responses cached appropriately
- [ ] Failed requests retry gracefully

**Browser Console:**
- [ ] No TypeScript errors
- [ ] No React warnings
- [ ] No CORS errors
- [ ] Proper error messages for failures

---

### 7. Mobile Responsiveness

**Test on Different Viewports:**

- [ ] Desktop (1920x1080)
  - Dashboard cards in proper grid layout
  - All text readable
  - Charts/progress bars display correctly

- [ ] Tablet (768x1024)
  - Cards stack appropriately
  - Touch targets are large enough
  - No horizontal scrolling

- [ ] Mobile (375x667)
  - Single column layout
  - All content accessible
  - Buttons and links easily tappable

---

### 8. Edge Cases & Error Handling

**Test Scenarios:**

- [ ] **New User (No Data)**
  - Create fresh user account
  - Profile should show empty state
  - No errors, friendly "no data yet" message

- [ ] **Network Failure**
  - Disconnect internet
  - Should show error message
  - Retry button appears

- [ ] **Invalid User ID**
  - Navigate to profile with userId=99999
  - Should handle gracefully, not crash

- [ ] **Backend Down**
  - Stop backend server
  - Frontend shows appropriate error
  - Doesn't break page layout

---

## API Testing with cURL

**Quick API Tests from Terminal:**

```bash
# Test dashboard endpoint
curl https://sapphire-2x9z.onrender.com/api/learning/dashboard/2

# Test mastery levels
curl "https://sapphire-2x9z.onrender.com/api/learning/mastery/2?subject_id=1"

# Test knowledge gaps
curl https://sapphire-2x9z.onrender.com/api/learning/gaps/3

# Test risk detection
curl https://sapphire-2x9z.onrender.com/api/learning/risks/7

# Test next content
curl "https://sapphire-2x9z.onrender.com/api/learning/next/2?subject_id=1"

# Test insights
curl https://sapphire-2x9z.onrender.com/api/learning/insights/2
```

---

## Known Issues to Watch For

### Backend Issues
- [ ] CORS configuration allows localhost:3000
- [ ] All endpoints return proper JSON
- [ ] Database connections don't timeout
- [ ] SQL queries are optimized (no N+1 problems)

### Frontend Issues
- [ ] TypeScript types match API responses
- [ ] Loading states prevent multiple API calls
- [ ] Error boundaries catch component errors
- [ ] Memory leaks from unclosed subscriptions

---

## Success Criteria

**Integration is successful when:**

✅ All API endpoints return expected data
✅ Profile page loads without errors
✅ LearningDashboard component displays all sections
✅ Quiz/flashcard completion updates profile data
✅ Different user profiles show different insights
✅ Risk detection works for at-risk students
✅ Recommendations are personalized and actionable
✅ Mobile layout is fully responsive
✅ No console errors in browser
✅ Page performance is acceptable (<3s load)

---

## Next Steps After Testing

Once all tests pass:

1. **Fix any bugs found** - Document and resolve issues
2. **Optimize performance** - Add caching, lazy loading if needed
3. **Add analytics tracking** - Track user interactions with dashboard
4. **Prepare deployment** - Update environment variables for production
5. **Write deployment docs** - Update DEPLOYMENT.md with new features
6. **User acceptance testing** - Get feedback from real users

---

## Testing Log

**Date:** February 8, 2026
**Tester:** _____________
**Environment:** Development

| Test | Status | Notes |
|------|--------|-------|
| Profile page loads | ⬜ | |
| Dashboard renders | ⬜ | |
| API endpoints work | ⬜ | |
| Hooks function properly | ⬜ | |
| Quiz integration | ⬜ | |
| Flashcard integration | ⬜ | |
| Performance acceptable | ⬜ | |
| Mobile responsive | ⬜ | |
| Error handling works | ⬜ | |

---

**Legend:**
- ⬜ Not tested
- ✅ Passed
- ❌ Failed
- ⚠️ Issues found

