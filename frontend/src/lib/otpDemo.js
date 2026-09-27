export function getOtpDemoState(results) {
  if (!results) {
    return { allowed: false, keyBits: [], reason: 'Run a simulation first.' }
  }

  const keyBits = Array.isArray(results.post_sample_key)
    ? results.post_sample_key
    : []

  if (!results.otp_demo_allowed) {
    return {
      allowed: false,
      keyBits,
      reason: results.otp_demo_block_reason
        || 'Run a new simulation to evaluate OTP eligibility.',
    }
  }

  return { allowed: true, keyBits, reason: null }
}
