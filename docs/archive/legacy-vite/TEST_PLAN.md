# Comprehensive Test Plan - Foodie PWA

**Version**: 1.0.0
**Last Updated**: 2025-11-25
**Features Tested**: Runtime Issue Fixes + Firebase Integration
**Total Test Cases**: 45

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Feature 1: Add Custom Item Modal](#feature-1-add-custom-item-modal)
4. [Feature 2: Cost Calculation System](#feature-2-cost-calculation-system)
5. [Feature 3: Plan Sharing Infrastructure](#feature-3-plan-sharing-infrastructure)
6. [Feature 4: Shopping List Category Filter](#feature-4-shopping-list-category-filter)
7. [Feature 5: Price Management UI](#feature-5-price-management-ui)
8. [Feature 6: Toast Notification System](#feature-6-toast-notification-system)
9. [Feature 7: Firebase Integration](#feature-7-firebase-integration)
10. [Cross-Browser Testing](#cross-browser-testing)
11. [Accessibility Testing](#accessibility-testing)
12. [Performance Testing](#performance-testing)

---

## Testing Overview

### Scope

This test plan covers:
- ✅ 37 runtime issues fixed across 4 core features
- ✅ New Price Management UI
- ✅ Toast notification system
- ✅ Firebase cloud sync integration
- ✅ Translation completeness (EN/ES/FR)

### Test Execution Strategy

1. **Unit-level**: Test individual components in isolation
2. **Integration**: Test feature workflows end-to-end
3. **Cross-browser**: Verify on Chrome, Firefox, Safari, Edge
4. **Cross-device**: Test on desktop, tablet, mobile
5. **Internationalization**: Test all features in EN, ES, FR
6. **Error scenarios**: Test edge cases and error handling

---

## Test Environment Setup

### Prerequisites

- ✅ Build completed successfully (1103.91 KiB)
- ✅ All TypeScript compilation passed
- ✅ Firebase project configured (foodie-cc553)
- ✅ Three translation files complete (EN/ES/FR)

### Test Data Requirements

- Sample recipes in all three languages
- Sample meal plans with varying servings
- Custom ingredient prices set
- Shopping list with multiple categories

### Browsers to Test

| Browser | Version | Platform |
|---------|---------|----------|
| Chrome | Latest | Desktop + Mobile |
| Firefox | Latest | Desktop + Mobile |
| Safari | Latest | Desktop + iOS |
| Edge | Latest | Desktop |

---

## Feature 1: Add Custom Item Modal

**Component**: `src/components/shopping/AddItemModal.tsx`

### Test Case 1.1: Valid Item Addition

**Steps**:
1. Open Shopping List page
2. Click "Add Custom Item" button
3. Enter item name: "Olive Oil"
4. Select category: "Pantry Staples"
5. Enter quantity: "2"
6. Click "Add Item"

**Expected Result**:
- ✅ Item appears in shopping list
- ✅ Item has unique ID (check localStorage)
- ✅ Item is in correct category
- ✅ Quantity is 2
- ✅ Success toast appears
- ✅ Modal closes

### Test Case 1.2: Quantity Validation - Zero

**Steps**:
1. Open Add Custom Item modal
2. Enter item name: "Test Item"
3. Enter quantity: "0"
4. Click "Add Item"

**Expected Result**:
- ❌ Item NOT added
- ✅ Error toast: "Please enter a valid quantity greater than 0"
- ✅ Modal remains open

### Test Case 1.3: Quantity Validation - Negative

**Steps**:
1. Open Add Custom Item modal
2. Enter quantity: "-5"
3. Click "Add Item"

**Expected Result**:
- ❌ Item NOT added
- ✅ Error toast with validation message
- ✅ Modal remains open

### Test Case 1.4: Quantity Validation - Non-numeric

**Steps**:
1. Enter quantity: "abc"
2. Click "Add Item"

**Expected Result**:
- ❌ Item NOT added
- ✅ Error toast: "Please enter a valid quantity greater than 0"
- ✅ Modal remains open

### Test Case 1.5: Quantity Validation - Empty

**Steps**:
1. Leave quantity field empty
2. Click "Add Item"

**Expected Result**:
- ❌ Item NOT added
- ✅ Error toast appears
- ✅ Modal remains open

### Test Case 1.6: ID Generation Uniqueness

**Steps**:
1. Add item "Item A"
2. Add item "Item B"
3. Inspect localStorage `shoppingList` key
4. Check both items have different IDs

**Expected Result**:
- ✅ Each item has unique ID
- ✅ IDs follow format: `custom-{timestamp}-{random}`
- ✅ No ID collisions

### Test Case 1.7: Category Selection

**Steps**:
1. Open modal
2. Check category dropdown options

**Expected Result**:
- ✅ All categories from INGREDIENT_CATEGORIES constant are present
- ✅ Categories match translations
- ✅ Default category selected

---

## Feature 2: Cost Calculation System

**Component**: `src/utils/costCalculations.ts`

### Test Case 2.1: Division by Zero Protection

**Steps**:
1. Create recipe with ingredient: quantity = 0
2. Open recipe detail page
3. Check cost calculation

**Expected Result**:
- ✅ No error thrown
- ✅ Cost displays as 0 or N/A
- ✅ Console shows no errors
- ✅ No Infinity values displayed

### Test Case 2.2: NaN Propagation Prevention

**Steps**:
1. Set ingredient price to undefined
2. Calculate meal plan cost
3. Check PlanSummary component

**Expected Result**:
- ✅ Cost shows 0 or "---"
- ✅ No "NaN" displayed to user
- ✅ Number.isFinite() guards prevent propagation

### Test Case 2.3: Negative Value Handling

**Steps**:
1. Manually set negative price in localStorage
2. Calculate total cost
3. Check displayed value

**Expected Result**:
- ✅ Negative values either rejected or displayed correctly
- ✅ No calculation errors
- ✅ User warned if negative detected

### Test Case 2.4: Large Number Handling

**Steps**:
1. Set ingredient price to 999999
2. Set quantity to 1000
3. Calculate total

**Expected Result**:
- ✅ Calculation completes without overflow
- ✅ Result formatted correctly (e.g., $999,999,000.00)
- ✅ No Infinity result

### Test Case 2.5: Decimal Precision

**Steps**:
1. Set price: $3.333333
2. Set quantity: 3
3. Calculate total

**Expected Result**:
- ✅ Result rounded to 2 decimal places
- ✅ Displays: $10.00 (not $9.999999)

### Test Case 2.6: Zero Cost Items

**Steps**:
1. Set ingredient price to 0
2. Add to meal plan
3. Calculate total cost

**Expected Result**:
- ✅ Item contributes $0.00 to total
- ✅ No division errors
- ✅ Total cost accurate

---

## Feature 3: Plan Sharing Infrastructure

**Components**:
- `src/contexts/PlannerContext.tsx`
- `src/components/planner/SharePlanModal.tsx`
- `src/pages/SharedPlanPage.tsx`

### Test Case 3.1: Share Token Persistence

**Steps**:
1. Create new meal plan
2. Click "Share Plan"
3. Copy share URL
4. Refresh page
5. Click "Share Plan" again

**Expected Result**:
- ✅ Same share token used
- ✅ URL unchanged
- ✅ Token stored in localStorage
- ✅ No duplicate tokens generated

### Test Case 3.2: Firebase Auto-Upload

**Steps**:
1. Create meal plan
2. Click "Share Plan"
3. Wait for cloud sync
4. Check browser network tab for Firestore request

**Expected Result**:
- ✅ "Syncing to cloud..." appears
- ✅ Firestore setDoc request sent
- ✅ "Cloud synced" indicator shows
- ✅ Success toast appears

### Test Case 3.3: Firebase Unavailable Fallback

**Steps**:
1. Disconnect from internet
2. Create meal plan
3. Click "Share Plan"

**Expected Result**:
- ✅ Share URL still generated
- ✅ Warning toast: "Cloud sync unavailable. Link will work locally."
- ✅ Plan saved to localStorage
- ✅ No error thrown

### Test Case 3.4: Cross-Device Sharing

**Steps**:
1. Device A: Create and share meal plan
2. Copy share URL
3. Device B: Open share URL in browser

**Expected Result**:
- ✅ Plan loads on Device B
- ✅ "Loaded from cloud" indicator shows
- ✅ All plan details match original
- ✅ No errors in console

### Test Case 3.5: localStorage Fallback on Same Device

**Steps**:
1. Disconnect from internet
2. Open previously shared plan URL (same device)

**Expected Result**:
- ✅ Plan loads from localStorage
- ✅ No "Loaded from cloud" indicator
- ✅ Plan content displays correctly

### Test Case 3.6: Invalid Share Token

**Steps**:
1. Navigate to `/shared/plan/invalid-token-123`

**Expected Result**:
- ✅ "Plan not found" message displays
- ✅ "Create your own" button appears
- ✅ No error thrown

### Test Case 3.7: Clipboard Copy Success

**Steps**:
1. Generate share link
2. Click "Copy Link" button

**Expected Result**:
- ✅ URL copied to clipboard
- ✅ Success toast appears
- ✅ Button text changes momentarily

### Test Case 3.8: Clipboard Copy Failure

**Steps**:
1. Use browser without clipboard API support
2. Click "Copy Link"

**Expected Result**:
- ✅ Fallback method used (textarea + execCommand)
- ✅ Error toast if both methods fail
- ✅ URL still visible for manual copy

---

## Feature 4: Shopping List Category Filter

**Components**:
- `src/components/shopping/ListControls.tsx`
- `src/components/shopping/ShoppingList.tsx`
- `src/constants/categories.ts`

### Test Case 4.1: Category Constant Consistency

**Steps**:
1. Check `INGREDIENT_CATEGORIES` in categories.ts
2. Check category usage in AddItemModal
3. Check category usage in ListControls

**Expected Result**:
- ✅ All three use same constant
- ✅ No hardcoded category arrays
- ✅ Categories match across components

### Test Case 4.2: Filter by Category - Proteins

**Steps**:
1. Add items from multiple categories to shopping list
2. Select "Proteins" filter

**Expected Result**:
- ✅ Only protein items visible
- ✅ Other categories hidden
- ✅ Item count updates
- ✅ "Show All" option available

### Test Case 4.3: Category Translation - Spanish

**Steps**:
1. Change language to Spanish
2. Check category dropdown in AddItemModal
3. Check category filter in ListControls

**Expected Result**:
- ✅ All categories translated to Spanish
- ✅ Translations match EN/ES/FR files
- ✅ No English text visible

### Test Case 4.4: Category Translation - French

**Steps**:
1. Change language to French
2. Verify all category labels

**Expected Result**:
- ✅ All categories in French
- ✅ Proper accents and characters
- ✅ Consistent with translation files

### Test Case 4.5: Empty Category

**Steps**:
1. Filter by category with no items

**Expected Result**:
- ✅ Empty state message displayed
- ✅ No errors
- ✅ Can switch to other categories

---

## Feature 5: Price Management UI

**Component**: `src/components/common/PriceManagementModal.tsx`

### Test Case 5.1: Open Price Management Modal

**Steps**:
1. Open any recipe detail page
2. Locate "Manage Prices" button
3. Click button

**Expected Result**:
- ✅ Modal opens
- ✅ All recipe ingredients listed
- ✅ Current prices displayed
- ✅ Edit icons visible

### Test Case 5.2: Edit Custom Price - Valid

**Steps**:
1. Open Price Management Modal
2. Click edit icon for ingredient
3. Enter price: "5.99"
4. Click save

**Expected Result**:
- ✅ Price updates to $5.99
- ✅ Success toast appears
- ✅ Edit mode exits
- ✅ New price persists in localStorage

### Test Case 5.3: Edit Custom Price - Invalid (Negative)

**Steps**:
1. Click edit icon
2. Enter price: "-3.50"
3. Click save

**Expected Result**:
- ❌ Price NOT saved
- ✅ Error toast: "Please enter a valid price greater than 0"
- ✅ Edit mode remains active

### Test Case 5.4: Edit Custom Price - Invalid (Zero)

**Steps**:
1. Enter price: "0"
2. Click save

**Expected Result**:
- ❌ Price NOT saved
- ✅ Error toast appears
- ✅ Original price retained

### Test Case 5.5: Edit Custom Price - Invalid (Non-numeric)

**Steps**:
1. Enter price: "abc"
2. Click save

**Expected Result**:
- ❌ Price NOT saved
- ✅ Error toast appears

### Test Case 5.6: Reset to Default Price

**Steps**:
1. Set custom price for ingredient
2. Click "Reset" icon
3. Confirm reset

**Expected Result**:
- ✅ Price reverts to default
- ✅ Custom price removed from localStorage
- ✅ Success toast appears

### Test Case 5.7: Price Persistence Across Sessions

**Steps**:
1. Set custom prices for 3 ingredients
2. Close modal
3. Refresh page
4. Reopen modal

**Expected Result**:
- ✅ All custom prices retained
- ✅ Displayed correctly
- ✅ Persisted in localStorage

### Test Case 5.8: Price Impact on Cost Calculations

**Steps**:
1. Set custom price for ingredient
2. Close modal
3. Check recipe total cost
4. Add recipe to meal plan
5. Check plan total cost

**Expected Result**:
- ✅ Recipe cost uses custom price
- ✅ Meal plan cost uses custom price
- ✅ Shopping list estimate updated
- ✅ All calculations consistent

---

## Feature 6: Toast Notification System

**Component**: `src/components/common/Toast.tsx`

### Test Case 6.1: Success Toast

**Steps**:
1. Trigger success action (e.g., save meal plan)

**Expected Result**:
- ✅ Green success toast appears
- ✅ Auto-dismisses after 3 seconds
- ✅ Can be manually dismissed
- ✅ Success icon visible

### Test Case 6.2: Error Toast

**Steps**:
1. Trigger validation error (e.g., invalid quantity)

**Expected Result**:
- ✅ Red error toast appears
- ✅ Error message clear
- ✅ Error icon visible
- ✅ Auto-dismisses

### Test Case 6.3: Warning Toast

**Steps**:
1. Trigger warning (e.g., cloud sync unavailable)

**Expected Result**:
- ✅ Yellow/orange warning toast
- ✅ Warning message displayed
- ✅ Warning icon visible

### Test Case 6.4: Multiple Toasts

**Steps**:
1. Trigger 3 actions rapidly
2. Observe toast stack

**Expected Result**:
- ✅ All toasts visible (stacked)
- ✅ Each dismisses independently
- ✅ No overlap issues
- ✅ Readable on mobile

### Test Case 6.5: Toast Accessibility

**Steps**:
1. Enable screen reader
2. Trigger toast notification

**Expected Result**:
- ✅ Toast announced by screen reader
- ✅ ARIA role="alert" present
- ✅ Keyboard dismissable

---

## Feature 7: Firebase Integration

**Service**: `src/services/firebaseService.ts`

### Test Case 7.1: Firebase Initialization

**Steps**:
1. Open app in browser
2. Check console for Firebase init

**Expected Result**:
- ✅ No Firebase errors in console
- ✅ Firebase app initialized
- ✅ Firestore connected

### Test Case 7.2: Share Plan to Firestore

**Steps**:
1. Create meal plan
2. Generate share link
3. Check Firestore console

**Expected Result**:
- ✅ Document created in `sharedPlans` collection
- ✅ Document ID matches share token
- ✅ `sharedAt` timestamp present
- ✅ `isPublic` = true

### Test Case 7.3: Load Plan from Firestore

**Steps**:
1. Open share URL on different device
2. Monitor network requests

**Expected Result**:
- ✅ Firestore getDoc request sent
- ✅ Plan data retrieved
- ✅ UI updates with plan
- ✅ "Loaded from cloud" indicator

### Test Case 7.4: Firestore Offline Fallback

**Steps**:
1. Disconnect from internet
2. Try to share plan

**Expected Result**:
- ✅ Warning toast appears
- ✅ Plan still saved locally
- ✅ No error thrown
- ✅ App remains functional

### Test Case 7.5: Invalid Share Token - Firestore

**Steps**:
1. Navigate to `/shared/plan/nonexistent`
2. Check Firestore request

**Expected Result**:
- ✅ Firestore request returns null
- ✅ Falls back to localStorage check
- ✅ "Plan not found" displayed
- ✅ No error thrown

### Test Case 7.6: Firestore Security Rules

**Steps**:
1. Go to Firebase Console > Firestore > Rules
2. Verify rules match FIREBASE_SETUP.md

**Expected Result**:
- ✅ Read: `allow read: if true;`
- ✅ Write: `allow write: if request.auth != null;`
- ✅ Delete: `allow delete: if request.auth != null && request.auth.uid == resource.data.createdBy;`

### Test Case 7.7: Cloud Sync Status Indicators

**Steps**:
1. Generate share link
2. Observe status indicators

**Expected Result**:
- ✅ "Syncing to cloud..." appears first
- ✅ Spinner animation visible
- ✅ Changes to "Cloud synced" with checkmark
- ✅ Green color for success

### Test Case 7.8: Firebase Bundle Size

**Steps**:
1. Run production build
2. Check bundle sizes

**Expected Result**:
- ✅ Firebase vendor: ~336 KiB
- ✅ Gzipped: ~101 KiB
- ✅ Total precache: ~1104 KiB
- ✅ Acceptable for PWA

---

## Cross-Browser Testing

### Test Case CB.1: Chrome Desktop

**Steps**: Run all 45 test cases in Chrome

**Expected Result**: ✅ All features work correctly

### Test Case CB.2: Firefox Desktop

**Steps**: Run all 45 test cases in Firefox

**Expected Result**: ✅ All features work correctly

### Test Case CB.3: Safari Desktop

**Steps**: Run all 45 test cases in Safari

**Expected Result**: ✅ All features work correctly

### Test Case CB.4: Edge Desktop

**Steps**: Run all 45 test cases in Edge

**Expected Result**: ✅ All features work correctly

### Test Case CB.5: Chrome Mobile

**Steps**: Test on Android Chrome

**Expected Result**:
- ✅ Responsive layout
- ✅ Touch targets adequate
- ✅ Modals full-screen on mobile

### Test Case CB.6: Safari iOS

**Steps**: Test on iPhone Safari

**Expected Result**:
- ✅ Responsive layout
- ✅ Touch interactions work
- ✅ No iOS-specific bugs

---

## Accessibility Testing

### Test Case A.1: Keyboard Navigation

**Steps**:
1. Navigate app using only Tab/Shift+Tab
2. Open modals, interact with forms

**Expected Result**:
- ✅ All interactive elements reachable
- ✅ Focus order logical
- ✅ Modals trap focus
- ✅ Escape key closes modals

### Test Case A.2: Screen Reader

**Steps**:
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate shopping list

**Expected Result**:
- ✅ All content announced
- ✅ ARIA labels present
- ✅ Form labels correct
- ✅ Toasts announced

### Test Case A.3: Color Contrast

**Steps**:
1. Use axe DevTools to check contrast
2. Test both light and dark mode

**Expected Result**:
- ✅ All text meets 4.5:1 ratio
- ✅ Interactive elements meet 3:1
- ✅ No contrast failures

---

## Performance Testing

### Test Case P.1: Lighthouse Score

**Steps**:
1. Run Lighthouse in Chrome DevTools
2. Test on production build

**Expected Result**:
- ✅ Performance: >90
- ✅ Accessibility: 100
- ✅ Best Practices: 100
- ✅ SEO: 100

### Test Case P.2: Bundle Size

**Steps**:
1. Run `npm run build`
2. Check dist/ folder sizes

**Expected Result**:
- ✅ Total precache: ~1104 KiB
- ✅ Firebase vendor: ~336 KiB gzipped
- ✅ Main bundle: optimized with tree-shaking

### Test Case P.3: Offline Performance

**Steps**:
1. Load app
2. Go offline
3. Navigate between pages

**Expected Result**:
- ✅ App shell cached
- ✅ Previously viewed recipes cached
- ✅ "Offline" indicator shows
- ✅ No broken functionality

---

## Test Execution Checklist

### Pre-Testing

- [ ] Build completes without errors
- [ ] TypeScript compilation passes
- [ ] All translations files present (EN/ES/FR)
- [ ] Firebase project configured
- [ ] Test data prepared

### During Testing

- [ ] Document all failures with screenshots
- [ ] Note browser/device for each failure
- [ ] Record steps to reproduce
- [ ] Check console for errors

### Post-Testing

- [ ] Create issues for any failures
- [ ] Update test plan with results
- [ ] Generate test report
- [ ] Share results with team

---

## Test Report Template

```
## Test Execution Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Build Version**: 1.0.0
**Browser**: [Browser Name + Version]
**Device**: [Desktop/Mobile/Tablet]

### Summary

- Total Test Cases: 45
- Passed: X
- Failed: Y
- Blocked: Z
- Pass Rate: X%

### Failed Test Cases

| ID | Test Case | Failure Description | Severity |
|----|-----------|-------------------|----------|
| 1.2 | Quantity Validation | Error toast not appearing | High |

### Notes

[Additional observations]
```

---

## Regression Testing

For future releases, re-run:
- All Feature 1-7 test cases
- Cross-browser smoke tests
- Accessibility checks
- Performance benchmarks

---

## Automated Testing Recommendations

Consider implementing:
1. **Vitest** - Unit tests for utilities (costCalculations.ts, storage.ts)
2. **React Testing Library** - Component tests
3. **Playwright** - E2E tests for critical flows
4. **Lighthouse CI** - Automated performance checks

---

**End of Test Plan**

Generated with Claude Code
Last Updated: 2025-11-25
