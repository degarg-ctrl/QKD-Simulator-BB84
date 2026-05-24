# Eve Entity Visibility Fix

**Date:** 2026-03-29  
**Status:** ✅ Complete

---

## Change Implemented

### Eve as Active Entity ✅
**Requirement:** When Eve is active, lanes pass through it (not overshadowed). When inactive, lanes can overshadow it.

**Implementation:**
```javascript
const eveActive = params.attack_prob > 0

if (eveActive) {
  // Draw lane in two segments: Alice to Eve, Eve to Bob
  ctx.beginPath()
  ctx.moveTo(ALICE_X + NODE_RADIUS, y)
  ctx.lineTo(EVE_X - NODE_RADIUS, y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(EVE_X + NODE_RADIUS, y)
  ctx.lineTo(BOB_X - NODE_RADIUS, y)
  ctx.stroke()
} else {
  // Draw continuous lane (Eve can be overshadowed)
  ctx.beginPath()
  ctx.moveTo(ALICE_X + NODE_RADIUS, y)
  ctx.lineTo(BOB_X - NODE_RADIUS, y)
  ctx.stroke()
}
```

---

## Behavior

### When Eve is Active (attack_prob > 0):
- ✅ Lanes split into two segments
- ✅ Segment 1: Alice → Eve
- ✅ Segment 2: Eve → Bob
- ✅ Eve node clearly visible (not overshadowed)
- ✅ Shows Eve is intercepting photons
- ✅ Eve displays red color with intercept percentage

### When Eve is Inactive (attack_prob = 0):
- ✅ Lanes drawn continuously from Alice → Bob
- ✅ Lane can pass over Eve node
- ✅ Eve appears grayed out (inactive color)
- ✅ Eve displays "Inactive" label
- ✅ Eve doesn't interfere with photon flow

---

## Visual Comparison

### Before:
- ❌ Lanes always continuous (overshadowed Eve even when active)
- ❌ Hard to see if Eve is participating

### After:
- ✅ Active Eve: lanes clearly pass through it
- ✅ Inactive Eve: lanes pass over it
- ✅ Visual distinction between active/inactive states
- ✅ Clear indication of Eve's role in the protocol

---

## Technical Details

### Files Modified:
1. **QuantumCanvas.jsx**
   - Added `eveActive` check in `drawChannelLanes`
   - Conditional lane drawing based on `params.attack_prob`
   - Added `params.attack_prob` to `useCallback` dependencies

### How It Works:
- Checks `params.attack_prob > 0` to determine if Eve is active
- If active: draws two lane segments (stops at Eve node)
- If inactive: draws one continuous lane (overshadows Eve)
- Eve node color already changes based on attack_prob (red/gray)

---

## Testing Checklist

### Eve Active:
- [ ] Set attack probability > 0 in controls
- [ ] Verify Eve node is red
- [ ] Verify lanes split at Eve (two segments visible)
- [ ] Verify Eve is not overshadowed by lanes
- [ ] Verify Eve shows intercept percentage

### Eve Inactive:
- [ ] Set attack probability = 0 in controls
- [ ] Verify Eve node is gray
- [ ] Verify lanes are continuous (pass over Eve)
- [ ] Verify Eve shows "Inactive" label
- [ ] Verify Eve can be overshadowed

### Transitions:
- [ ] Change attack_prob from 0 to > 0 → lanes split
- [ ] Change attack_prob from > 0 to 0 → lanes merge
- [ ] Smooth visual transition

---

## Quick Test

1. Open simulator
2. Set "Attack Probability" to 0% → Eve gray, lanes continuous
3. Set "Attack Probability" to 50% → Eve red, lanes split at Eve
4. Verify lanes clearly pass through Eve when active

---

**Status:** Ready for testing
**Impact:** Visual clarity improvement
**Risk:** Low - only affects rendering, no logic changes
