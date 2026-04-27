'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const MenuButton = ({ onClick, children, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full max-w-md p-6 text-xl font-semibold rounded-lg border-2 transition-all hover:scale-105 ${className}`}
  >
    {children}
  </button>
)

const InputField = ({ label, type = 'text', value, onChange, placeholder, required = false, step }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-2 text-slate-300">
      {label} {required && <span className="text-emerald-400">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      autoComplete="off"
      className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
    />
  </div>
)

const SelectField = ({ label, value, onChange, options, required = false }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-2 text-slate-300">
      {label} {required && <span className="text-emerald-400">*</span>}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
    >
      {options.map(option => (
        <option key={option.value} value={option.value} className="bg-slate-800 text-slate-100">
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

const LONG_SHORT_OPTIONS = [
  { value: 'long', label: 'Long (Buy)' },
  { value: 'short', label: 'Short (Sell)' }
]

const TRADE_CHECKLIST_SECTIONS = [
  {
    id: 'section1',
    title: 'SECTION 1 — FORECASTING & CONTEXT',
    items: [
      {
        id: 'forecastedToday',
        question: 'Did I forecast this pair today using TLFS?',
        type: 'boolean',
        reminderTitle: 'TLFS Reminder (Traffic Light Forecasting System):',
        reminderPoints: [
          'Green: Ideal, highest-probability scenario.',
          'Amber: Still good, alternate path.',
          'Red: Worst-case or least-likely scenario.',
          'Each scenario must include an override ("If price does X instead...").'
        ],
        note: "If you did not forecast it today, you are not allowed to trade it."
      },
      {
        id: 'scenarioPlayingOut',
        question: 'Is price currently playing out one of my forecasted scenarios?',
        type: 'boolean',
        note: 'Not "something vaguely close." It must be one of the exact Green or Amber scenarios.'
      },
      {
        id: 'topSetup',
        question: 'Is this one of my top 10 go-to setups?',
        type: 'boolean',
        note: "If not, you are improvising."
      }
    ]
  },
  {
    id: 'section2',
    title: 'SECTION 2 — LOCATION CHECK (RO3 + ZONES)',
    items: [
      {
        id: 'ro3Match',
        question: 'Does the approach match RO3?',
        type: 'boolean',
        reminderTitle: 'RO3 Reminder (Rule of Three — Nature of Approach):',
        reminderPoints: [
          'Impulsive approach: Strong, fast push into structure. Action: Avoid raw entries. Wait for impulse away + first correction.',
          'Corrective approach: Slow grind into level. Action: Still avoid raw edges. Wait for impulse away + first correction.',
          'Structural approach: Clean channel into level, sometimes piercing. Action: Most attractive for entries (risk entry OR retrace entry).'
        ],
        note: "If the approach does not match your plan, skip the trade."
      },
      {
        id: 'zone',
        question: 'What zone is price currently in (Green / Amber / Red)?',
        type: 'zone',
        note: 'Default rule: No new trades in Red Zone. If zone is not supportive and your ego still wants to enter, stop.'
      }
    ]
  },
  {
    id: 'section3',
    title: 'SECTION 3 — SETUP QUALITY (VALID / HP / INVALID)',
    items: [
      {
        id: 'isHighQuality',
        question: 'Is this trade at least a GOOD VALID, preferably HP?',
        type: 'boolean',
        reminderTitle: 'Validity Reminder:',
        reminderPoints: [
          'HP (High Probability): Many strong confluences, few negatives.',
          'Valid: Positives roughly equal negatives but still meets criteria.',
          'Invalid: Fails Falcon entry criteria and cannot be taken.'
        ],
        note: 'If it is barely Valid or you are trying to force it into HP, stop.'
      },
      {
        id: 'structureAlignment',
        question: 'Does the setup align with BOTH HTF and LTF structure?',
        type: 'boolean',
        note: 'No conflict. The story must be clean across timeframes.'
      },
      {
        id: 'playbookPattern',
        question: "Does the entry pattern fit Falcon's playbook?",
        type: 'boolean',
        note: 'Flags, channels, wedges, patterns-within-patterns. Not randomness, not vibes.'
      }
    ]
  },
  {
    id: 'section4',
    title: 'SECTION 4 — RISK, TARGETS & EXECUTION',
    items: [
      {
        id: 'riskCalculated',
        question: 'Have I calculated risk precisely at 1%?',
        type: 'boolean',
        note: "If you are fudging this, you are not a trader — you are a gambler."
      },
      {
        id: 'riskReward',
        question: 'Does this trade allow RR ≥ 3:1?',
        type: 'boolean',
        note: 'And does the market have room to actually travel that distance?'
      },
      {
        id: 'stopLossLogic',
        question: 'Is my stop loss placed logically (not tightened emotionally)?',
        type: 'boolean',
        note: 'Safe, justified, and placed relative to structure — not fear.'
      },
      {
        id: 'breakevenPlan',
        question: 'Can I reasonably move to breakeven before the next major inflection?',
        type: 'boolean',
        note: "If not, you are exposing yourself to stupid losses."
      },
      {
        id: 'spreadsAcceptable',
        question: 'Are spreads acceptable and not in a bad session (e.g. rollover)?',
        type: 'boolean',
        note: 'If not, you are feeding the broker.'
      },
      {
        id: 'ownAnalysis',
        question: 'Is this my own analysis?',
        type: 'boolean',
        note: "If it is influenced by someone else's idea, you have already broken the system."
      },
      {
        id: 'acceptedLoss',
        question: 'Have I fully accepted that this might be a loss, even if it is perfect?',
        type: 'boolean',
        note: 'If you emotionally need this trade to work, you are not ready to take it.'
      }
    ]
  }
]

const DEFAULT_CHECKLIST_LOG_COLUMNS = {
  id: 'id',
  tradeId: 'trade_id',
  answers: 'answers',
  zone: 'zone',
  status: 'status',
  createdAt: 'created_at'
}

const DEFAULT_CHECKLIST_ATTEMPT_COLUMNS = {
  id: 'id',
  answers: 'snapshot',
  status: 'status',
  failureReason: 'failure_reason',
  createdAt: 'created_at'
}

const FalconFXChecklist = ({ onBack, onUnlock, onLogAttempt }) => {
  const [checked, setChecked] = useState({})
  const [ruleOfThree, setRuleOfThree] = useState('')
  const [zone, setZone] = useState('')
  const [activeTab, setActiveTab] = useState('checklist')
  const [unlocking, setUnlocking] = useState(false)
  const [feedback, setFeedback] = useState('')

  const steps = [
    { num: 1, section: 'Foundation', question: 'Have I forecasted this trade?', hint: 'Did you complete top-down (HTF → LTF) analysis on this pair before this setup appeared? No last-minute chart-jumping.' },
    { num: 2, section: 'Foundation', question: 'Is this setup in my Trading Plan?', hint: "Does this match one of your pre-defined go-to setups? Not someone else's trade. Not a setup type you've never traded before." },
    { num: 3, section: 'Multi-Timeframe Analysis', question: 'Have I checked the full HTF structure?', hint: 'Monthly → Weekly → Daily → 4H → 1H → 15M. Know where price sits in the bigger picture before zooming in.' },
    { num: 4, section: 'Rule of Three', question: 'How is price approaching structure?', hint: 'Identify the approach type. This determines your entry method.', isRuleOfThree: true,
      options: [
        { value: 'Impulsive', title: 'Impulsive', desc: 'Strong, fast push into structure' },
        { value: 'Corrective', title: 'Corrective', desc: 'Slow grind into level' },
        { value: 'Structural', title: 'Structural', desc: 'Clean channel into level' }
      ]
    },
    { num: 5, section: 'Zone Check', question: 'Which zone is price in?', hint: 'Red zone = no trade.', isZone: true,
      zones: [
        { value: 'Green', label: 'Green Zone' },
        { value: 'Amber', label: 'Amber Zone' },
        { value: 'Red', label: 'Red Zone — No Trade' }
      ]
    },
    { num: 6, section: 'Price Action', question: 'Is the price action confirming?', hint: 'Are you seeing actual confirmation via candles, structure, or patterns? Or are you forcing it?' },
    { num: 7, section: 'Risk Management', question: 'Have I sized position correctly at 1% risk?', hint: 'Your position size should risk exactly 1% of your account balance based on your stop loss distance.' },
    { num: 8, section: 'Risk Management', question: 'Do I know my invalidation point?', hint: 'Where is your stop loss? Is it logical or emotional? Can you accept the loss if hit?' },
    { num: 9, section: 'Risk/Reward', question: 'Is my R:R minimum 1.5:1?', hint: 'Does this trade offer at least 1.5R reward for the 1R risk? And does the market have room to travel that distance?' },
    { num: 10, section: 'Final Check', question: 'Have I documented everything?', hint: 'Screenshots, forecast, entry logic, stop, target. Is everything ready to journal post-trade?' }
  ]

  const booleanSteps = steps.filter(s => !s.isRuleOfThree && !s.isZone).map(s => s.num)
  const allBooleanChecked = booleanSteps.every(n => checked[n])
  const canProceed = allBooleanChecked && ruleOfThree !== '' && zone !== '' && zone !== 'Red'

  const createSnapshot = () => ({
    recordedAt: new Date().toISOString(),
    step1_forecasted: !!checked[1],
    step2_in_plan: !!checked[2],
    step3_htf_checked: !!checked[3],
    step4_rule_of_three: ruleOfThree || null,
    step5_zone: zone || null,
    step6_confirmation: !!checked[6],
    step7_position_sized: !!checked[7],
    step8_invalidation_known: !!checked[8],
    step9_rr_checked: !!checked[9],
    step10_documented: !!checked[10],
    blocking_messages: [],
    completed: canProceed
  })

  const handleProceed = async () => {
    if (!canProceed || !onUnlock) return
    setUnlocking(true)
    setFeedback('')
    try {
      await onUnlock(createSnapshot())
    } catch (err) {
      setFeedback(err?.message ? `Error: ${err.message}` : 'Unable to proceed.')
      setUnlocking(false)
    }
  }

  const handleReset = () => {
    setChecked({})
    setRuleOfThree('')
    setZone('')
    setFeedback('')
  }

  const completedCount = booleanSteps.filter(n => checked[n]).length + (ruleOfThree ? 1 : 0) + (zone && zone !== 'Red' ? 1 : 0)
  const totalCount = steps.length
  const progress = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100">
      {/* Navigation */}
      <nav className="bg-slate-900/95 border-b border-slate-800 px-4 py-3 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-blue-400">Falcon FX</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Pre-Trade Checklist</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('checklist')} className={`px-3 py-2 text-sm font-medium rounded transition-colors ${activeTab === 'checklist' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`}>Checklist</button>
            <button onClick={() => setActiveTab('reference')} className={`px-3 py-2 text-sm font-medium rounded transition-colors ${activeTab === 'reference' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`}>Reference</button>
          </div>
        </div>
      </nav>

      {/* Checklist Tab */}
      {activeTab === 'checklist' && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <button onClick={onBack} className="mb-5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors text-sm">
            ← Back to Menu
          </button>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>{completedCount}/{totalCount} complete</span>
            </div>
            <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map(step => {
              const isComplete = step.isRuleOfThree ? !!ruleOfThree : step.isZone ? (!!zone && zone !== 'Red') : !!checked[step.num]
              return (
                <div key={step.num} className={`bg-slate-900 border rounded-lg p-4 transition-colors ${isComplete ? 'border-emerald-700/50' : 'border-slate-800'}`}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox / completion indicator */}
                    {!step.isRuleOfThree && !step.isZone && (
                      <button
                        onClick={() => setChecked(prev => ({ ...prev, [step.num]: !prev[step.num] }))}
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          checked[step.num] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {checked[step.num] && <span className="text-white text-xs font-bold">✓</span>}
                      </button>
                    )}
                    {(step.isRuleOfThree || step.isZone) && (
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isComplete ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                        {isComplete && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-blue-400 w-5">{step.num}.</span>
                        <span className="text-xs uppercase tracking-wide text-slate-500">{step.section}</span>
                      </div>
                      <p className={`text-sm font-medium mb-1 ${isComplete ? 'text-slate-300' : 'text-white'}`}>{step.question}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{step.hint}</p>

                      {/* Rule of Three radio buttons */}
                      {step.isRuleOfThree && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {step.options.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setRuleOfThree(opt.value)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                ruleOfThree === opt.value
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {opt.title}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Zone radio buttons */}
                      {step.isZone && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {step.zones.map(z => (
                            <button
                              key={z.value}
                              onClick={() => setZone(z.value)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                zone === z.value
                                  ? z.value === 'Green' ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : z.value === 'Amber' ? 'bg-amber-600 border-amber-500 text-white'
                                    : 'bg-red-700 border-red-600 text-white'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {z.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {step.isZone && zone === 'Red' && (
                        <p className="text-xs text-red-400 mt-2 font-medium">Red Zone = NO TRADE. Wait for price to reach Green or Amber.</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="mt-4 p-3 rounded-lg border bg-red-900/20 text-red-300 border-red-800 text-sm">{feedback}</div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={handleReset} className="px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
              Reset
            </button>
            <button
              type="button"
              disabled={!canProceed || unlocking}
              onClick={handleProceed}
              className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all text-sm ${
                canProceed && !unlocking
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {unlocking ? 'Opening...' : canProceed ? 'Confirm & Log Trade →' : `Complete all steps to proceed`}
            </button>
          </div>
        </div>
      )}

      {/* Reference Tab */}
      {activeTab === 'reference' && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Quick Reference</h2>
            <p className="text-slate-400 text-sm">
              Use these resources while completing your checklist. Understanding these concepts helps you make better decisions.
            </p>
          </div>

          {/* Key Concepts */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
              Key Concepts
            </h3>
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-blue-400 w-40">RO3</td>
                    <td className="px-4 py-3 text-slate-300">Rule of Three — Nature of approach: Impulsive, Corrective, or Structural</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-blue-400">TLFS</td>
                    <td className="px-4 py-3 text-slate-300">Traffic Light Forecasting System — Green (ideal), Amber (alternate), Red (worst-case)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-blue-400">HP</td>
                    <td className="px-4 py-3 text-slate-300">High Probability — Many confluences, few negatives, meets all criteria</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-blue-400">Valid</td>
                    <td className="px-4 py-3 text-slate-300">Valid trade — Meets criteria but not HP. Still tradeable.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-blue-400">HTF</td>
                    <td className="px-4 py-3 text-slate-300">Higher Time Frame — Monthly, Weekly, Daily, 4H</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-blue-400">LTF</td>
                    <td className="px-4 py-3 text-slate-300">Lower Time Frame — 1H, 15M, 5M for entry timing</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-blue-400">R:R</td>
                    <td className="px-4 py-3 text-slate-300">Risk:Reward ratio — Minimum 1.5:1, ideally 3:1+</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Zone Meanings */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-800">
              Zone System
            </h3>
            <div className="grid gap-3">
              <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
                <h4 className="font-bold text-emerald-400 mb-2">Green Zone</h4>
                <p className="text-xs text-slate-300">
                  High-probability area. Price is where you want it. Structure supports the idea. Take trades confidently.
                </p>
              </div>
              <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
                <h4 className="font-bold text-amber-400 mb-2">Amber Zone</h4>
                <p className="text-xs text-slate-300">
                  Acceptable but not ideal. Still tradeable but requires more caution. Reduce size if needed.
                </p>
              </div>
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <h4 className="font-bold text-red-400 mb-2">Red Zone</h4>
                <p className="text-xs text-slate-300">
                  NO TRADES ALLOWED. Price is in a bad location. Walk away. You're not missing out — you're preserving capital.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ChecklistAnswersList = ({ snapshot }) => {
  if (!snapshot) return null

  // Check if this is new format (10-step flowchart) or old format (section-based)
  const isNewFormat = snapshot.step1_forecasted !== undefined || snapshot.completed !== undefined

  if (isNewFormat) {
    // New Falcon FX Flowchart format
    const steps = [
      { num: 1, question: 'Have I forecasted this trade?', field: 'step1_forecasted' },
      { num: 2, question: 'Is this setup in my Trading Plan?', field: 'step2_in_plan' },
      { num: 3, question: 'Have I checked the full HTF structure?', field: 'step3_htf_checked' },
      { num: 4, question: 'How is price approaching structure?', field: 'step4_rule_of_three', isSpecial: true },
      { num: 5, question: 'Which zone is price in?', field: 'step5_zone', isZone: true },
      { num: 6, question: 'Is the price action confirming?', field: 'step6_confirmation' },
      { num: 7, question: 'Have I sized position correctly at 1% risk?', field: 'step7_position_sized' },
      { num: 8, question: 'Do I know my invalidation point?', field: 'step8_invalidation_known' },
      { num: 9, question: 'Is my R:R minimum 1.5:1?', field: 'step9_rr_checked' },
      { num: 10, question: 'Have I documented everything?', field: 'step10_documented' }
    ]

    return (
      <div className="space-y-4">
        {/* Overall Status Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`px-4 py-2 rounded-lg border font-semibold text-sm ${
            snapshot.completed
              ? 'bg-emerald-600/20 text-emerald-200 border-emerald-500/50'
              : 'bg-amber-500/20 text-amber-200 border-amber-400/50'
          }`}>
            {snapshot.completed ? '✓ Checklist Completed' : '⚠ Checklist Incomplete'}
          </div>
          {snapshot.step5_zone && (
            <div className={`px-4 py-2 rounded-lg border font-semibold text-sm ${
              snapshot.step5_zone === 'Green'
                ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50'
                : snapshot.step5_zone === 'Amber'
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                : 'bg-red-600/30 text-red-200 border-red-500/50'
            }`}>
              {snapshot.step5_zone} Zone
            </div>
          )}
        </div>

        {/* 10 Steps Display */}
        <div className="grid gap-2">
          {steps.map(step => {
            const value = snapshot[step.field]
            let display, badgeClasses

            if (step.isZone) {
              display = value || '—'
              badgeClasses = value === 'Green'
                ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50'
                : value === 'Amber'
                ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                : value === 'Red'
                ? 'bg-red-600/30 text-red-200 border-red-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            } else if (step.isSpecial) {
              display = value || '—'
              badgeClasses = value
                ? 'bg-blue-600/20 text-blue-200 border-blue-400/50'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            } else {
              display = value === true ? 'YES' : value === false ? 'NO' : '—'
              badgeClasses = value === true
                ? 'bg-emerald-600/20 text-emerald-200 border-emerald-400/50'
                : value === false
                ? 'bg-red-600/20 text-red-200 border-red-400/50'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }

            return (
              <div key={step.num} className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-900/50 border border-blue-700 text-blue-300 text-xs font-bold rounded-full flex-shrink-0">
                    {step.num}
                  </div>
                  <p className="text-slate-100 text-sm">{step.question}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-semibold tracking-wide border ${badgeClasses} flex-shrink-0`}>
                  {display}
                </span>
              </div>
            )
          })}
        </div>

        {/* Blocking Messages */}
        {snapshot.blocking_messages && Array.isArray(snapshot.blocking_messages) && snapshot.blocking_messages.length > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mt-4">
            <p className="text-red-400 text-sm font-semibold mb-2">Blocking Messages Encountered:</p>
            <ul className="space-y-2">
              {snapshot.blocking_messages.map((block, idx) => (
                <li key={idx} className="text-xs text-slate-300">
                  <span className="text-red-400 font-semibold">{block.step}:</span> {block.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-slate-500 mt-4">
          Snapshot recorded at {snapshot.recordedAt ? new Date(snapshot.recordedAt).toLocaleString() : snapshot.completed_at ? new Date(snapshot.completed_at).toLocaleString() : 'N/A'}.
        </p>
      </div>
    )
  }

  // Old format (backward compatibility)
  const responses = snapshot.responses || {}
  return (
    <div className="space-y-6">
      {TRADE_CHECKLIST_SECTIONS.map(section => (
        <div key={section.id} className="space-y-3">
          <p className="text-sm font-semibold text-emerald-200 uppercase">{section.title}</p>
          <div className="space-y-2">
            {section.items.map(item => {
              const value = item.type === 'zone' ? snapshot.zone : responses[item.id]
              const display = value ? value.toString().toUpperCase() : '—'
              const badgeClasses = item.type === 'zone'
                ? value === 'Green'
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50'
                  : value === 'Amber'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                    : value === 'Red'
                      ? 'bg-red-600/30 text-red-200 border border-red-500/50'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                : value === 'yes'
                  ? 'bg-emerald-600/20 text-emerald-200 border border-emerald-400/50'
                  : value === 'no'
                    ? 'bg-red-600/20 text-red-200 border border-red-400/50'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
              return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-900/40 border border-slate-800 rounded-lg p-3">
                  <p className="text-slate-100 text-sm">{item.question}</p>
                  <span className={`px-3 py-1 rounded text-xs font-semibold tracking-wide text-center ${badgeClasses}`}>
                    {display}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">
        Snapshot recorded at {snapshot.recordedAt ? new Date(snapshot.recordedAt).toLocaleString() : 'N/A'}.
      </p>
    </div>
  )
}

const ChecklistAnalyticsCard = ({ config }) => {
  const checklistConfig = config.checklist || {}
  const attemptsTable = checklistConfig.tables?.attempts
  const attemptColumns = checklistConfig.attemptColumns || DEFAULT_CHECKLIST_ATTEMPT_COLUMNS
  const workspaceValue = checklistConfig.workspaceValue || config.key

  const [stats, setStats] = useState({ total: 0, passes: 0, fails: 0, failReasons: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!attemptsTable || !attemptColumns) {
      setStats({ total: 0, passes: 0, fails: 0, failReasons: {} })
      setLoading(false)
      return
    }

    const loadStats = async () => {
      setLoading(true)
      setError('')
      try {
        let query = supabase
          .from(attemptsTable)
          .select('*')
          .order(attemptColumns.createdAt, { ascending: false })
          .limit(200)
        if (attemptColumns.workspace && workspaceValue) {
          query = query.eq(attemptColumns.workspace, workspaceValue)
        }
        const { data, error: queryError } = await query
        if (queryError) throw queryError
        const rows = data || []
        const passCount = rows.filter(row => (row[attemptColumns.status] || '').toLowerCase() === 'passed').length
        const failCount = rows.filter(row => (row[attemptColumns.status] || '').toLowerCase() === 'failed').length
        const failReasons = rows.reduce((acc, row) => {
          const status = (row[attemptColumns.status] || '').toLowerCase()
          if (status !== 'failed') return acc
          const reason = row[attemptColumns.failureReason] || 'Unspecified'
          acc[reason] = (acc[reason] || 0) + 1
          return acc
        }, {})
        setStats({ total: rows.length, passes: passCount, fails: failCount, failReasons })
      } catch (err) {
        setError(err?.message || 'Unable to load checklist analytics.')
      }
      setLoading(false)
    }

    loadStats()
  }, [attemptsTable, attemptColumns, workspaceValue])

  if (!attemptsTable) return null

  const passRate = stats.total ? ((stats.passes / stats.total) * 100).toFixed(1) : '0.0'
  const failRate = stats.total ? ((stats.fails / stats.total) * 100).toFixed(1) : '0.0'
  const topFailure = Object.entries(stats.failReasons || {}).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500 tracking-widest">Decision Gate Discipline</p>
          <h2 className="text-2xl font-bold text-white">Checklist Analytics</h2>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600/10 text-emerald-200 border border-emerald-500/30">
          Last {stats.total} attempts
        </span>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading ? (
        <p className="text-slate-400 text-sm">Loading checklist stats...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-500 tracking-wide uppercase">Pass Rate</p>
            <p className="text-3xl font-bold text-emerald-300">{passRate}%</p>
            <p className="text-xs text-slate-500 mt-1">{stats.passes} passes</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-500 tracking-wide uppercase">Failures Logged</p>
            <p className="text-3xl font-bold text-red-300">{stats.fails}</p>
            <p className="text-xs text-slate-500 mt-1">{failRate}% of attempts</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-500 tracking-wide uppercase">Consistency</p>
            <p className="text-lg font-semibold text-slate-100">Forecast discipline trend</p>
            <p className="text-xs text-slate-500 mt-1">Log every pass/fail to spot habits.</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
            <p className="text-xs text-slate-500 tracking-wide uppercase">Top Failure Reason</p>
            {topFailure ? (
              <>
                <p className="text-lg font-semibold text-amber-300">{topFailure[0]}</p>
                <p className="text-xs text-slate-500 mt-1">{topFailure[1]} occurrences</p>
              </>
            ) : (
              <p className="text-slate-400 text-sm">No failures logged.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const MODE_CONFIG = {
  options: {
    key: 'options',
    journalTitle: "Nik's Options Trading Journal",
    environmentTitle: 'Options Trading Workspace',
    environmentDescription: 'Track option contracts, cash flow, and post-trade notes for your call and put strategies.',
    homeButtonLabel: 'Options Trades',
    menuTagline: 'Capture your options trades with full contract details.',
    features: {
      missedTrades: true,
      analytics: false,
      tradingPlan: true
    },
    accounts: [],
    checklist: {
      tables: {
        logs: 'options_checklist_logs',
        attempts: 'options_checklist_attempts'
      },
      workspaceValue: 'options'
    },
    tables: {
      trades: 'options_trades',
      balance: 'options_balance_history',
      missed: 'options_missed_trades',
      partialExits: 'options_partial_exits',
      tagLinks: 'options_trade_tag_links',
      plan: 'options_trading_plan'
    },
    tradeColumns: {
      instrument: 'ticker',
      direction: 'position_side',
      optionType: 'option_type',
      strike: 'strike_price',
      expiry: 'expiry_date',
      contracts: 'contracts',
      premium: 'premium',
      forecastUrl: 'forecast_url',
      entryUrl: 'entry_url',
      notes: 'notes',
      status: 'status',
      pnl: 'pnl',
      entryDate: 'entry_date',
      exitDate: 'exit_date',
      exitUrl: 'exit_url',
      id: 'id'
    },
    balanceColumns: {
      id: 'id',
      balance: 'balance',
      changeAmount: 'change_amount',
      reason: 'change_reason',
      tradeId: 'trade_id',
      createdAt: 'created_at',
      currency: null
    },
    missedColumns: {
      id: 'id',
      instrument: 'ticker',
      direction: 'direction',
      beforeUrl: 'before_url',
      afterUrl: 'after_url',
      pattern: 'pattern',
      potential: 'potential_return',
      createdAt: 'created_at'
    },
    missedAnalyticsLabels: {
      day: 'By Day of Week',
      instrument: 'By Ticker',
      pattern: 'Top Setups Missed'
    },
    missedPatternOptions: [
      { value: '', label: 'Select a setup...' },
      { value: 'Breakout', label: 'Breakout' },
      { value: 'Bull Flag', label: 'Bull Flag' },
      { value: 'Bear Flag', label: 'Bear Flag' },
      { value: 'Pullback', label: 'Pullback' },
      { value: 'Reversal', label: 'Reversal' }
    ],
    planColumns: {
      id: 'id',
      content: 'content',
      updatedAt: 'updated_at'
    },
    labels: {
      instrument: 'Ticker Symbol',
      instrumentPlaceholder: 'e.g., AAPL',
      balanceTitle: 'Options Account Balance',
      balanceHeroLabel: 'Account Balance:',
      addBalanceButton: 'Add Deposit/Withdrawal',
      addBalanceModalTitle: 'Add Deposit or Withdrawal',
      addBalancePlaceholder: 'e.g., Funding account, Broker fees',
      addBalanceSubmit: 'Add Transaction',
      newBalanceToggleCancel: 'Cancel',
      historyTitle: 'Recent Balance Changes',
      newTradeButton: 'Log Option Trade',
      updateTradeButton: 'Close Existing Option Trade',
      viewDataButton: 'View Option History',
      tradingPlanButton: 'Options Playbook',
      stopSizeLabel: null,
      entryUrlLabel: 'Trade Notes URL (Optional)',
      forecastUrlLabel: 'Forecast TradingView URL (Optional)',
      notesLabel: 'Notes (Optional)',
      pnlLabel: 'P&L ($)',
      planTitle: 'Options Playbook',
      planSave: 'Save Playbook',
      menuBack: '← All Workspaces',
      riskSummaryLabel: 'Account Balance',
      analyticsInstrumentTitle: 'Ticker Performance',
      missedTableInstrument: 'Ticker',
      missedTablePattern: 'Pattern',
      missedPatternPlaceholder: 'Select a pattern...',
      newTradeTitle: 'Log Option Trade',
      balanceToggleLabel: 'Add Deposit/Withdrawal',
      optionTypeLabel: 'Option Type',
      directionLabel: 'Position',
      strikeLabel: 'Strike Price ($)',
      expiryLabel: 'Expiration Date',
      contractsLabel: 'Contracts',
      premiumLabel: 'Premium ($ per contract)',
      greeksCalculatorButton: 'Greeks Calculator',
      editTradeButton: 'Edit Trade Details',
      missedTradeButton: 'Log Missed Option Trade',
      missedDataButton: 'Review Missed Options',
      missedPattern: 'Setup Spotted',
      partialExitButton: 'Log Partial Exit',
      manageTagsButton: 'Manage Tags'
    },
    optionTypeOptions: [
      { value: 'call', label: 'Call' },
      { value: 'put', label: 'Put' }
    ],
    directionOptions: [
      { value: 'long', label: 'Long (Buy)' },
      { value: 'short', label: 'Short (Sell)' }
    ],
    formDefaults: {
      instrument: '',
      optionType: 'call',
      direction: 'long',
      strike: '',
      expiry: '',
      contracts: '',
      premium: '',
      entryUrl: '',
      forecastUrl: '',
      notes: ''
    },
    riskFraction: 0.005,
    stopSizeStep: null,
    uppercaseInstrument: true,
    classes: {
      primaryButton: 'bg-purple-600 hover:bg-purple-700 border-purple-500 text-white',
      primaryAction: 'bg-purple-600 hover:bg-purple-700 text-white'
    }
  },
  futures: {
    key: 'futures',
    journalTitle: "Nik's Futures Trading Journal",
    environmentTitle: 'Futures Trading Workspace',
    environmentDescription: 'Track futures contracts with position sizing, risk management, and pre-trade discipline.',
    homeButtonLabel: 'Futures Trades',
    menuTagline: 'Manage your futures positions with precise position sizing.',
    features: {
      missedTrades: true,
      analytics: true,
      tradingPlan: true,
      positionSizer: true
    },
    accounts: [],
    checklist: {
      tables: {
        logs: 'futures_checklist_logs',
        attempts: 'futures_checklist_attempts'
      },
      workspaceValue: 'futures'
    },
    tables: {
      trades: 'futures_trades',
      balance: 'futures_balance_history',
      missed: 'futures_missed_trades',
      partialExits: 'futures_partial_exits',
      tagLinks: 'futures_trade_tag_links',
      plan: 'futures_trading_plan'
    },
    tradeColumns: {
      instrument: 'ticker',
      direction: 'direction',
      contracts: 'contracts',
      entryPrice: 'entry_price',
      dollarPerTick: 'dollar_per_tick',
      stopLossTicks: 'stop_loss_ticks',
      targetTicks: 'target_ticks',
      notes: 'notes',
      forecastUrl: 'forecast_url',
      entryUrl: 'entry_url',
      status: 'status',
      pnl: 'pnl',
      entryDate: 'entry_date',
      exitDate: 'exit_date',
      exitUrl: 'exit_url',
      id: 'id'
    },
    balanceColumns: {
      id: 'id',
      balance: 'balance',
      changeAmount: 'change_amount',
      reason: 'change_reason',
      tradeId: 'trade_id',
      createdAt: 'created_at',
      currency: null
    },
    missedColumns: {
      id: 'id',
      instrument: 'ticker',
      direction: 'direction',
      beforeUrl: 'before_url',
      afterUrl: 'after_url',
      pattern: 'pattern',
      potential: 'potential_return',
      createdAt: 'created_at'
    },
    missedAnalyticsLabels: {
      day: 'By Day of Week',
      instrument: 'By Symbol',
      pattern: 'Top Setups Missed'
    },
    missedPatternOptions: [
      { value: '', label: 'Select a setup...' },
      { value: 'Breakout', label: 'Breakout' },
      { value: 'Pullback', label: 'Pullback' },
      { value: 'Trend Continuation', label: 'Trend Continuation' },
      { value: 'Reversal', label: 'Reversal' },
      { value: 'Gap and Go', label: 'Gap and Go' }
    ],
    planColumns: {
      id: 'id',
      content: 'content',
      updatedAt: 'updated_at'
    },
    labels: {
      instrument: 'Ticker/Symbol',
      instrumentPlaceholder: 'e.g., ES, NQ, CL, GC',
      balanceTitle: 'Futures Account Balance',
      balanceHeroLabel: 'Account Balance:',
      addBalanceButton: 'Add Deposit/Withdrawal',
      addBalanceModalTitle: 'Add Deposit or Withdrawal',
      addBalancePlaceholder: 'e.g., Funding account, Margin adjustment',
      addBalanceSubmit: 'Add Transaction',
      newBalanceToggleCancel: 'Cancel',
      historyTitle: 'Recent Balance Changes',
      newTradeButton: 'Log Futures Trade',
      updateTradeButton: 'Close Existing Futures Trade',
      viewDataButton: 'View Futures History',
      tradingPlanButton: 'Futures Playbook',
      positionSizerButton: 'Position Sizing Calculator',
      entryUrlLabel: 'Entry Chart URL (Optional)',
      forecastUrlLabel: 'Forecast TradingView URL (Optional)',
      notesLabel: 'Notes (Optional)',
      pnlLabel: 'P&L ($)',
      planTitle: 'Futures Playbook',
      planSave: 'Save Playbook',
      menuBack: '← All Workspaces',
      riskSummaryLabel: 'Account Balance',
      analyticsInstrumentTitle: 'Symbol Performance',
      newTradeTitle: 'Log Futures Trade',
      balanceToggleLabel: 'Add Deposit/Withdrawal',
      directionLabel: 'Direction',
      contractsLabel: 'Contracts',
      entryPriceLabel: 'Entry Price',
      dollarPerTickLabel: 'Dollar per Tick ($)',
      stopLossTicksLabel: 'Stop Loss (Ticks)',
      targetTicksLabel: 'Target (Ticks)',
      editTradeButton: 'Edit Trade Details',
      missedTradeButton: 'Log Missed Futures Trade',
      missedDataButton: 'Review Missed Futures',
      missedPattern: 'Setup Spotted',
      missedTableInstrument: 'Symbol',
      missedTablePattern: 'Setup',
      missedPatternPlaceholder: 'Select a setup...',
      partialExitButton: 'Log Partial Exit',
      manageTagsButton: 'Manage Tags'
    },
    analyticsLabels: {
      day: 'Day of Week Performance',
      instrument: 'Symbol Performance'
    },
    directionOptions: [
      { value: 'long', label: 'Long (Buy)' },
      { value: 'short', label: 'Short (Sell)' }
    ],
    formDefaults: {
      instrument: '',
      direction: 'long',
      contracts: '',
      entryPrice: '',
      dollarPerTick: '',
      stopLossTicks: '',
      targetTicks: '',
      forecastUrl: '',
      entryUrl: '',
      notes: ''
    },
    tickPresets: [
      { symbol: 'ES', dollarPerTick: 12.50, description: 'E-mini S&P 500' },
      { symbol: 'NQ', dollarPerTick: 5.00, description: 'E-mini Nasdaq 100' },
      { symbol: 'CL', dollarPerTick: 10.00, description: 'Crude Oil' },
      { symbol: 'GC', dollarPerTick: 10.00, description: 'Gold' },
      { symbol: 'MES', dollarPerTick: 1.25, description: 'Micro E-mini S&P' },
      { symbol: 'MNQ', dollarPerTick: 0.50, description: 'Micro E-mini Nasdaq' },
      { symbol: 'RTY', dollarPerTick: 5.00, description: 'E-mini Russell 2000' }
    ],
    riskFraction: 0.01,
    uppercaseInstrument: true,
    classes: {
      primaryButton: 'bg-amber-600 hover:bg-amber-700 border-amber-500 text-white',
      primaryAction: 'bg-amber-600 hover:bg-amber-700 text-white'
    }
  }
}

const BalanceManager = ({ config }) => {
  const { tables, balanceColumns, labels, classes, accounts = [] } = config
  const balanceTable = tables.balance
  const createdAtColumn = balanceColumns.createdAt
  const balanceColumn = balanceColumns.balance
  const changeAmountColumn = balanceColumns.changeAmount
  const reasonColumn = balanceColumns.reason
  const idColumn = balanceColumns.id
  const currencyColumn = balanceColumns.currency

  const hasMultipleAccounts = accounts.length > 0 && currencyColumn

  const [currentBalance, setCurrentBalance] = useState(0)
  const [currentBalances, setCurrentBalances] = useState({})
  const [balanceHistory, setBalanceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddBalance, setShowAddBalance] = useState(false)
  const [newBalance, setNewBalance] = useState({ amount: '', reason: '' })
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.value || '')

  useEffect(() => {
    if (accounts.length) {
      setSelectedAccount(accounts[0]?.value || '')
    }
  }, [accounts])

  const loadBalanceData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: history, error } = await supabase
        .from(balanceTable)
        .select('*')
        .order(createdAtColumn, { ascending: false })

      if (error) throw error
      const historyData = history || []
      setBalanceHistory(historyData)

      if (hasMultipleAccounts) {
        const balances = accounts.reduce((acc, account) => {
          const latest = historyData.find(entry => entry[currencyColumn] === account.value)
          acc[account.value] = latest ? parseFloat(latest[balanceColumn]) || 0 : 0
          return acc
        }, {})
        setCurrentBalances(balances)
      } else {
        const latest = historyData[0]
        setCurrentBalance(latest ? parseFloat(latest[balanceColumn]) || 0 : 0)
      }
    } catch (err) {
      console.error('Error loading balance:', err.message)
    }
    setLoading(false)
  }, [accounts, balanceTable, createdAtColumn, balanceColumn, currencyColumn, hasMultipleAccounts])

  useEffect(() => {
    loadBalanceData()
  }, [loadBalanceData])

  const handleAddBalance = async (e) => {
    e.preventDefault()
    if (!newBalance.amount) return

    try {
      const accountValue = hasMultipleAccounts ? (selectedAccount || accounts[0]?.value) : null
      if (hasMultipleAccounts && !accountValue) return

      const changeAmount = parseFloat(newBalance.amount)
      if (Number.isNaN(changeAmount)) return
      const baseBalance = hasMultipleAccounts
        ? parseFloat(currentBalances[accountValue] || 0)
        : parseFloat(currentBalance)
      const newBalanceAmount = baseBalance + changeAmount

      const payload = {
        [balanceColumn]: newBalanceAmount,
        [changeAmountColumn]: changeAmount,
        [reasonColumn]: newBalance.reason || (changeAmount > 0 ? 'Deposit' : 'Withdrawal')
      }

      if (hasMultipleAccounts && accountValue) {
        payload[currencyColumn] = accountValue
      }

      const { error } = await supabase
        .from(balanceTable)
        .insert([payload])

      if (error) throw error
      setShowAddBalance(false)
      setNewBalance({ amount: '', reason: '' })
      await loadBalanceData()

    } catch (err) {
      console.error('Error updating balance:', err.message)
    }
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-100">{labels.balanceTitle}</h2>
        <button
          onClick={() => setShowAddBalance(prev => !prev)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors border border-transparent ${classes.primaryAction}`}
        >
          {showAddBalance ? labels.newBalanceToggleCancel : labels.balanceToggleLabel}
        </button>
      </div>

      {hasMultipleAccounts ? (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg mb-6">
          <h3 className="text-lg text-slate-400 mb-4">{labels.balanceAccountsTitle}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map(account => (
              <div key={account.value} className="p-4 bg-slate-900/60 border border-slate-700 rounded-lg">
                <p className="text-sm text-slate-400">{account.label}</p>
                <p className="text-3xl font-bold text-emerald-400">
                  ${(currentBalances[account.value] || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg mb-6">
          <div className="text-center">
            <h3 className="text-lg text-slate-400">{labels.balanceHeroLabel}</h3>
            <p className="text-4xl font-bold text-emerald-400">${currentBalance.toFixed(2)}</p>
          </div>
        </div>
      )}

      {showAddBalance && (
        <form onSubmit={handleAddBalance} className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-4 text-slate-100">{labels.addBalanceModalTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasMultipleAccounts && (
              <SelectField
                label={labels.balanceAccountLabel}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                options={accounts}
                required
              />
            )}
            <InputField
              label="Amount (use negative for withdrawals)"
              type="number"
              step="0.01"
              value={newBalance.amount}
              onChange={(e) => setNewBalance(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="e.g., 500.00 or -200.00"
              required
            />
            <InputField
              label="Reason"
              value={newBalance.reason}
              onChange={(e) => setNewBalance(prev => ({ ...prev, reason: e.target.value }))}
              placeholder={labels.addBalancePlaceholder}
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button type="submit" className={`px-6 py-2 rounded-lg transition-colors ${classes.primaryAction}`}>
              {labels.addBalanceSubmit}
            </button>
            <button
              type="button"
              onClick={() => setShowAddBalance(false)}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              {labels.newBalanceToggleCancel}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <h3 className="p-4 font-semibold border-b border-slate-700 text-slate-100">{labels.historyTitle}</h3>
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-slate-400">Loading balance history...</div>
          ) : balanceHistory.length === 0 ? (
            <div className="p-4 text-slate-400">No balance history found.</div>
          ) : (
            balanceHistory.slice(0, 10).map((entry, index) => {
              const changeAmount = parseFloat(entry[changeAmountColumn]) || 0
              const balanceValue = parseFloat(entry[balanceColumn]) || 0
              const createdAt = entry[createdAtColumn]
              const currencyLabel = hasMultipleAccounts ? entry[currencyColumn] : null

              return (
                <div key={entry[idColumn] || index} className="p-4 border-b border-slate-700 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-100">{entry[reasonColumn]}</p>
                      {currencyLabel && <p className="text-xs text-slate-500">Account: {currencyLabel}</p>}
                      <p className="text-sm text-slate-400">
                        {createdAt ? `${new Date(createdAt).toLocaleDateString()} at ${new Date(createdAt).toLocaleTimeString()}` : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${changeAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-400">Balance: ${balanceValue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

const UpdateTradeView = ({ setCurrentView, setMessage, message, isSubmitting, setIsSubmitting, config }) => {
  const { tables, tradeColumns, balanceColumns, labels, classes, accounts = [] } = config
  const tradesTable = tables.trades
  const balanceTable = tables.balance
  const statusColumn = tradeColumns.status
  const entryDateColumn = tradeColumns.entryDate
  const instrumentColumn = tradeColumns.instrument
  const directionColumn = tradeColumns.direction
  const entryTypeColumn = tradeColumns.entryType
  const ruleColumn = tradeColumns.rule
  const zoneColumn = tradeColumns.zone
  const patternColumn = tradeColumns.pattern
  const stopSizeColumn = tradeColumns.stopSize
  const notesColumn = tradeColumns.notes
  const exitUrlColumn = tradeColumns.exitUrl
  const exitDateColumn = tradeColumns.exitDate
  const pnlColumn = tradeColumns.pnl
  const balanceCreatedAt = balanceColumns.createdAt
  const balanceValueColumn = balanceColumns.balance
  const changeAmountColumn = balanceColumns.changeAmount
  const reasonColumn = balanceColumns.reason
  const currencyColumn = balanceColumns.currency
  const accountField = tradeColumns.account
  const hasMultipleAccounts = accounts.length > 0 && currencyColumn

  const [openTrades, setOpenTrades] = useState([])
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updateData, setUpdateData] = useState({ exitUrl: '', pnl: '', notes: '' })

  useEffect(() => {
    const loadOpenTrades = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from(tradesTable)
          .select('*')
          .eq(statusColumn, 'open')
          .order(entryDateColumn, { ascending: false })

        if (error) throw error
        setOpenTrades(data || [])
      } catch (err) {
        setMessage(`Error: ${err.message}`)
      }
      setLoading(false)
    }
    loadOpenTrades()
  }, [setMessage, tradesTable, statusColumn, entryDateColumn])

  const handleUpdateTrade = async (e) => {
    e.preventDefault()
    if (!selectedTrade) return
    setIsSubmitting(true)
    setMessage('')

    try {
      const pnlAmount = updateData.pnl ? parseFloat(updateData.pnl) : 0

      const { error } = await supabase
        .from(tradesTable)
        .update({
          [exitDateColumn]: new Date().toISOString(),
          [exitUrlColumn]: updateData.exitUrl || null,
          [pnlColumn]: pnlAmount,
          [notesColumn]: updateData.notes || selectedTrade[notesColumn] || null,
          [statusColumn]: 'closed'
        })
        .eq(tradeColumns.id, selectedTrade[tradeColumns.id])

      if (error) throw error

      if (pnlAmount !== 0) {
        const selectedAccount = accountField ? selectedTrade[accountField] : null
        let currentBalanceValue = 0

        if (hasMultipleAccounts && selectedAccount) {
          const { data: balanceHistory, error: balanceError } = await supabase
            .from(balanceTable)
            .select(`${balanceValueColumn}, ${currencyColumn}`)
            .eq(currencyColumn, selectedAccount)
            .order(balanceCreatedAt, { ascending: false })
            .limit(1)

          if (balanceError) throw balanceError
          currentBalanceValue = balanceHistory?.[0]?.[balanceValueColumn] || 0
        } else {
          const { data: balanceHistory, error: balanceError } = await supabase
            .from(balanceTable)
            .select(balanceValueColumn)
            .order(balanceCreatedAt, { ascending: false })
            .limit(1)

          if (balanceError) throw balanceError
          currentBalanceValue = balanceHistory?.[0]?.[balanceValueColumn] || 0
        }

        const newBalance = parseFloat(currentBalanceValue) + pnlAmount

        const balancePayload = {
          [balanceValueColumn]: newBalance,
          [changeAmountColumn]: pnlAmount,
          [reasonColumn]: `Trade P&L: ${selectedTrade[instrumentColumn]} ${selectedTrade[directionColumn] || ''}`,
          [balanceColumns.tradeId]: selectedTrade[tradeColumns.id]
        }

        if (hasMultipleAccounts && selectedAccount) {
          balancePayload[currencyColumn] = selectedAccount
        }

        const { error: balanceInsertError } = await supabase
          .from(balanceTable)
          .insert([balancePayload])

        if (balanceInsertError) throw balanceInsertError
      }

      const reminderKey = `journal_reminder_${selectedTrade[tradeColumns.id]}`
      localStorage.setItem(reminderKey, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
      setMessage('Trade updated successfully! Balance automatically adjusted.')
      setSelectedTrade(null)
      setUpdateData({ exitUrl: '', pnl: '', notes: '' })

      const { data: updatedTrades } = await supabase
        .from(tradesTable)
        .select('*')
        .eq(statusColumn, 'open')
        .order(entryDateColumn, { ascending: false })

      setOpenTrades(updatedTrades || [])
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button
        onClick={() => setCurrentView('menu')}
        className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
      >
        ← Back to Menu
      </button>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{config.labels.updateTradeButton}</h1>
        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${message.includes('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
            {message}
          </div>
        )}
        {loading ? <p className="text-slate-400">Loading open trades...</p> :
          openTrades.length === 0 ? <p className="text-slate-400">No open trades found.</p> :
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Open Trades ({openTrades.length})</h2>
            <div className="grid gap-4">
              {openTrades.map(trade => {
                const metaParts = []
                if (entryTypeColumn) metaParts.push(`Type: ${trade[entryTypeColumn] || '-'}`)
                if (ruleColumn) metaParts.push(`Context: ${trade[ruleColumn] || '-'}`)
                if (zoneColumn) metaParts.push(`Zone: ${trade[zoneColumn] || '-'}`)

                const optionParts = []
                if (tradeColumns.optionType) optionParts.push(`Option: ${(trade[tradeColumns.optionType] || '').toString().toUpperCase()}`)
                if (tradeColumns.strike) optionParts.push(`${labels.strikeLabel || 'Strike'}: ${trade[tradeColumns.strike] ?? '-'}`)
                if (tradeColumns.expiry) optionParts.push(`${labels.expiryLabel || 'Expiry'}: ${trade[tradeColumns.expiry] ? new Date(trade[tradeColumns.expiry]).toLocaleDateString() : '-'}`)
                if (tradeColumns.contracts) optionParts.push(`${labels.contractsLabel || 'Contracts'}: ${trade[tradeColumns.contracts] ?? '-'}`)
                if (tradeColumns.premium) optionParts.push(`${labels.premiumLabel || 'Premium'}: ${trade[tradeColumns.premium] ?? '-'}`)

                const futuresParts = []
                if (tradeColumns.entryPrice) futuresParts.push(`${labels.entryPriceLabel || 'Entry'}: ${trade[tradeColumns.entryPrice] ?? '-'}`)
                if (tradeColumns.dollarPerTick) futuresParts.push(`${labels.dollarPerTickLabel || '$/Tick'}: $${trade[tradeColumns.dollarPerTick] ?? '-'}`)
                if (tradeColumns.stopLossTicks) futuresParts.push(`${labels.stopLossTicksLabel || 'SL'}: ${trade[tradeColumns.stopLossTicks] ?? '-'} ticks`)
                if (tradeColumns.targetTicks) futuresParts.push(`${labels.targetTicksLabel || 'Target'}: ${trade[tradeColumns.targetTicks] ?? '-'} ticks`)

                return (
                  <div
                    key={trade[tradeColumns.id]}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedTrade?.[tradeColumns.id] === trade[tradeColumns.id] ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 hover:border-slate-600 bg-slate-800'}`}
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {trade[instrumentColumn]}
                          {directionColumn && trade[directionColumn] ? ` - ${(trade[directionColumn] || '').toString().toUpperCase()}` : ''}
                        </h3>
                        <p className="text-slate-400 text-sm">Entry: {trade[entryDateColumn] ? new Date(trade[entryDateColumn]).toLocaleDateString() : '—'}</p>
                        {metaParts.length > 0 && <p className="text-slate-500 text-sm">{metaParts.join(' • ')}</p>}
                        {optionParts.length > 0 && <p className="text-slate-500 text-sm">{optionParts.join(' • ')}</p>}
                        {futuresParts.length > 0 && <p className="text-slate-500 text-sm">{futuresParts.join(' • ')}</p>}
                        {accountField && trade[accountField] && (
                          <p className="text-slate-500 text-sm">Account: {trade[accountField]}</p>
                        )}
                        {patternColumn && trade[patternColumn] && <p className="text-slate-500 text-sm">{config.labels.pattern}: {trade[patternColumn]}</p>}
                      </div>
                      <div className="text-right">
                        {stopSizeColumn && <p className="text-sm text-slate-400">Stop Size: {trade[stopSizeColumn] || '-'}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedTrade && (
              <div className="mt-8 p-6 bg-slate-800 border border-slate-700 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Close Trade: {selectedTrade[instrumentColumn]} - {(selectedTrade[directionColumn] || '').toString().toUpperCase()}</h3>
                <form onSubmit={handleUpdateTrade} className="space-y-4">
                  <InputField
                    label={config.labels.entryUrlLabel}
                    type="url"
                    value={updateData.exitUrl}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, exitUrl: e.target.value }))}
                    placeholder="https://tradingview.com/chart/..."
                  />
                  <InputField
                    label={config.labels.pnlLabel}
                    type="number"
                    step="0.01"
                    value={updateData.pnl}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, pnl: e.target.value }))}
                    placeholder="e.g., 150.00 or -75.50"
                    required
                  />
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-slate-300">{config.labels.notesLabel}</label>
                    <textarea
                      value={updateData.notes}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Exit reasons, lessons learned..."
                      rows="3"
                      className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedTrade(null)}
                      className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Closing...' : 'Close Trade'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        }
      </div>
    </div>
  )
}

const EditTradeView = ({ setCurrentView, config }) => {
  const { tables, tradeColumns, labels, classes, tickPresets = [] } = config
  const tradesTable = tables.trades
  const idColumn = tradeColumns.id
  const instrumentColumn = tradeColumns.instrument
  const directionColumn = tradeColumns.direction
  const statusColumn = tradeColumns.status
  const entryDateColumn = tradeColumns.entryDate

  const [allTrades, setAllTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [editData, setEditData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from(tradesTable)
          .select('*')
          .order(entryDateColumn, { ascending: false })
        if (error) throw error
        setAllTrades(data || [])
      } catch (err) {
        setMessage(`Error loading trades: ${err.message}`)
      }
      setLoading(false)
    }
    load()
  }, [tradesTable, entryDateColumn])

  const handleSelectTrade = (trade) => {
    setSelectedTrade(trade)
    const data = {}
    data.instrument = trade[instrumentColumn] || ''
    if (tradeColumns.direction) data.direction = trade[directionColumn] || ''
    if (tradeColumns.optionType) data.optionType = trade[tradeColumns.optionType] || ''
    if (tradeColumns.strike) data.strike = trade[tradeColumns.strike] ?? ''
    if (tradeColumns.expiry) data.expiry = trade[tradeColumns.expiry] ? trade[tradeColumns.expiry].split('T')[0] : ''
    if (tradeColumns.contracts) data.contracts = trade[tradeColumns.contracts] ?? ''
    if (tradeColumns.premium) data.premium = trade[tradeColumns.premium] ?? ''
    if (tradeColumns.entryPrice) data.entryPrice = trade[tradeColumns.entryPrice] ?? ''
    if (tradeColumns.dollarPerTick) data.dollarPerTick = trade[tradeColumns.dollarPerTick] ?? ''
    if (tradeColumns.stopLossTicks) data.stopLossTicks = trade[tradeColumns.stopLossTicks] ?? ''
    if (tradeColumns.targetTicks) data.targetTicks = trade[tradeColumns.targetTicks] ?? ''
    if (tradeColumns.forecastUrl) data.forecastUrl = trade[tradeColumns.forecastUrl] || ''
    if (tradeColumns.entryUrl) data.entryUrl = trade[tradeColumns.entryUrl] || ''
    if (tradeColumns.notes) data.notes = trade[tradeColumns.notes] || ''
    if (tradeColumns.entryDate) data.entryDate = trade[entryDateColumn] ? trade[entryDateColumn].split('T')[0] : ''
    setEditData(data)
    setMessage('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    try {
      const payload = {}
      const set = (col, val) => { if (col) payload[col] = val }
      set(instrumentColumn, config.uppercaseInstrument ? (editData.instrument || '').toUpperCase() : editData.instrument)
      set(tradeColumns.direction, editData.direction || null)
      set(tradeColumns.optionType, editData.optionType || null)
      set(tradeColumns.strike, editData.strike === '' ? null : (editData.strike != null ? parseFloat(editData.strike) : null))
      set(tradeColumns.expiry, editData.expiry || null)
      set(tradeColumns.contracts, editData.contracts === '' ? null : (editData.contracts != null ? parseFloat(editData.contracts) : null))
      set(tradeColumns.premium, editData.premium === '' ? null : (editData.premium != null ? parseFloat(editData.premium) : null))
      set(tradeColumns.entryPrice, editData.entryPrice === '' ? null : (editData.entryPrice != null ? parseFloat(editData.entryPrice) : null))
      set(tradeColumns.dollarPerTick, editData.dollarPerTick === '' ? null : (editData.dollarPerTick != null ? parseFloat(editData.dollarPerTick) : null))
      set(tradeColumns.stopLossTicks, editData.stopLossTicks === '' ? null : (editData.stopLossTicks != null ? parseInt(editData.stopLossTicks) : null))
      set(tradeColumns.targetTicks, editData.targetTicks === '' ? null : (editData.targetTicks != null ? parseInt(editData.targetTicks) : null))
      set(tradeColumns.forecastUrl, editData.forecastUrl || null)
      set(tradeColumns.entryUrl, editData.entryUrl || null)
      set(tradeColumns.notes, editData.notes || null)
      if (tradeColumns.entryDate && editData.entryDate) set(tradeColumns.entryDate, editData.entryDate)

      const { error } = await supabase.from(tradesTable).update(payload).eq(idColumn, selectedTrade[idColumn])
      if (error) throw error
      setMessage('Trade updated successfully!')
      const updated = allTrades.map(t => t[idColumn] === selectedTrade[idColumn] ? { ...t, ...payload } : t)
      setAllTrades(updated)
      setSelectedTrade(null)
      setEditData({})
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setIsSubmitting(false)
  }

  const filteredTrades = allTrades.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (t[instrumentColumn] || '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{labels.editTradeButton || 'Edit Trade'}</h1>
        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${message.includes('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
            {message}
          </div>
        )}
        {loading ? <p className="text-slate-400">Loading trades...</p> : (
          <div className="space-y-6">
            {!selectedTrade && (
              <>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ticker..."
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none placeholder-slate-400"
                />
                <div className="grid gap-3">
                  {filteredTrades.map(trade => (
                    <div
                      key={trade[idColumn]}
                      onClick={() => handleSelectTrade(trade)}
                      className="p-4 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-slate-100">{trade[instrumentColumn]}</span>
                          {directionColumn && <span className="ml-2 text-slate-400 text-sm">{(trade[directionColumn] || '').toUpperCase()}</span>}
                          {tradeColumns.optionType && <span className="ml-2 text-slate-400 text-sm">{(trade[tradeColumns.optionType] || '').toUpperCase()}</span>}
                          {tradeColumns.strike && <span className="ml-2 text-slate-500 text-sm">@{trade[tradeColumns.strike]}</span>}
                          <p className="text-slate-500 text-xs mt-1">{trade[entryDateColumn] ? new Date(trade[entryDateColumn]).toLocaleDateString() : '—'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${trade[statusColumn] === 'open' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                            {trade[statusColumn]}
                          </span>
                          {trade[tradeColumns.pnl] != null && (
                            <p className={`text-sm font-semibold mt-1 ${parseFloat(trade[tradeColumns.pnl]) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ${parseFloat(trade[tradeColumns.pnl]).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredTrades.length === 0 && <p className="text-slate-500">No trades found.</p>}
                </div>
              </>
            )}

            {selectedTrade && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Editing: {selectedTrade[instrumentColumn]}</h2>
                  <button onClick={() => { setSelectedTrade(null); setEditData({}) }} className="text-slate-400 hover:text-slate-200 text-sm">← Back to list</button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                  <InputField label={labels.instrument || 'Ticker'} value={editData.instrument || ''} onChange={(e) => setEditData(p => ({ ...p, instrument: e.target.value }))} required />
                  {tradeColumns.entryDate && (
                    <InputField label="Entry Date" type="date" value={editData.entryDate || ''} onChange={(e) => setEditData(p => ({ ...p, entryDate: e.target.value }))} />
                  )}
                  {tradeColumns.direction && (
                    <SelectField
                      label={labels.directionLabel || 'Direction'}
                      value={editData.direction || ''}
                      onChange={(e) => setEditData(p => ({ ...p, direction: e.target.value }))}
                      options={config.directionOptions || [{ value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }]}
                    />
                  )}
                  {tradeColumns.optionType && config.optionTypeOptions && (
                    <SelectField
                      label={labels.optionTypeLabel || 'Option Type'}
                      value={editData.optionType || ''}
                      onChange={(e) => setEditData(p => ({ ...p, optionType: e.target.value }))}
                      options={config.optionTypeOptions}
                    />
                  )}
                  {tradeColumns.strike && (
                    <InputField label={labels.strikeLabel || 'Strike Price ($)'} type="number" step="0.01" value={editData.strike ?? ''} onChange={(e) => setEditData(p => ({ ...p, strike: e.target.value }))} />
                  )}
                  {tradeColumns.expiry && (
                    <InputField label={labels.expiryLabel || 'Expiration Date'} type="date" value={editData.expiry || ''} onChange={(e) => setEditData(p => ({ ...p, expiry: e.target.value }))} />
                  )}
                  {tradeColumns.contracts && (
                    <InputField label={labels.contractsLabel || 'Contracts'} type="number" step="1" value={editData.contracts ?? ''} onChange={(e) => setEditData(p => ({ ...p, contracts: e.target.value }))} />
                  )}
                  {tradeColumns.premium && (
                    <InputField label={labels.premiumLabel || 'Premium ($ per contract)'} type="number" step="0.01" value={editData.premium ?? ''} onChange={(e) => setEditData(p => ({ ...p, premium: e.target.value }))} />
                  )}
                  {tradeColumns.entryPrice && (
                    <InputField label={labels.entryPriceLabel || 'Entry Price'} type="number" step="0.01" value={editData.entryPrice ?? ''} onChange={(e) => setEditData(p => ({ ...p, entryPrice: e.target.value }))} />
                  )}
                  {tradeColumns.dollarPerTick && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-slate-300">{labels.dollarPerTickLabel || 'Dollar per Tick ($)'}</label>
                      {tickPresets.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {tickPresets.map(preset => (
                            <button key={preset.symbol} type="button" onClick={() => setEditData(p => ({ ...p, dollarPerTick: preset.dollarPerTick.toString() }))}
                              className={`px-2 py-1 rounded text-xs border transition-colors ${editData.dollarPerTick === preset.dollarPerTick.toString() ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'}`}>
                              {preset.symbol} (${preset.dollarPerTick})
                            </button>
                          ))}
                        </div>
                      )}
                      <input type="number" step="0.01" value={editData.dollarPerTick ?? ''} onChange={(e) => setEditData(p => ({ ...p, dollarPerTick: e.target.value }))} className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
                    </div>
                  )}
                  {tradeColumns.stopLossTicks && (
                    <InputField label={labels.stopLossTicksLabel || 'Stop Loss (Ticks)'} type="number" step="1" value={editData.stopLossTicks ?? ''} onChange={(e) => setEditData(p => ({ ...p, stopLossTicks: e.target.value }))} />
                  )}
                  {tradeColumns.targetTicks && (
                    <InputField label={labels.targetTicksLabel || 'Target (Ticks)'} type="number" step="1" value={editData.targetTicks ?? ''} onChange={(e) => setEditData(p => ({ ...p, targetTicks: e.target.value }))} />
                  )}
                  {tradeColumns.forecastUrl && (
                    <InputField label={labels.forecastUrlLabel || 'Forecast URL'} type="url" value={editData.forecastUrl || ''} onChange={(e) => setEditData(p => ({ ...p, forecastUrl: e.target.value }))} placeholder="https://tradingview.com/chart/..." />
                  )}
                  {tradeColumns.entryUrl && (
                    <InputField label={labels.entryUrlLabel || 'Entry Chart URL'} type="url" value={editData.entryUrl || ''} onChange={(e) => setEditData(p => ({ ...p, entryUrl: e.target.value }))} placeholder="https://tradingview.com/chart/..." />
                  )}
                  {tradeColumns.notes && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-slate-300">{labels.notesLabel || 'Notes'}</label>
                      <textarea value={editData.notes || ''} onChange={(e) => setEditData(p => ({ ...p, notes: e.target.value }))} rows="3" className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setSelectedTrade(null); setEditData({}) }} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${isSubmitting ? 'bg-slate-600 cursor-not-allowed' : classes.primaryAction}`}>
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const TAG_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a3e635']

const ManageTagsView = ({ setCurrentView }) => {
  const [tags, setTags] = useState([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('trade_tags').select('*').order('name')
      setTags(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    const { data, error } = await supabase.from('trade_tags').insert([{ name: newName.trim(), color: newColor }]).select().single()
    if (error) { setMessage(`Error: ${error.message}`); return }
    setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setMessage(`Tag "${data.name}" created!`)
  }

  const handleDelete = async (tag) => {
    const { error } = await supabase.from('trade_tags').delete().eq('id', tag.id)
    if (error) { setMessage(`Error: ${error.message}`); return }
    setTags(prev => prev.filter(t => t.id !== tag.id))
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Manage Tags</h1>
        {message && <div className={`p-4 rounded-lg mb-6 border ${message.includes('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>{message}</div>}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Tag</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <InputField label="Tag Name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. High Conviction" required />
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Color</label>
              <div className="flex gap-2 flex-wrap">
                {TAG_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setNewColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors">Create Tag</button>
          </form>
        </div>
        {loading ? <p className="text-slate-400">Loading tags...</p> : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Your Tags ({tags.length})</h2>
            {tags.length === 0 ? <p className="text-slate-400">No tags yet.</p> : (
              <div className="space-y-2">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="text-slate-200">{tag.name}</span>
                    </div>
                    <button onClick={() => handleDelete(tag)} className="text-slate-500 hover:text-red-400 transition-colors text-sm">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const TagPicker = ({ tradeId, tagLinksTable }) => {
  const [allTags, setAllTags] = useState([])
  const [linkedTagIds, setLinkedTagIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tradeId || !tagLinksTable) return
    const load = async () => {
      const [tagsRes, linksRes] = await Promise.all([
        supabase.from('trade_tags').select('*').order('name'),
        supabase.from(tagLinksTable).select('tag_id').eq('trade_id', tradeId)
      ])
      setAllTags(tagsRes.data || [])
      setLinkedTagIds(new Set((linksRes.data || []).map(l => l.tag_id)))
      setLoading(false)
    }
    load()
  }, [tradeId, tagLinksTable])

  const toggle = async (tagId) => {
    if (linkedTagIds.has(tagId)) {
      await supabase.from(tagLinksTable).delete().eq('trade_id', tradeId).eq('tag_id', tagId)
      setLinkedTagIds(prev => { const s = new Set(prev); s.delete(tagId); return s })
    } else {
      await supabase.from(tagLinksTable).insert([{ trade_id: tradeId, tag_id: tagId }])
      setLinkedTagIds(prev => new Set([...prev, tagId]))
    }
  }

  if (loading || allTags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {allTags.map(tag => (
        <button key={tag.id} onClick={() => toggle(tag.id)}
          className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${linkedTagIds.has(tag.id) ? 'text-white border-transparent' : 'text-slate-400 border-slate-600 hover:border-slate-400 bg-transparent'}`}
          style={linkedTagIds.has(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}>
          {tag.name}
        </button>
      ))}
    </div>
  )
}

const PartialExitView = ({ setCurrentView, config }) => {
  const { tables, tradeColumns, balanceColumns, classes } = config
  const tradesTable = tables.trades
  const partialExitsTable = tables.partialExits
  const idColumn = tradeColumns.id
  const instrumentColumn = tradeColumns.instrument
  const directionColumn = tradeColumns.direction
  const statusColumn = tradeColumns.status
  const entryDateColumn = tradeColumns.entryDate
  const contractsColumn = tradeColumns.contracts
  const balanceTable = tables.balance

  const [openTrades, setOpenTrades] = useState([])
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [partialExits, setPartialExits] = useState([])
  const [formData, setFormData] = useState({ contractsExited: '', exitValue: '', notes: '', exitUrl: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const isOptions = Boolean(tradeColumns.premium)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from(tradesTable).select('*').eq(statusColumn, 'open').order(entryDateColumn, { ascending: false })
        if (error) throw error
        setOpenTrades(data || [])
      } catch (err) {
        setMessage(`Error: ${err.message}`)
      }
      setLoading(false)
    }
    load()
  }, [tradesTable, statusColumn, entryDateColumn])

  const loadPartialExits = async (tradeId) => {
    if (!partialExitsTable) return
    const { data } = await supabase.from(partialExitsTable).select('*').eq('trade_id', tradeId).order('created_at', { ascending: false })
    setPartialExits(data || [])
  }

  const handleSelectTrade = (trade) => {
    setSelectedTrade(trade)
    setFormData({ contractsExited: '', exitValue: '', notes: '', exitUrl: '' })
    setMessage('')
    loadPartialExits(trade[idColumn])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedTrade || !partialExitsTable) return
    setIsSubmitting(true)
    setMessage('')
    try {
      const n = parseInt(formData.contractsExited)
      const exitVal = parseFloat(formData.exitValue)
      const entryVal = isOptions
        ? parseFloat(selectedTrade[tradeColumns.premium] ?? 0)
        : parseFloat(selectedTrade[tradeColumns.entryPrice] ?? 0)

      let pnl
      if (isOptions) {
        pnl = (exitVal - entryVal) * n * 100
      } else {
        const dpt = parseFloat(selectedTrade[tradeColumns.dollarPerTick] ?? 0)
        pnl = (exitVal - entryVal) * (1 / 0.25) * dpt * n
      }

      const payload = {
        trade_id: selectedTrade[idColumn],
        contracts_exited: n,
        [isOptions ? 'exit_premium' : 'exit_price']: exitVal,
        pnl,
        notes: formData.notes || null,
        exit_url: formData.exitUrl || null
      }
      const { error } = await supabase.from(partialExitsTable).insert([payload])
      if (error) throw error

      const { data: balHistory } = await supabase.from(balanceTable).select('*').order(balanceColumns.createdAt, { ascending: false }).limit(1)
      const currentBal = balHistory?.[0] ? parseFloat(balHistory[0][balanceColumns.balance]) || 0 : 0
      await supabase.from(balanceTable).insert([{
        [balanceColumns.balance]: currentBal + pnl,
        [balanceColumns.changeAmount]: pnl,
        [balanceColumns.reason]: `Partial exit: ${selectedTrade[instrumentColumn]} (${n} contracts)`,
        [balanceColumns.tradeId]: selectedTrade[idColumn]
      }])

      setMessage(`Partial exit logged! P&L: $${pnl.toFixed(2)}`)
      setFormData({ contractsExited: '', exitValue: '', notes: '', exitUrl: '' })
      loadPartialExits(selectedTrade[idColumn])
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Log Partial Exit</h1>
        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${message.includes('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>{message}</div>
        )}
        {loading ? <p className="text-slate-400">Loading open trades...</p> : (
          <div className="space-y-6">
            {!selectedTrade && (
              <div className="grid gap-3">
                {openTrades.length === 0 && <p className="text-slate-400">No open trades found.</p>}
                {openTrades.map(trade => (
                  <div key={trade[idColumn]} onClick={() => handleSelectTrade(trade)} className="p-4 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg cursor-pointer transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-100">{trade[instrumentColumn]}</span>
                        {directionColumn && <span className="ml-2 text-slate-400 text-sm">{(trade[directionColumn] || '').toUpperCase()}</span>}
                        {contractsColumn && <span className="ml-2 text-slate-500 text-sm">{trade[contractsColumn]} contracts</span>}
                        <p className="text-slate-500 text-xs mt-1">{trade[entryDateColumn] ? new Date(trade[entryDateColumn]).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTrade && (
              <div className="space-y-6">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedTrade[instrumentColumn]}</h2>
                      <p className="text-slate-400 text-sm">{contractsColumn ? `${selectedTrade[contractsColumn]} contracts total` : ''} · {isOptions ? `Premium: $${selectedTrade[tradeColumns.premium]}` : `Entry: ${selectedTrade[tradeColumns.entryPrice]}`}</p>
                    </div>
                    <button onClick={() => setSelectedTrade(null)} className="text-slate-400 hover:text-slate-200 text-sm">← Back</button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField label="Contracts Exited" type="number" step="1" value={formData.contractsExited} onChange={e => setFormData(p => ({ ...p, contractsExited: e.target.value }))} placeholder="e.g. 2" required />
                    <InputField label={isOptions ? 'Exit Premium ($ per contract)' : 'Exit Price'} type="number" step="0.01" value={formData.exitValue} onChange={e => setFormData(p => ({ ...p, exitValue: e.target.value }))} placeholder={isOptions ? 'e.g. 4.50' : 'e.g. 4510.00'} required />
                    <InputField label="Exit URL (Optional)" type="url" value={formData.exitUrl} onChange={e => setFormData(p => ({ ...p, exitUrl: e.target.value }))} placeholder="https://tradingview.com/chart/..." />
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Notes (Optional)</label>
                      <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows="2" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none placeholder-slate-400" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className={`w-full p-3 rounded-lg font-semibold transition-colors ${isSubmitting ? 'bg-slate-600 cursor-not-allowed' : classes.primaryAction}`}>
                      {isSubmitting ? 'Logging...' : 'Log Partial Exit'}
                    </button>
                  </form>
                </div>

                {partialExits.length > 0 && (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                    <h3 className="text-lg font-semibold mb-4">Previous Partial Exits</h3>
                    <div className="space-y-2">
                      {partialExits.map(exit => (
                        <div key={exit.id} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                          <div>
                            <span className="text-slate-200 text-sm">{exit.contracts_exited} contracts @ {isOptions ? `$${exit.exit_premium}` : exit.exit_price}</span>
                            {exit.notes && <p className="text-slate-500 text-xs mt-0.5">{exit.notes}</p>}
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold text-sm ${parseFloat(exit.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${parseFloat(exit.pnl).toFixed(2)}</p>
                            <p className="text-slate-500 text-xs">{exit.exit_date ? new Date(exit.exit_date).toLocaleDateString() : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const TradingAnalytics = ({ trades, config }) => {
  if (config.features?.analytics === false) return null
  const { tradeColumns, analyticsLabels, labels } = config
  const statusColumn = tradeColumns.status
  const pnlColumn = tradeColumns.pnl
  const entryDateColumn = tradeColumns.entryDate
  const instrumentColumn = tradeColumns.instrument

  const closedTrades = trades.filter(trade => trade[statusColumn] === 'closed' && trade[pnlColumn] !== null && trade[pnlColumn] !== undefined)
  if (closedTrades.length < 5) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">Trading Analytics</h2>
        <p className="text-slate-400">Need at least 5 completed trades for meaningful analysis. Current: {closedTrades.length}</p>
      </div>
    )
  }

  const calculateStats = (field) => {
    if (!field) return {}
    const stats = {}
    closedTrades.forEach(trade => {
      const key = trade[field]
      if (key) {
        if (!stats[key]) stats[key] = { wins: 0, losses: 0, totalPnL: 0, count: 0 }
        stats[key].count++
        const pnlValue = parseFloat(trade[pnlColumn]) || 0
        stats[key].totalPnL += pnlValue
        if (pnlValue > 0) stats[key].wins++
        else if (pnlValue < 0) stats[key].losses++
      }
    })
    return stats
  }

  const patternStats = calculateStats(tradeColumns.pattern)
  const zoneStats = calculateStats(tradeColumns.zone)
  const entryTypeStats = calculateStats(tradeColumns.entryType)
  const ruleStats = calculateStats(tradeColumns.rule)
  const instrumentStats = calculateStats(instrumentColumn)

  const dayStats = {}
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  closedTrades.forEach(trade => {
    const entryDate = trade[entryDateColumn]
    if (!entryDate) return
    const day = dayNames[new Date(entryDate).getDay()]
    if (!dayStats[day]) dayStats[day] = { wins: 0, losses: 0, totalPnL: 0, count: 0 }
    const pnlValue = parseFloat(trade[pnlColumn]) || 0
    dayStats[day].count++
    dayStats[day].totalPnL += pnlValue
    if (pnlValue > 0) dayStats[day].wins++
    else if (pnlValue < 0) dayStats[day].losses++
  })

  const winningTrades = closedTrades.filter(t => parseFloat(t[pnlColumn]) > 0)
  const losingTrades = closedTrades.filter(t => parseFloat(t[pnlColumn]) < 0)
  const avgWin = winningTrades.length ? winningTrades.reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length ? Math.abs(losingTrades.reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0) / losingTrades.length) : 0
  const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'

  const StatCard = ({ title, stats }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-100">{title}</h3>
      <div className="space-y-2">
        {Object.entries(stats)
          .filter(([_, data]) => data.count >= 2)
          .sort((a, b) => (b[1].totalPnL - a[1].totalPnL))
          .slice(0, 5)
          .map(([key, data]) => {
            const winRate = data.count > 0 ? ((data.wins / data.count) * 100).toFixed(1) : '0.0'
            const avgPnL = (data.totalPnL / data.count).toFixed(2)
            return (
              <div key={key} className="flex justify-between items-center">
                <div>
                  <span className="text-slate-200 font-medium">{key}</span>
                  <span className="text-slate-400 text-sm ml-2">({data.count} trades)</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${data.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${data.totalPnL.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {winRate}% • Avg: ${avgPnL}
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6 text-slate-100">Trading Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Risk-Reward Profile</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Average Win:</span><span className="text-emerald-400 font-semibold">${avgWin.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Average Loss:</span><span className="text-red-400 font-semibold">${avgLoss.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Risk-Reward Ratio:</span><span className="text-slate-100 font-semibold">{riskRewardRatio}</span></div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Trading Volume</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Total Trades:</span><span className="text-slate-100 font-semibold">{closedTrades.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Winning Trades:</span><span className="text-emerald-400 font-semibold">{winningTrades.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Losing Trades:</span><span className="text-red-400 font-semibold">{losingTrades.length}</span></div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Performance Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Total P&L:</span>
              <span className={`font-semibold ${closedTrades.reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${closedTrades.reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Win Rate:</span>
              <span className="text-slate-100 font-semibold">{((winningTrades.length / closedTrades.length) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard title={analyticsLabels.pattern} stats={patternStats} />
        <StatCard title={analyticsLabels.zone} stats={zoneStats} />
        <StatCard title={analyticsLabels.entryType} stats={entryTypeStats} />
        <StatCard title={analyticsLabels.rule} stats={ruleStats} />
        <StatCard title={analyticsLabels.day} stats={dayStats} />
        <StatCard title={analyticsLabels.instrument} stats={instrumentStats} />
      </div>
    </div>
  )
}

const ViewHistoricalData = ({ setCurrentView, config }) => {
  const { tables, tradeColumns, labels, riskFraction, accounts = [], checklist = {} } = config
  const tradesTable = tables.trades
  const statusColumn = tradeColumns.status
  const entryDateColumn = tradeColumns.entryDate
  const instrumentColumn = tradeColumns.instrument
  const entryTypeColumn = tradeColumns.entryType
  const ruleColumn = tradeColumns.rule
  const zoneColumn = tradeColumns.zone
  const patternColumn = tradeColumns.pattern
  const pnlColumn = tradeColumns.pnl
  const notesColumn = tradeColumns.notes
  const entryUrlColumn = tradeColumns.entryUrl
  const forecastUrlColumn = tradeColumns.forecastUrl
  const accountField = tradeColumns.account
  const optionTypeColumn = tradeColumns.optionType
  const strikeColumn = tradeColumns.strike
  const expiryColumn = tradeColumns.expiry
  const contractsColumn = tradeColumns.contracts
  const premiumColumn = tradeColumns.premium
  const directionColumn = tradeColumns.direction
  const entryPriceColumn = tradeColumns.entryPrice
  const dollarPerTickColumn = tradeColumns.dollarPerTick
  const stopLossTicksColumn = tradeColumns.stopLossTicks
  const targetTicksColumn = tradeColumns.targetTicks
  const hasMultipleAccounts = accounts.length > 0 && config.balanceColumns.currency
  const showAnalytics = config.features?.analytics !== false

  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('desc')
  const [activeTab, setActiveTab] = useState('overview')
  const [currentBalance, setCurrentBalance] = useState(0)
  const [checklistLogs, setChecklistLogs] = useState({})
  const [selectedChecklist, setSelectedChecklist] = useState(null)
  const [journalTrade, setJournalTrade] = useState(null)
  const [journalText, setJournalText] = useState('')
  const [journalSaving, setJournalSaving] = useState(false)
  const [journalMessage, setJournalMessage] = useState('')
  const [journalReminders, setJournalReminders] = useState([])
  const checklistLogColumns = checklist.logColumns || DEFAULT_CHECKLIST_LOG_COLUMNS
  const checklistTables = checklist.tables || {}
  const checklistWorkspaceValue = checklist.workspaceValue || config.key
  const hasChecklistLogging = Boolean(checklistTables.logs)

  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true)
      try {
        let query = supabase.from(tradesTable).select('*')
        if (filter !== 'all') query = query.eq(statusColumn, filter)
        const { data, error } = await query.order(entryDateColumn, { ascending: false })
        if (error) throw error
        setTrades(data || [])
      } catch (err) {
        console.error('Error:', err.message)
      }
      setLoading(false)
    }
    loadTrades()
  }, [filter, tradesTable, statusColumn, entryDateColumn])

  useEffect(() => {
    if (!hasChecklistLogging) {
      setChecklistLogs({})
      return
    }
    const tradeIds = trades.map(trade => trade[tradeColumns.id]).filter(Boolean)
    if (!tradeIds.length) {
      setChecklistLogs({})
      return
    }

    const loadChecklistLogs = async () => {
      try {
        let query = supabase
          .from(checklistTables.logs)
          .select('*')
          .in(checklistLogColumns.tradeId, tradeIds)
        if (checklistLogColumns.workspace && checklistWorkspaceValue) {
          query = query.eq(checklistLogColumns.workspace, checklistWorkspaceValue)
        }
        const { data, error } = await query
        if (error) throw error
        const map = (data || []).reduce((acc, row) => {
          acc[row[checklistLogColumns.tradeId]] = row
          return acc
        }, {})
        setChecklistLogs(map)
      } catch (err) {
        console.error('Error loading checklist logs:', err.message)
      }
    }

    loadChecklistLogs()
  }, [hasChecklistLogging, trades, checklistTables.logs, checklistLogColumns.tradeId, checklistLogColumns.workspace, checklistWorkspaceValue, tradeColumns.id])

  useEffect(() => {
    const loadCurrentBalance = async () => {
      try {
        const { data: history, error } = await supabase
          .from(config.tables.balance)
          .select('*')
          .order(config.balanceColumns.createdAt, { ascending: false })
        if (error) throw error
        const historyData = history || []
        if (hasMultipleAccounts) {
          const balances = accounts.reduce((acc, account) => {
            const latest = historyData.find(entry => entry[config.balanceColumns.currency] === account.value)
            acc[account.value] = latest ? parseFloat(latest[config.balanceColumns.balance]) || 0 : 0
            return acc
          }, {})
          const total = Object.values(balances).reduce((sum, value) => sum + value, 0)
          setCurrentBalance(total)
        } else {
          const latest = historyData[0]
          setCurrentBalance(latest ? parseFloat(latest[config.balanceColumns.balance]) || 0 : 0)
        }
      } catch (err) {
        console.error('Error loading balance:', err.message)
      }
    }
    loadCurrentBalance()
  }, [accounts, config.tables.balance, config.balanceColumns.balance, config.balanceColumns.createdAt, config.balanceColumns.currency, hasMultipleAccounts])

  useEffect(() => {
    if (!trades.length) return
    const reminders = []
    const now = Date.now()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('journal_reminder_')) continue
      const tradeId = key.replace('journal_reminder_', '')
      const dueAt = parseInt(localStorage.getItem(key) || '0', 10)
      if (now < dueAt) continue
      const trade = trades.find(t => String(t[tradeColumns.id]) === tradeId)
      if (!trade) continue
      if (trade.journal_notes) { localStorage.removeItem(key); continue }
      reminders.push(trade)
    }
    setJournalReminders(reminders)
  }, [trades, tradeColumns.id])

  const handleOpenJournal = (trade) => {
    setJournalTrade(trade)
    setJournalText(trade.journal_notes || '')
    setJournalMessage('')
  }

  const handleSaveJournal = async () => {
    if (!journalTrade) return
    setJournalSaving(true)
    setJournalMessage('')
    try {
      const { error } = await supabase
        .from(tradesTable)
        .update({ journal_notes: journalText, journal_reviewed_at: new Date().toISOString() })
        .eq(tradeColumns.id, journalTrade[tradeColumns.id])
      if (error) throw error
      const key = `journal_reminder_${journalTrade[tradeColumns.id]}`
      localStorage.removeItem(key)
      setTrades(prev => prev.map(t => t[tradeColumns.id] === journalTrade[tradeColumns.id] ? { ...t, journal_notes: journalText, journal_reviewed_at: new Date().toISOString() } : t))
      setJournalReminders(prev => prev.filter(t => t[tradeColumns.id] !== journalTrade[tradeColumns.id]))
      setJournalMessage('Journal saved!')
      setTimeout(() => { setJournalTrade(null); setJournalMessage('') }, 1200)
    } catch (err) {
      setJournalMessage(`Error: ${err.message}`)
    }
    setJournalSaving(false)
  }

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const displayedTrades = (() => {
    let result = [...trades]
    if (dateFrom) result = result.filter(t => t[entryDateColumn] && t[entryDateColumn].slice(0, 10) >= dateFrom)
    if (dateTo) result = result.filter(t => t[entryDateColumn] && t[entryDateColumn].slice(0, 10) <= dateTo)
    if (sortCol) {
      result.sort((a, b) => {
        const av = sortCol === pnlColumn ? parseFloat(a[sortCol] ?? 0) : (a[sortCol] ?? '')
        const bv = sortCol === pnlColumn ? parseFloat(b[sortCol] ?? 0) : (b[sortCol] ?? '')
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  })()

  const totalPnL = trades.filter(t => t[pnlColumn] !== null && t[pnlColumn] !== undefined).reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0)
  const totalPnLPercent = currentBalance > 0 ? (totalPnL / currentBalance) * 100 : 0
  const winningTrades = trades.filter(t => (parseFloat(t[pnlColumn]) || 0) > 0).length
  const losingTrades = trades.filter(t => (parseFloat(t[pnlColumn]) || 0) < 0).length
  const winRate = trades.length > 0 ? ((winningTrades / (winningTrades + losingTrades)) * 100).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{labels.viewDataButton}</h1>

        {journalReminders.length > 0 && (
          <div className="mb-6 space-y-2">
            {journalReminders.map(trade => (
              <div key={trade[tradeColumns.id]} className="flex items-center justify-between p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
                <div>
                  <span className="text-amber-300 font-semibold">Journal reminder: </span>
                  <span className="text-slate-200">{trade[instrumentColumn]} — 1-week review due. How did this trade go?</span>
                </div>
                <button onClick={() => handleOpenJournal(trade)} className="ml-4 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors shrink-0">Write Journal</button>
              </div>
            ))}
          </div>
        )}

        <BalanceManager config={config} />

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm text-slate-400">Total Trades</h3>
              <p className="text-2xl font-bold text-slate-100">{trades.length}</p>
            </div>
            <div>
              <h3 className="text-sm text-slate-400">Win Rate</h3>
              <p className="text-2xl font-bold text-slate-100">{winRate}%</p>
            </div>
            <div>
              <h3 className="text-sm text-slate-400">Closed P&L</h3>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${totalPnL.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm text-slate-400">P&L vs Balance</h3>
              <p className={`text-2xl font-bold ${totalPnLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPnLPercent.toFixed(2)}%</p>
              <p className="text-xs text-slate-500 mt-1">Assumes {labels.riskSummaryLabel.toLowerCase()} of ${currentBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'overview' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Overview</button>
          {showAnalytics && (
            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'analytics' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Analytics</button>
          )}
          <button onClick={() => setActiveTab('trades')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'trades' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Trades Table</button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Open Trades</h3><p className="text-2xl font-bold text-slate-100">{trades.filter(t => t[statusColumn] === 'open').length}</p></div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Closed Trades</h3><p className="text-2xl font-bold text-slate-100">{trades.filter(t => t[statusColumn] === 'closed').length}</p></div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Risk Budget (0.5%)</h3><p className="text-2xl font-bold text-slate-100">${(currentBalance * riskFraction).toFixed(2)}</p></div>
          </div>
        )}

        {showAnalytics && activeTab === 'analytics' && <TradingAnalytics trades={trades} config={config} />}

        {activeTab === 'trades' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4 items-center">
              <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded border text-sm ${filter === 'all' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}>All</button>
              <button onClick={() => setFilter('open')} className={`px-3 py-1 rounded border text-sm ${filter === 'open' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}>Open</button>
              <button onClick={() => setFilter('closed')} className={`px-3 py-1 rounded border text-sm ${filter === 'closed' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}>Closed</button>
              <div className="flex items-center gap-2 ml-auto">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500" />
                <span className="text-slate-500 text-sm">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500" />
                {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-slate-400 hover:text-slate-200 text-sm px-2">✕</button>}
              </div>
            </div>
            {loading ? (
              <p className="text-slate-400">Loading trades...</p>
            ) : trades.length === 0 ? (
              <p className="text-slate-400">No trades found.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="min-w-max w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700 text-sm">
                  <thead className="bg-slate-700">
                    <tr>
                      {[{ label: 'Entry Date', col: entryDateColumn }, { label: labels.instrument, col: instrumentColumn }].map(({ label, col }) => (
                        <th key={col} className="p-3 text-left text-slate-300 cursor-pointer hover:text-white select-none" onClick={() => handleSort(col)}>
                          {label}{sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                      ))}
                      {accountField && <th className="p-3 text-left text-slate-300">Account</th>}
                      {directionColumn && <th className="p-3 text-left text-slate-300">{labels.directionLabel || 'Direction'}</th>}
                      {optionTypeColumn && <th className="p-3 text-left text-slate-300">{labels.optionTypeLabel || 'Option Type'}</th>}
                      {strikeColumn && <th className="p-3 text-left text-slate-300">{labels.strikeLabel || 'Strike'}</th>}
                      {expiryColumn && <th className="p-3 text-left text-slate-300">{labels.expiryLabel || 'Expiry'}</th>}
                      {contractsColumn && <th className="p-3 text-left text-slate-300">{labels.contractsLabel || 'Contracts'}</th>}
                      {premiumColumn && <th className="p-3 text-left text-slate-300">{labels.premiumLabel || 'Premium'}</th>}
                      {entryPriceColumn && <th className="p-3 text-left text-slate-300">{labels.entryPriceLabel || 'Entry Price'}</th>}
                      {dollarPerTickColumn && <th className="p-3 text-left text-slate-300">{labels.dollarPerTickLabel || '$/Tick'}</th>}
                      {stopLossTicksColumn && <th className="p-3 text-left text-slate-300">{labels.stopLossTicksLabel || 'SL Ticks'}</th>}
                      {targetTicksColumn && <th className="p-3 text-left text-slate-300">{labels.targetTicksLabel || 'Target Ticks'}</th>}
                      {entryTypeColumn && <th className="p-3 text-left text-slate-300">Entry Type</th>}
                      {ruleColumn && <th className="p-3 text-left text-slate-300">Context</th>}
                      {zoneColumn && <th className="p-3 text-left text-slate-300">Zone</th>}
                      {patternColumn && <th className="p-3 text-left text-slate-300">{labels.pattern}</th>}
                      {forecastUrlColumn && <th className="p-3 text-left text-slate-300">Forecast Link</th>}
                      {entryUrlColumn && <th className="p-3 text-left text-slate-300">Entry Link</th>}
                      {hasChecklistLogging && <th className="p-3 text-left text-slate-300">Checklist</th>}
                      <th className="p-3 text-left text-slate-300 cursor-pointer hover:text-white select-none" onClick={() => handleSort(statusColumn)}>
                        Status{sortCol === statusColumn ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                      </th>
                      <th className="p-3 text-left text-slate-300 cursor-pointer hover:text-white select-none" onClick={() => handleSort(pnlColumn)}>
                        {labels.pnlLabel}{sortCol === pnlColumn ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                      </th>
                      {notesColumn && <th className="p-3 text-left text-slate-300">{labels.notesLabel}</th>}
                      {config.tables?.tagLinks && <th className="p-3 text-left text-slate-300">Tags</th>}
                      <th className="p-3 text-left text-slate-300">Journal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedTrades.map((trade, idx) => (
                      <tr key={trade[tradeColumns.id] || idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                        <td className="p-3 text-slate-300">{trade[entryDateColumn] ? new Date(trade[entryDateColumn]).toLocaleDateString() : '-'}</td>
                        <td className="p-3 font-semibold text-slate-100">{trade[instrumentColumn]}</td>
                        {accountField && <td className="p-3 text-slate-300">{trade[accountField] || '-'}</td>}
                        {directionColumn && <td className="p-3 text-slate-300">{(trade[directionColumn] || '').toString().toUpperCase()}</td>}
                        {optionTypeColumn && <td className="p-3 text-slate-300">{(trade[optionTypeColumn] || '').toString().toUpperCase()}</td>}
                        {strikeColumn && <td className="p-3 text-slate-300">{trade[strikeColumn] ?? '-'}</td>}
                        {expiryColumn && <td className="p-3 text-slate-300">{trade[expiryColumn] ? new Date(trade[expiryColumn]).toLocaleDateString() : '-'}</td>}
                        {contractsColumn && <td className="p-3 text-slate-300">{trade[contractsColumn] ?? '-'}</td>}
                        {premiumColumn && <td className="p-3 text-slate-300">{trade[premiumColumn] ?? '-'}</td>}
                        {entryPriceColumn && <td className="p-3 text-slate-300">{trade[entryPriceColumn] ?? '-'}</td>}
                        {dollarPerTickColumn && <td className="p-3 text-slate-300">{trade[dollarPerTickColumn] ? `$${trade[dollarPerTickColumn]}` : '-'}</td>}
                        {stopLossTicksColumn && <td className="p-3 text-slate-300">{trade[stopLossTicksColumn] ?? '-'}</td>}
                        {targetTicksColumn && <td className="p-3 text-slate-300">{trade[targetTicksColumn] ?? '-'}</td>}
                        {entryTypeColumn && <td className="p-3 text-slate-300">{trade[entryTypeColumn] || '-'}</td>}
                        {ruleColumn && <td className="p-3 text-slate-300">{trade[ruleColumn] || '-'}</td>}
                        {zoneColumn && <td className="p-3 text-slate-300">{trade[zoneColumn] || '-'}</td>}
                        {patternColumn && <td className="p-3 text-slate-300">{trade[patternColumn] || '-'}</td>}
                        {forecastUrlColumn && (
                          <td className="p-3">
                            {trade[forecastUrlColumn] ? (
                              <a href={trade[forecastUrlColumn]} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs underline">Forecast</a>
                            ) : <span className="text-slate-500 text-xs">-</span>}
                          </td>
                        )}
                        {entryUrlColumn && (
                          <td className="p-3">
                            {trade[entryUrlColumn] ? (
                              <a href={trade[entryUrlColumn]} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs underline">Link</a>
                            ) : <span className="text-slate-500 text-xs">-</span>}
                          </td>
                        )}
                        {hasChecklistLogging && (
                          <td className="p-3">
                            {checklistLogs[trade[tradeColumns.id]] ? (
                              <button
                                type="button"
                                onClick={() => setSelectedChecklist({ trade, log: checklistLogs[trade[tradeColumns.id]] })}
                                className="text-xs px-3 py-1 rounded border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                        )}
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade[statusColumn] === 'closed'
                              ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                              : 'bg-blue-900/40 text-blue-300 border border-blue-800'
                          }`}>
                            {(trade[statusColumn] || '').toString().toUpperCase()}
                          </span>
                        </td>
                        <td className={`p-3 font-semibold ${parseFloat(trade[pnlColumn]) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade[pnlColumn] !== null && trade[pnlColumn] !== undefined ? `$${parseFloat(trade[pnlColumn]).toFixed(2)}` : '-'}
                        </td>
                        {notesColumn && <td className="p-3 text-slate-300">{trade[notesColumn] || '-'}</td>}
                        {config.tables?.tagLinks && (
                          <td className="p-3 min-w-[120px]">
                            <TagPicker tradeId={trade[tradeColumns.id]} tagLinksTable={config.tables.tagLinks} />
                          </td>
                        )}
                        <td className="p-3">
                          {trade[statusColumn] === 'closed' ? (
                            <button
                              onClick={() => handleOpenJournal(trade)}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${trade.journal_notes ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-600/10' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                            >
                              {trade.journal_notes ? 'Edit' : 'Write'}
                            </button>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      {journalTrade && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Trade Journal</p>
                <h3 className="text-xl font-bold text-white">{journalTrade[instrumentColumn]} — {journalTrade[entryDateColumn] ? new Date(journalTrade[entryDateColumn]).toLocaleDateString() : ''}</h3>
              </div>
              <button onClick={() => setJournalTrade(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-slate-400">What worked? What didn't? What would you do differently?</p>
            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              rows={8}
              placeholder="Write your post-trade reflection here..."
              className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 placeholder-slate-500"
            />
            {journalMessage && (
              <p className={`text-sm ${journalMessage.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{journalMessage}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setJournalTrade(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSaveJournal} disabled={journalSaving} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors">
                {journalSaving ? 'Saving...' : 'Save Journal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedChecklist && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Checklist Journal</p>
                <h3 className="text-2xl font-bold text-white">{selectedChecklist.trade[instrumentColumn]}</h3>
                <p className="text-sm text-slate-400">
                  Logged {selectedChecklist.trade[entryDateColumn] ? new Date(selectedChecklist.trade[entryDateColumn]).toLocaleString() : 'N/A'} · Zone {selectedChecklist.log[checklistLogColumns.zone] || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChecklist(null)}
                className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <ChecklistAnswersList snapshot={selectedChecklist.log[checklistLogColumns.answers]} />
          </div>
        </div>
      )}
    </div>
  )
}

const MissedTradesAnalytics = ({ missed, config }) => {
  const { missedColumns, missedAnalyticsLabels } = config
  if (!missed.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">Missed Trades Analytics</h2>
        <p className="text-slate-400">Log a few missed opportunities to unlock analytics.</p>
      </div>
    )
  }

  const toNumber = (v) => (v === null || v === undefined || v === '') ? 0 : parseFloat(v)
  const sumPct = missed.reduce((s, r) => s + toNumber(r[missedColumns.potential]), 0)
  const avgPct = missed.length ? sumPct / missed.length : 0

  const groupBy = (field) => missed.reduce((acc, row) => {
    const key = row[field]
    if (!key) return acc
    if (!acc[key]) acc[key] = { count: 0, totalPct: 0 }
    acc[key].count++
    acc[key].totalPct += toNumber(row[missedColumns.potential])
    return acc
  }, {})

  const byDay = missed.reduce((acc, row) => {
    const created = row[missedColumns.createdAt]
    if (!created) return acc
    const day = new Date(created).toLocaleDateString(undefined, { weekday: 'long' })
    if (!acc[day]) acc[day] = { count: 0, totalPct: 0 }
    acc[day].count++
    acc[day].totalPct += toNumber(row[missedColumns.potential])
    return acc
  }, {})
  const byInstrument = groupBy(missedColumns.instrument)
  const byPattern = groupBy(missedColumns.pattern)

  const StatCard = ({ title, stats, suffix = 'misses' }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-100">{title}</h3>
      <div className="space-y-2">
        {Object.entries(stats)
          .sort((a, b) => b[1].totalPct - a[1].totalPct)
          .slice(0, 5)
          .map(([key, data]) => (
            <div key={key} className="flex justify-between items-center">
              <div>
                <span className="text-slate-200 font-medium">{key}</span>
                <span className="text-slate-400 text-sm ml-2">({data.count} {suffix})</span>
              </div>
              <div className={`text-sm font-semibold ${data.totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.totalPct.toFixed(2)}%
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6 text-slate-100">Missed Trades Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Overview</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Missed Trades:</span><span className="text-slate-100 font-semibold">{missed.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Total Potential (Σ%):</span><span className={`font-semibold ${sumPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{sumPct.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Avg Potential / Miss:</span><span className="text-slate-100 font-semibold">{avgPct.toFixed(2)}%</span></div>
          </div>
        </div>
        <StatCard
          title={missedAnalyticsLabels.day}
          stats={Object.fromEntries(Object.entries(byDay).filter(([key]) => key && key !== 'Invalid Date'))}
        />
        <StatCard title={missedAnalyticsLabels.instrument} stats={byInstrument} suffix="misses" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard title={missedAnalyticsLabels.pattern} stats={byPattern} />
      </div>
    </div>
  )
}

const MissedTradeView = ({ setCurrentView, config }) => {
  const { tables, missedColumns, labels, missedPatternOptions } = config
  const missedTable = tables.missed

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    instrument: '',
    direction: 'long',
    beforeUrl: '',
    pattern: '',
    afterUrl: '',
    potential: ''
  })

  const handleInput = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    try {
      const payload = {
        [missedColumns.instrument]: config.uppercaseInstrument ? form.instrument.toUpperCase() : form.instrument,
        [missedColumns.direction]: form.direction,
        [missedColumns.beforeUrl]: form.beforeUrl || null,
        [missedColumns.pattern]: form.pattern || null,
        [missedColumns.afterUrl]: form.afterUrl || null,
        [missedColumns.potential]: form.potential === '' ? null : parseFloat(form.potential)
      }
      const { error } = await supabase.from(missedTable).insert([payload])
      if (error) throw error
      setMessage('Missed trade logged!')
      setForm({ instrument: '', direction: 'long', beforeUrl: '', pattern: '', afterUrl: '', potential: '' })
    } catch (err) { setMessage(`Error: ${err.message}`) }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{labels.missedTradeButton}</h1>
        {message && <div className={`p-4 rounded-lg mb-6 border ${message.startsWith('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 border border-slate-700 p-6 rounded-lg">
          <InputField label={labels.instrument} value={form.instrument} onChange={(e) => handleInput('instrument', e.target.value)} placeholder={labels.instrumentPlaceholder} required />
          <SelectField label="Direction" value={form.direction} onChange={(e) => handleInput('direction', e.target.value)} options={LONG_SHORT_OPTIONS} required />
          <InputField label="Before Trade Chart/Notes (Optional)" type="url" value={form.beforeUrl} onChange={(e) => handleInput('beforeUrl', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <SelectField label={labels.missedPattern} value={form.pattern} onChange={(e) => handleInput('pattern', e.target.value)} options={missedPatternOptions} />
          <InputField label="After Trade Review (Optional)" type="url" value={form.afterUrl} onChange={(e) => handleInput('afterUrl', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <InputField label="Potential Return (%)" type="number" step="0.01" value={form.potential} onChange={(e) => handleInput('potential', e.target.value)} placeholder="e.g., 2.5 for +2.5" />
          <button type="submit" disabled={isSubmitting} className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors">
            {isSubmitting ? 'Logging...' : 'Log Missed Trade'}
          </button>
        </form>
      </div>
    </div>
  )
}

const ViewMissedTrades = ({ setCurrentView, config }) => {
  const { tables, missedColumns, labels, missedAnalyticsLabels } = config
  const missedTable = tables.missed

  const [missed, setMissed] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from(missedTable).select('*').order(missedColumns.createdAt, { ascending: false })
        if (error) throw error
        setMissed(data || [])
      } catch (err) {
        console.error('Error loading missed trades:', err.message)
      }
      setLoading(false)
    }
    load()
  }, [missedTable, missedColumns.createdAt])

  const toNumber = (v) => (v === null || v === undefined || v === '') ? 0 : parseFloat(v)
  const totalPct = missed.reduce((s, r) => s + toNumber(r[missedColumns.potential]), 0)
  const avgPct = missed.length ? (totalPct / missed.length) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{labels.missedDataButton}</h1>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'overview' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'analytics' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Analytics</button>
          <button onClick={() => setActiveTab('trades')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'trades' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Missed Trades Table</button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Missed Trades</h3><p className="text-2xl font-bold text-slate-100">{missed.length}</p></div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Total Potential (Σ%)</h3><p className={`text-2xl font-bold ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPct.toFixed(2)}%</p></div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Avg Potential / Miss</h3><p className="text-2xl font-bold text-slate-100">{avgPct.toFixed(2)}%</p></div>
          </div>
        )}

        {activeTab === 'analytics' && <MissedTradesAnalytics missed={missed} config={config} />}

        {activeTab === 'trades' && (
          <>
            {loading ? (
              <p className="text-slate-400">Loading missed trades...</p>
            ) : missed.length === 0 ? (
              <p className="text-slate-400">No missed trades logged.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="min-w-max w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="p-3 text-left text-slate-300">Date</th>
                      <th className="p-3 text-left text-slate-300">{labels.missedTableInstrument}</th>
                      <th className="p-3 text-left text-slate-300">Direction</th>
                      <th className="p-3 text-left text-slate-300">{labels.missedTablePattern}</th>
                      <th className="p-3 text-left text-slate-300">Before Link</th>
                      <th className="p-3 text-left text-slate-300">After Link</th>
                      <th className="p-3 text-left text-slate-300">Potential Return (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missed.map((row, idx) => (
                      <tr key={row[missedColumns.id] || idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                        <td className="p-3 text-sm text-slate-300">{row[missedColumns.createdAt] ? new Date(row[missedColumns.createdAt]).toLocaleDateString() : '-'}</td>
                        <td className="p-3 font-semibold text-slate-100">{row[missedColumns.instrument]}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${row[missedColumns.direction] === 'long' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
                            {(row[missedColumns.direction] || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{row[missedColumns.pattern] || '-'}</td>
                        <td className="p-3">{row[missedColumns.beforeUrl] ? <a href={row[missedColumns.beforeUrl]} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs underline">Before</a> : <span className="text-slate-500 text-xs">-</span>}</td>
                        <td className="p-3">{row[missedColumns.afterUrl] ? <a href={row[missedColumns.afterUrl]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline">After</a> : <span className="text-slate-500 text-xs">-</span>}</td>
                        <td className="p-3">{(row[missedColumns.potential] !== null && row[missedColumns.potential] !== undefined && row[missedColumns.potential] !== '') ? (
                          <span className={`${row[missedColumns.potential] >= 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold`}>{parseFloat(row[missedColumns.potential]).toFixed(2)}%</span>
                        ) : <span className="text-slate-500">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const NewTradeView = ({ setCurrentView, formData, setFormData, isSubmitting, setIsSubmitting, message, setMessage, config }) => {
  const {
    tables,
    tradeColumns,
    labels,
    entryTypeOptions,
    ruleOptions,
    zoneOptions,
    patternOptions,
    stopSizeStep,
    riskFraction,
    classes,
    accounts = [],
    checklist = {},
    tickPresets = []
  } = config
  const tradesTable = tables.trades
  const balanceTable = tables.balance
  const balanceColumns = config.balanceColumns
  const accountField = tradeColumns.account
  const hasMultipleAccounts = accounts.length > 0 && balanceColumns.currency
  const checklistTables = checklist.tables || {}
  const checklistLogColumns = checklist.logColumns || DEFAULT_CHECKLIST_LOG_COLUMNS
  const checklistAttemptColumns = checklist.attemptColumns || DEFAULT_CHECKLIST_ATTEMPT_COLUMNS
  const workspaceValue = checklist.workspaceValue || config.key

  const [currentBalance, setCurrentBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [accountBalances, setAccountBalances] = useState({})
  const [checklistComplete, setChecklistComplete] = useState(false)
  const [checklistSnapshot, setChecklistSnapshot] = useState(null)

  useEffect(() => {
    if (!checklistComplete) return
    if (hasMultipleAccounts && !formData.account && accounts[0]?.value) {
      setFormData(prev => ({ ...prev, account: accounts[0].value }))
    }
  }, [accounts, checklistComplete, formData.account, hasMultipleAccounts, setFormData])

  useEffect(() => {
    if (!checklistComplete) return
    const loadBalances = async () => {
      setBalanceLoading(true)
      try {
        const { data, error } = await supabase
          .from(balanceTable)
          .select('*')
          .order(balanceColumns.createdAt, { ascending: false })

        if (error) throw error
        const history = data || []

        if (hasMultipleAccounts) {
          const balances = accounts.reduce((acc, account) => {
            const latest = history.find(entry => entry[balanceColumns.currency] === account.value)
            acc[account.value] = latest ? parseFloat(latest[balanceColumns.balance]) || 0 : 0
            return acc
          }, {})
          setAccountBalances(balances)
          const selected = formData.account || accounts[0]?.value
          setCurrentBalance(selected ? balances[selected] || 0 : 0)
        } else {
          const latest = history[0]
          setCurrentBalance(latest ? parseFloat(latest[balanceColumns.balance]) || 0 : 0)
        }
      } catch (err) {
        console.error('Error loading balance:', err.message)
      }
      setBalanceLoading(false)
    }
    loadBalances()
  }, [accounts, balanceColumns.balance, balanceColumns.createdAt, balanceColumns.currency, balanceTable, checklistComplete, formData.account, hasMultipleAccounts])

  useEffect(() => {
    if (!checklistComplete) return
    if (!hasMultipleAccounts) return
    const selected = formData.account || accounts[0]?.value
    if (!selected) return
    setCurrentBalance(accountBalances[selected] || 0)
  }, [accounts, accountBalances, checklistComplete, formData.account, hasMultipleAccounts])

  const maxRisk = currentBalance * (riskFraction || 0)
  const riskAmount = parseFloat(formData.riskAmount) || 0
  const exceedsLimit = tradeColumns.riskAmount ? riskAmount > maxRisk : false
  const selectedAccountValue = formData.account || accounts[0]?.value || ''
  const selectedAccountLabel = accounts.find(account => account.value === selectedAccountValue)?.label

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const logChecklistAttempt = useCallback(async ({ status, snapshot, failureReason }) => {
    if (!checklistTables.attempts) throw new Error('Checklist attempts table is not configured.')
    const payload = {}
    if (checklistAttemptColumns.workspace) payload[checklistAttemptColumns.workspace] = workspaceValue
    if (checklistAttemptColumns.status) payload[checklistAttemptColumns.status] = status
    if (checklistAttemptColumns.answers) payload[checklistAttemptColumns.answers] = snapshot || null
    if (checklistAttemptColumns.zone) payload[checklistAttemptColumns.zone] = snapshot?.zone || null
    if (checklistAttemptColumns.failureReason) payload[checklistAttemptColumns.failureReason] = failureReason || null
    const { error } = await supabase.from(checklistTables.attempts).insert([payload])
    if (error) throw new Error(error.message)
  }, [checklistAttemptColumns.answers, checklistAttemptColumns.failureReason, checklistAttemptColumns.status, checklistAttemptColumns.workspace, checklistAttemptColumns.zone, checklistTables.attempts, workspaceValue])

  const logChecklistForTrade = useCallback(async (tradeId, snapshot) => {
    if (!tradeId || !snapshot || !checklistTables.logs) return
    const payload = {}
    if (checklistLogColumns.workspace) payload[checklistLogColumns.workspace] = workspaceValue
    if (checklistLogColumns.tradeId) payload[checklistLogColumns.tradeId] = tradeId
    if (checklistLogColumns.answers) payload[checklistLogColumns.answers] = snapshot
    if (checklistLogColumns.zone) payload[checklistLogColumns.zone] = snapshot.zone || null
    if (checklistLogColumns.status) payload[checklistLogColumns.status] = 'passed'
    const { error } = await supabase.from(checklistTables.logs).insert([payload])
    if (error) throw new Error(error.message)
  }, [checklistLogColumns.answers, checklistLogColumns.status, checklistLogColumns.tradeId, checklistLogColumns.workspace, checklistLogColumns.zone, checklistTables.logs, workspaceValue])

  const handleChecklistUnlock = useCallback(async (snapshot) => {
    await logChecklistAttempt({ status: 'passed', snapshot })
    setChecklistSnapshot(snapshot)
    setChecklistComplete(true)
  }, [logChecklistAttempt])

  const handleChecklistAttemptRecord = useCallback(async ({ status, snapshot, failureReason }) => {
    await logChecklistAttempt({ status, snapshot, failureReason })
  }, [logChecklistAttempt])

  const handleChecklistReset = () => {
    setChecklistSnapshot(null)
    setChecklistComplete(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    if (!checklistSnapshot) {
      setMessage('Checklist snapshot missing. Please redo the decision gate.')
      setChecklistComplete(false)
      setIsSubmitting(false)
      return
    }

    try {
      const payload = {}
      const assignValue = (column, value) => {
        if (!column) return
        payload[column] = value
      }

      assignValue(tradeColumns.instrument, config.uppercaseInstrument ? formData.instrument.toUpperCase() : formData.instrument)
      assignValue(tradeColumns.direction, formData.direction || null)
      assignValue(tradeColumns.optionType, formData.optionType || null)
      assignValue(tradeColumns.stopSize, formData.stopSize === '' ? null : (formData.stopSize ? parseFloat(formData.stopSize) : null))
      assignValue(tradeColumns.strike, formData.strike === '' ? null : (formData.strike ? parseFloat(formData.strike) : null))
      assignValue(tradeColumns.expiry, formData.expiry || null)
      assignValue(tradeColumns.contracts, formData.contracts === '' ? null : (formData.contracts ? parseFloat(formData.contracts) : null))
      assignValue(tradeColumns.premium, formData.premium === '' ? null : (formData.premium ? parseFloat(formData.premium) : null))
      assignValue(tradeColumns.entryPrice, formData.entryPrice === '' ? null : (formData.entryPrice ? parseFloat(formData.entryPrice) : null))
      assignValue(tradeColumns.dollarPerTick, formData.dollarPerTick === '' ? null : (formData.dollarPerTick ? parseFloat(formData.dollarPerTick) : null))
      assignValue(tradeColumns.stopLossTicks, formData.stopLossTicks === '' ? null : (formData.stopLossTicks ? parseInt(formData.stopLossTicks) : null))
      assignValue(tradeColumns.targetTicks, formData.targetTicks === '' ? null : (formData.targetTicks ? parseInt(formData.targetTicks) : null))
      assignValue(tradeColumns.riskAmount, formData.riskAmount === '' ? null : (formData.riskAmount ? parseFloat(formData.riskAmount) : null))
      assignValue(tradeColumns.forecastUrl, formData.forecastUrl || null)
      assignValue(tradeColumns.entryUrl, formData.entryUrl || null)
      assignValue(tradeColumns.entryType, formData.entryType || null)
      assignValue(tradeColumns.rule, formData.rule || null)
      assignValue(tradeColumns.zone, formData.zone || null)
      assignValue(tradeColumns.pattern, formData.pattern || null)
      assignValue(tradeColumns.notes, formData.notes || null)
      assignValue(tradeColumns.status, 'open')
      assignValue(accountField, formData.account || accounts[0]?.value || null)

      const { data, error } = await supabase
        .from(tradesTable)
        .insert([payload])
        .select()
        .single()

      if (error) throw error

      if (data?.[tradeColumns.id]) {
        try {
          await logChecklistForTrade(data[tradeColumns.id], checklistSnapshot)
        } catch (logError) {
          console.error('Checklist log error:', logError.message)
        }
      }

      setMessage('Trade added successfully!')
      setFormData({ ...config.formDefaults })
      setChecklistSnapshot(null)
      setChecklistComplete(false)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setIsSubmitting(false)
  }

  if (!checklistComplete) {
    return (
      <FalconFXChecklist
        onBack={() => setCurrentView('menu')}
        onUnlock={handleChecklistUnlock}
        onLogAttempt={handleChecklistAttemptRecord}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold whitespace-nowrap">{labels.newTradeTitle}</h1>
          <div className="shrink-0">
            {balanceLoading ? (
              <div className="text-slate-400">Loading balance...</div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 p-5 md:p-6 rounded-lg w-fit min-w-[22rem] md:min-w-[28rem] text-left">
                <div className="text-base">
                  <span className="text-slate-400">{labels.balanceHeroLabel}</span>
                  {hasMultipleAccounts && selectedAccountLabel && (
                    <span className="ml-2 text-xs text-slate-500">({selectedAccountLabel})</span>
                  )}
                  <span className="ml-2 text-slate-100 font-semibold">${currentBalance.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-start text-left text-xs md:text-sm text-slate-300 whitespace-nowrap">
                  <span>0.25% Risk: <span className="text-emerald-400 font-semibold">${(currentBalance * 0.0025).toFixed(2)}</span></span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span>0.5% Risk: <span className="text-emerald-400 font-semibold">${(currentBalance * 0.005).toFixed(2)}</span></span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span>1% Risk: <span className="text-emerald-400 font-semibold">${(currentBalance * 0.01).toFixed(2)}</span></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${message.includes('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
            {message}
          </div>
        )}

        {checklistSnapshot && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Checklist Snapshot</p>
                <h2 className="text-xl font-semibold text-white">Gate approved — zone {checklistSnapshot.zone || 'N/A'}</h2>
                <p className="text-xs text-slate-500">Captured at {new Date(checklistSnapshot.recordedAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={handleChecklistReset}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Redo Checklist
              </button>
            </div>
            <ChecklistAnswersList snapshot={checklistSnapshot} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 border border-slate-700 p-6 rounded-lg">
          {accountField && accounts.length > 0 && (
            <SelectField
              label={labels.accountLabel}
              value={formData.account || accounts[0]?.value || ''}
              onChange={(e) => handleInputChange('account', e.target.value)}
              options={accounts}
              required
            />
          )}
          <InputField label={labels.instrument} value={formData.instrument} onChange={(e) => handleInputChange('instrument', e.target.value)} placeholder={labels.instrumentPlaceholder} required />

          {tradeColumns.optionType && config.optionTypeOptions && (
            <SelectField
              label={labels.optionTypeLabel || 'Option Type'}
              value={formData.optionType}
              onChange={(e) => handleInputChange('optionType', e.target.value)}
              options={config.optionTypeOptions}
              required
            />
          )}

          {tradeColumns.direction && (
            <SelectField
              label={labels.directionLabel || 'Direction'}
              value={formData.direction}
              onChange={(e) => handleInputChange('direction', e.target.value)}
              options={config.directionOptions || LONG_SHORT_OPTIONS}
              required
            />
          )}

          {tradeColumns.stopSize && labels.stopSizeLabel && (
            <InputField label={labels.stopSizeLabel} type="number" step={stopSizeStep || '0.01'} value={formData.stopSize} onChange={(e) => handleInputChange('stopSize', e.target.value)} placeholder="e.g., 0.50" />
          )}

          {tradeColumns.strike && (
            <InputField label={labels.strikeLabel || 'Strike Price ($)'} type="number" step="0.01" value={formData.strike} onChange={(e) => handleInputChange('strike', e.target.value)} placeholder="e.g., 175.50" />
          )}

          {tradeColumns.expiry && (
            <InputField label={labels.expiryLabel || 'Expiration Date'} type="date" value={formData.expiry} onChange={(e) => handleInputChange('expiry', e.target.value)} />
          )}

          {tradeColumns.contracts && (
            <InputField label={labels.contractsLabel || 'Contracts'} type="number" step="1" value={formData.contracts} onChange={(e) => handleInputChange('contracts', e.target.value)} placeholder="e.g., 3" />
          )}

          {tradeColumns.premium && (
            <InputField label={labels.premiumLabel || 'Premium ($)'} type="number" step="0.01" value={formData.premium} onChange={(e) => handleInputChange('premium', e.target.value)} placeholder="e.g., 2.45" />
          )}

          {tradeColumns.entryPrice && (
            <InputField label={labels.entryPriceLabel || 'Entry Price'} type="number" step="0.01" value={formData.entryPrice} onChange={(e) => handleInputChange('entryPrice', e.target.value)} placeholder="e.g., 4500.25" />
          )}

          {tradeColumns.dollarPerTick && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-slate-300">{labels.dollarPerTickLabel || 'Dollar per Tick ($)'}</label>
              {tickPresets && tickPresets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tickPresets.map(preset => (
                    <button
                      key={preset.symbol}
                      type="button"
                      onClick={() => handleInputChange('dollarPerTick', preset.dollarPerTick.toString())}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${
                        formData.dollarPerTick === preset.dollarPerTick.toString()
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {preset.symbol} (${preset.dollarPerTick})
                    </button>
                  ))}
                </div>
              )}
              <input
                type="number"
                step="0.01"
                value={formData.dollarPerTick}
                onChange={(e) => handleInputChange('dollarPerTick', e.target.value)}
                placeholder="e.g., 12.50"
                className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
              />
            </div>
          )}

          {tradeColumns.stopLossTicks && (
            <InputField label={labels.stopLossTicksLabel || 'Stop Loss (Ticks)'} type="number" step="1" value={formData.stopLossTicks} onChange={(e) => handleInputChange('stopLossTicks', e.target.value)} placeholder="e.g., 8" />
          )}

          {tradeColumns.targetTicks && (
            <InputField label={labels.targetTicksLabel || 'Target (Ticks)'} type="number" step="1" value={formData.targetTicks} onChange={(e) => handleInputChange('targetTicks', e.target.value)} placeholder="e.g., 24" />
          )}

          {tradeColumns.riskAmount && (
            <div className="mb-4">
              <InputField label="Risk Amount ($)" type="number" step="0.01" value={formData.riskAmount} onChange={(e) => handleInputChange('riskAmount', e.target.value)} placeholder={`Max: ${maxRisk.toFixed(2)}`} required />
              {formData.riskAmount && (
                <div className={`mt-2 p-2 rounded text-sm ${exceedsLimit ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-emerald-900/20 text-emerald-300 border border-emerald-800'}`}>
                  {exceedsLimit ? `Risk exceeds ${(riskFraction * 100).toFixed(1)}% limit (${maxRisk.toFixed(2)})` : `Risk within limit (${currentBalance > 0 ? ((riskAmount / currentBalance) * 100).toFixed(2) : '0.00'}% of balance)`}
                </div>
              )}
            </div>
          )}

          {tradeColumns.entryType && entryTypeOptions && (
            <SelectField label="Entry Type" value={formData.entryType} onChange={(e) => handleInputChange('entryType', e.target.value)} options={entryTypeOptions} required />
          )}

          {tradeColumns.rule && ruleOptions && (
            <SelectField label="Market Context" value={formData.rule} onChange={(e) => handleInputChange('rule', e.target.value)} options={ruleOptions} required />
          )}

          {tradeColumns.zone && zoneOptions && (
            <SelectField label="Zone" value={formData.zone} onChange={(e) => handleInputChange('zone', e.target.value)} options={zoneOptions} required />
          )}

          {tradeColumns.pattern && patternOptions && (
            <SelectField label={labels.pattern} value={formData.pattern} onChange={(e) => handleInputChange('pattern', e.target.value)} options={patternOptions} required />
          )}

          {tradeColumns.entryUrl && (
            <InputField
              label={labels.entryUrlLabel || 'Chart / Notes URL'}
              type="url"
              value={formData.entryUrl}
              onChange={(e) => handleInputChange('entryUrl', e.target.value)}
              placeholder="https://tradingview.com/chart/..."
            />
          )}

          {tradeColumns.forecastUrl && (
            <InputField
              label={labels.forecastUrlLabel || 'Forecast TradingView URL (Optional)'}
              type="url"
              value={formData.forecastUrl || ''}
              onChange={(e) => handleInputChange('forecastUrl', e.target.value)}
              placeholder="https://tradingview.com/chart/..."
            />
          )}

          {tradeColumns.notes && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-slate-300">{labels.notesLabel || 'Notes'}</label>
              <textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Trade setup, reasons, strategy..." rows="4" className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
            </div>
          )}

          <button type="submit" disabled={isSubmitting || exceedsLimit} className={`w-full p-4 rounded-lg font-semibold transition-colors ${isSubmitting || exceedsLimit ? 'bg-slate-600 text-white cursor-not-allowed' : classes.primaryAction}`}>
            {exceedsLimit ? `Risk Exceeds ${(riskFraction * 100).toFixed(1)}% Limit` : isSubmitting ? 'Adding Trade...' : 'Add Trade'}
          </button>
        </form>
      </div>
    </div>
  )
}

const TradingPlanView = ({ setCurrentView, config }) => {
  const { tables, planColumns, labels } = config
  const planTable = tables.plan

  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [planId, setPlanId] = useState(null)

  useEffect(() => {
    const loadPlan = async () => {
      setLoading(true)
      setMessage('')
      try {
        const { data, error } = await supabase
          .from(planTable)
          .select('*')
          .order(planColumns.updatedAt, { ascending: false })
          .limit(1)

        if (error) throw error
        if (data && data.length > 0) {
          setContent(data[0][planColumns.content] || '')
          setLastUpdated(data[0][planColumns.updatedAt])
          setPlanId(data[0][planColumns.id])
        } else {
          setContent('')
          setLastUpdated(null)
          setPlanId(null)
        }
      } catch (err) {
        setMessage(`Error: ${err.message}`)
      }
      setLoading(false)
    }
    loadPlan()
  }, [planTable, planColumns.content, planColumns.updatedAt, planColumns.id])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      if (planId) {
        const { error, data } = await supabase
          .from(planTable)
          .update({ [planColumns.content]: content })
          .eq(planColumns.id, planId)
          .select()
          .limit(1)
        if (error) throw error
        const row = data?.[0]
        setLastUpdated(row?.[planColumns.updatedAt] || new Date().toISOString())
        setMessage(`${labels.planTitle} saved!`)
      } else {
        const { error, data } = await supabase
          .from(planTable)
          .insert([{ [planColumns.content]: content }])
          .select()
          .limit(1)
        if (error) throw error
        const row = data?.[0]
        setPlanId(row?.[planColumns.id] || null)
        setLastUpdated(row?.[planColumns.updatedAt] || new Date().toISOString())
        setMessage(`${labels.planTitle} created!`)
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-3xl font-bold">{labels.planTitle}</h1>
          <div className="text-sm text-slate-400">
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'No plan saved yet'}
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${message.startsWith('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
            {message}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg">
          {loading ? (
            <div className="text-slate-400">Loading...</div>
          ) : (
            <>
              <label className="block text-sm font-medium mb-2 text-slate-300">Document your strategy, criteria, risk rules, and review checklist here.</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Outline your strategy, criteria, risk management, and review routine..."
                rows={18}
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-500"
              />
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-slate-500">Tip: Keep this updated as your playbook evolves.</div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                >
                  {saving ? 'Saving...' : labels.planSave}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const PRESET_SL = [-1, -2, -3, -5]
const PRESET_TP = [2, 3, 5, 10]
const SCENARIO_PCTS = [-10, -7, -5, -3, -2, -1, 0, 1, 2, 3, 5, 7, 10]

const OptionsGreeksCalculator = ({ onBack }) => {
  const [stockPrice, setStockPrice] = useState('')
  const [premium, setPremium] = useState('')
  const [delta, setDelta] = useState('')
  const [gamma, setGamma] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [tpPrice, setTpPrice] = useState('')
  const [contracts, setContracts] = useState('')
  const [result, setResult] = useState(null)

  const calcLeg = (P, d, g, targetStock, S, n) => {
    const dStock = targetStock - S
    const dOption = d * dStock + 0.5 * g * dStock * dStock
    const estPrice = P + dOption
    const pctChange = P !== 0 ? (dOption / P) * 100 : null
    const totalDollar = dOption * n * 100
    return { dStock, dOption, estPrice, pctChange, totalDollar }
  }

  useEffect(() => {
    const S = parseFloat(stockPrice)
    const P = parseFloat(premium)
    const d = parseFloat(delta)
    const g = parseFloat(gamma)
    const n = parseInt(contracts)
    const sl = parseFloat(stopPrice)
    const tp = parseFloat(tpPrice)

    if ([S, P, d, g, n].some(isNaN) || n <= 0) { setResult(null); return }
    if (isNaN(sl) && isNaN(tp)) { setResult(null); return }

    const stop = !isNaN(sl) ? calcLeg(P, d, g, sl, S, n) : null
    const takeProfit = !isNaN(tp) ? calcLeg(P, d, g, tp, S, n) : null
    const rr = stop && takeProfit && stop.totalDollar !== 0
      ? Math.abs(takeProfit.totalDollar / stop.totalDollar)
      : null

    setResult({ stop, takeProfit, rr, n })
  }, [stockPrice, premium, delta, gamma, stopPrice, tpPrice, contracts])

  const S = parseFloat(stockPrice)
  const P = parseFloat(premium)
  const d = parseFloat(delta)
  const g = parseFloat(gamma)
  const n = parseInt(contracts)
  const scenarioRows = (!isNaN(S) && !isNaN(P) && !isNaN(d) && !isNaN(g) && !isNaN(n) && n > 0)
    ? SCENARIO_PCTS.map(pct => {
        const targetStock = S * (1 + pct / 100)
        const { estPrice, totalDollar } = calcLeg(P, d, g, targetStock, S, n)
        return { pct, targetStock, estPrice: Math.max(0, estPrice), totalDollar }
      })
    : null

  const slVal = parseFloat(stopPrice)
  const tpVal = parseFloat(tpPrice)
  const closestSlIdx = scenarioRows && !isNaN(slVal)
    ? scenarioRows.reduce((best, row, i) => Math.abs(row.targetStock - slVal) < Math.abs(scenarioRows[best].targetStock - slVal) ? i : best, 0)
    : null
  const closestTpIdx = scenarioRows && !isNaN(tpVal)
    ? scenarioRows.reduce((best, row, i) => Math.abs(row.targetStock - tpVal) < Math.abs(scenarioRows[best].targetStock - tpVal) ? i : best, 0)
    : null

  const ResultRow = ({ label, value, large, color }) => (
    <div className={`flex justify-between items-center p-3 rounded-lg ${large ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
      <span className={`text-sm ${large ? 'text-slate-300' : 'text-slate-400'}`}>{label}</span>
      <span className={`font-bold ${large ? 'text-xl' : ''} ${color}`}>{value}</span>
    </div>
  )

  const formatDollar = v => `${v >= 0 ? '+' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${v < 0 ? ' loss' : ' gain'}`
  const formatPct = v => v !== null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : 'N/A'

  const presetBtn = (pct, setter, currentVal) => {
    const computed = !isNaN(S) ? parseFloat((S * (1 + pct / 100)).toFixed(2)) : null
    const isActive = computed !== null && currentVal === String(computed)
    return (
      <button
        key={pct}
        disabled={isNaN(S)}
        onClick={() => computed !== null && setter(String(computed))}
        className={`px-2 py-0.5 text-xs rounded border transition-colors ${isNaN(S) ? 'opacity-30 cursor-not-allowed border-slate-700 text-slate-500' : isActive ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
      >
        {pct > 0 ? `+${pct}%` : `${pct}%`}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors text-sm">
          ← Back to Menu
        </button>
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-bold">Greeks Calculator</h1>
          <button onClick={() => { setStockPrice(''); setPremium(''); setDelta(''); setGamma(''); setStopPrice(''); setTpPrice(''); setContracts(''); setResult(null) }} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Reset</button>
        </div>
        <p className="text-slate-400 text-sm mb-6">Enter your option details once — see stop loss and take profit impact side by side.</p>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Stock Price ($)" type="number" step="0.01" value={stockPrice} onChange={e => setStockPrice(e.target.value)} placeholder="e.g. 150.00" />
            <InputField label="Option Premium ($)" type="number" step="0.01" value={premium} onChange={e => setPremium(e.target.value)} placeholder="e.g. 3.50" />
            <InputField label="Delta" type="number" step="0.001" value={delta} onChange={e => setDelta(e.target.value)} placeholder="-0.45 for puts" />
            <InputField label="Gamma" type="number" step="0.001" value={gamma} onChange={e => setGamma(e.target.value)} placeholder="e.g. 0.03" />
            <div>
              <InputField label="Stop Loss Price ($)" type="number" step="0.01" value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder="e.g. 145.00" />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {PRESET_SL.map(pct => presetBtn(pct, setStopPrice, stopPrice))}
              </div>
            </div>
            <div>
              <InputField label="Take Profit Price ($)" type="number" step="0.01" value={tpPrice} onChange={e => setTpPrice(e.target.value)} placeholder="e.g. 158.00" />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {PRESET_TP.map(pct => presetBtn(pct, setTpPrice, tpPrice))}
              </div>
            </div>
            <InputField label="Contracts" type="number" step="1" value={contracts} onChange={e => setContracts(e.target.value)} placeholder="e.g. 2" />
          </div>
        </div>

        {scenarioRows && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-sm font-semibold text-slate-300">Scenario Table</p>
              <p className="text-xs text-slate-500 mt-0.5">Click → SL or → TP to set a price level from any row.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Move</th>
                    <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">Stock Price</th>
                    <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">Option Price</th>
                    <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">P&amp;L</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioRows.map((row, i) => {
                    const isZero = row.pct === 0
                    const isSl = i === closestSlIdx
                    const isTp = i === closestTpIdx
                    const borderClass = isSl ? 'border-l-2 border-l-red-500' : isTp ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent'
                    const bgClass = isZero ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                    return (
                      <tr key={row.pct} className={`${bgClass} ${borderClass} transition-colors`}>
                        <td className="px-4 py-2">
                          <span className={`font-mono text-xs font-semibold ${row.pct < 0 ? 'text-red-400' : row.pct > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {row.pct > 0 ? `+${row.pct}%` : row.pct === 0 ? '0% (now)' : `${row.pct}%`}
                          </span>
                          {isSl && <span className="ml-2 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1">SL</span>}
                          {isTp && <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1">TP</span>}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-300">${row.targetStock.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-300">${row.estPrice.toFixed(2)}</td>
                        <td className={`px-4 py-2 text-right font-mono font-semibold ${row.totalDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {row.totalDollar >= 0 ? '+' : ''}${Math.abs(row.totalDollar).toFixed(0)}
                        </td>
                        <td className="px-3 py-2">
                          {!isZero && (
                            <div className="flex gap-1 justify-end">
                              {row.pct < 0 && (
                                <button onClick={() => setStopPrice(row.targetStock.toFixed(2))} className="text-xs px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap">→ SL</button>
                              )}
                              {row.pct > 0 && (
                                <button onClick={() => setTpPrice(row.targetStock.toFixed(2))} className="text-xs px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors whitespace-nowrap">→ TP</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && result.rr !== null && (
          <div className={`rounded-lg p-4 mb-4 flex items-center justify-between border ${result.rr >= 1.5 ? 'bg-emerald-900/20 border-emerald-600' : 'bg-amber-900/20 border-amber-600'}`}>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Risk / Reward</p>
              <p className={`text-4xl font-bold ${result.rr >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>1 : {result.rr.toFixed(2)}</p>
              {result.rr < 1.5 && <p className="text-xs text-amber-400 mt-1">Below 1.5:1 minimum — consider adjusting targets.</p>}
            </div>
            <div className="text-right text-sm text-slate-400 space-y-1">
              {result.stop && <p>Risk: <span className="text-red-400 font-semibold">{formatDollar(result.stop.totalDollar)}</span></p>}
              {result.takeProfit && <p>Reward: <span className="text-emerald-400 font-semibold">{formatDollar(result.takeProfit.totalDollar)}</span></p>}
            </div>
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {result.stop && (
              <div className="bg-slate-900 border border-red-500/30 rounded-lg p-4 space-y-2">
                <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide mb-3">Stop Loss</h2>
                <ResultRow label="ΔStock" value={`${result.stop.dStock >= 0 ? '+' : ''}${result.stop.dStock.toFixed(2)}`} color={result.stop.dStock >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <ResultRow label="Option Price at SL" large value={<>{`$${Math.max(result.stop.estPrice, 0).toFixed(2)}`}{result.stop.estPrice < 0 && <span className="text-xs font-normal text-red-400 ml-1">(floored)</span>}</>} color="text-white" />
                <ResultRow label="% Change" value={formatPct(result.stop.pctChange)} color={result.stop.pctChange !== null && result.stop.pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <ResultRow label={`Total (${result.n}× 100)`} large value={formatDollar(result.stop.totalDollar)} color={result.stop.totalDollar >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              </div>
            )}
            {result.takeProfit && (
              <div className="bg-slate-900 border border-emerald-500/30 rounded-lg p-4 space-y-2">
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-3">Take Profit</h2>
                <ResultRow label="ΔStock" value={`${result.takeProfit.dStock >= 0 ? '+' : ''}${result.takeProfit.dStock.toFixed(2)}`} color={result.takeProfit.dStock >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <ResultRow label="Option Price at TP" large value={`$${Math.max(result.takeProfit.estPrice, 0).toFixed(2)}`} color="text-white" />
                <ResultRow label="% Change" value={formatPct(result.takeProfit.pctChange)} color={result.takeProfit.pctChange !== null && result.takeProfit.pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <ResultRow label={`Total (${result.n}× 100)`} large value={formatDollar(result.takeProfit.totalDollar)} color={result.takeProfit.totalDollar >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              </div>
            )}
          </div>
        )}

        {result && (
          <p className="text-xs text-slate-500">ΔOption ≈ Δ × ΔStock + ½ × Γ × ΔStock². Approximation only — theta decay and IV changes not included.</p>
        )}

        {!result && !scenarioRows && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
            Fill in the fields above. Enter a stop, take profit, or both.
          </div>
        )}
      </div>
    </div>
  )
}

const TrailingStopView = ({ onBack }) => {
  const [stops, setStops] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailing_stops') || '[]') } catch { return [] }
  })
  const [form, setForm] = useState({ ticker: '', entryPrice: '', currentPrice: '', premium: '', delta: '', gamma: '', contracts: '', trailingType: 'percent', trailingDistance: '' })
  const [updateInputs, setUpdateInputs] = useState({})
  const [showForm, setShowForm] = useState(true)
  const [formError, setFormError] = useState('')

  const persistStops = newStops => {
    setStops(newStops)
    localStorage.setItem('trailing_stops', JSON.stringify(newStops))
  }

  const calcLeg = (P, d, g, targetStock, S, n) => {
    const dStock = targetStock - S
    const dOption = d * dStock + 0.5 * g * dStock * dStock
    return { estPrice: Math.max(0, P + dOption), totalDollar: dOption * n * 100 }
  }

  const computeStop = stop => {
    const { entryPrice, currentPrice, highPrice, trailingType, trailingDistance, premium, delta, gamma, contracts } = stop
    const high = Math.max(highPrice, currentPrice)
    const dist = trailingType === 'percent' ? high * (trailingDistance / 100) : trailingDistance
    const stopLevel = high - dist
    const isTriggered = currentPrice <= stopLevel
    const distToStop = currentPrice - stopLevel
    const { estPrice, totalDollar } = calcLeg(premium, delta, gamma, stopLevel, entryPrice, contracts)
    return { high, stopLevel, isTriggered, distToStop, estPrice, totalDollar }
  }

  const handleAdd = () => {
    const S = parseFloat(form.entryPrice), cur = parseFloat(form.currentPrice)
    const P = parseFloat(form.premium), d = parseFloat(form.delta)
    const g = parseFloat(form.gamma), n = parseInt(form.contracts)
    const dist = parseFloat(form.trailingDistance)
    if ([S, cur, P, d, g, n, dist].some(isNaN) || n <= 0 || dist <= 0) {
      setFormError('Please fill in all fields with valid numbers.')
      return
    }
    setFormError('')
    persistStops([...stops, {
      id: Date.now().toString(),
      ticker: form.ticker.toUpperCase() || '—',
      entryPrice: S, currentPrice: cur, highPrice: Math.max(S, cur),
      premium: P, delta: d, gamma: g, contracts: n,
      trailingType: form.trailingType, trailingDistance: dist,
      createdAt: Date.now()
    }])
    setForm({ ticker: '', entryPrice: '', currentPrice: '', premium: '', delta: '', gamma: '', contracts: '', trailingType: 'percent', trailingDistance: '' })
    setShowForm(false)
  }

  const handleUpdatePrice = id => {
    const raw = updateInputs[id]
    const price = parseFloat(raw)
    if (isNaN(price) || price <= 0) return
    persistStops(stops.map(s => s.id !== id ? s : { ...s, currentPrice: price, highPrice: Math.max(s.highPrice, price) }))
    setUpdateInputs(prev => ({ ...prev, [id]: '' }))
  }

  const ff = v => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors text-sm">← Back to Menu</button>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Trailing Stop Tracker</h1>
          <button onClick={() => setShowForm(f => !f)} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">{showForm ? 'Hide form' : '+ Add stop'}</button>
        </div>
        <p className="text-slate-400 text-sm mb-6">Track trailing stops on the underlying stock. Update the price manually each time you check in — the high watermark and stop level update automatically.</p>

        {showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6">
            <p className="text-sm font-semibold text-slate-300 mb-4">New Trailing Stop</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Ticker (optional)</label>
                <input value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))} placeholder="e.g. AAPL" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Entry Stock Price ($)</label>
                <input type="number" step="0.01" value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} placeholder="e.g. 150.00" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Current Stock Price ($)</label>
                <input type="number" step="0.01" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} placeholder="e.g. 153.00" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Option Premium ($)</label>
                <input type="number" step="0.01" value={form.premium} onChange={e => setForm(f => ({ ...f, premium: e.target.value }))} placeholder="e.g. 3.50" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contracts</label>
                <input type="number" step="1" value={form.contracts} onChange={e => setForm(f => ({ ...f, contracts: e.target.value }))} placeholder="e.g. 2" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Delta</label>
                <input type="number" step="0.001" value={form.delta} onChange={e => setForm(f => ({ ...f, delta: e.target.value }))} placeholder="-0.45 for puts" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gamma</label>
                <input type="number" step="0.001" value={form.gamma} onChange={e => setForm(f => ({ ...f, gamma: e.target.value }))} placeholder="e.g. 0.03" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Trailing Type</label>
                <select value={form.trailingType} onChange={e => setForm(f => ({ ...f, trailingType: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500">
                  <option value="percent">Percentage (%)</option>
                  <option value="dollar">Dollar ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Trailing Distance {form.trailingType === 'percent' ? '(%)' : '($)'}</label>
                <input type="number" step="0.1" value={form.trailingDistance} onChange={e => setForm(f => ({ ...f, trailingDistance: e.target.value }))} placeholder={form.trailingType === 'percent' ? 'e.g. 3' : 'e.g. 5.00'} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
              </div>
            </div>
            {formError && <p className="text-red-400 text-xs mt-3">{formError}</p>}
            <button onClick={handleAdd} className="mt-4 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold text-sm transition-colors">Add Trailing Stop</button>
          </div>
        )}

        {stops.length === 0 && !showForm && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">No trailing stops yet. Click "+ Add stop" to create one.</div>
        )}

        <div className="space-y-4">
          {stops.map(stop => {
            const { high, stopLevel, isTriggered, distToStop, estPrice, totalDollar } = computeStop(stop)
            const pctTrail = stop.trailingType === 'percent' ? `${stop.trailingDistance}%` : ff(stop.trailingDistance)
            return (
              <div key={stop.id} className={`bg-slate-900 rounded-lg border ${isTriggered ? 'border-red-500' : 'border-slate-800'} overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-3 ${isTriggered ? 'bg-red-500/10' : 'bg-slate-800/40'}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-100">{stop.ticker}</span>
                    <span className="text-xs text-slate-500">trailing {pctTrail} · {stop.contracts} contract{stop.contracts !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTriggered
                      ? <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded animate-pulse">STOP HIT</span>
                      : <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">Active</span>
                    }
                    <button onClick={() => persistStops(stops.filter(s => s.id !== stop.id))} className="text-slate-500 hover:text-red-400 transition-colors text-xs ml-2">✕</button>
                  </div>
                </div>

                <div className="px-4 py-4 grid grid-cols-3 gap-4 border-b border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">High Watermark</p>
                    <p className="text-lg font-bold text-slate-100">{ff(high)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Stop Level</p>
                    <p className={`text-lg font-bold ${isTriggered ? 'text-red-400' : 'text-amber-400'}`}>{ff(stopLevel)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Current Price</p>
                    <p className="text-lg font-bold text-slate-100">{ff(stop.currentPrice)}</p>
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-2 gap-4 border-b border-slate-800 bg-slate-800/20">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Distance to Stop</p>
                    <p className={`font-semibold text-sm ${distToStop <= 0 ? 'text-red-400' : distToStop < 2 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {distToStop >= 0 ? `${ff(distToStop)} above` : `${ff(Math.abs(distToStop))} below`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Est. Option P&L at Stop</p>
                    <p className={`font-semibold text-sm ${totalDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {totalDollar >= 0 ? '+' : ''}{ff(totalDollar)} ({ff(estPrice)} / contract)
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 flex items-center gap-2">
                  <input
                    type="number" step="0.01"
                    value={updateInputs[stop.id] || ''}
                    onChange={e => setUpdateInputs(prev => ({ ...prev, [stop.id]: e.target.value }))}
                    placeholder="New stock price..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    onKeyDown={e => e.key === 'Enter' && handleUpdatePrice(stop.id)}
                  />
                  <button onClick={() => handleUpdatePrice(stop.id)} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors whitespace-nowrap">Update Price</button>
                </div>
              </div>
            )
          })}
        </div>

        {stops.length > 0 && (
          <p className="text-xs text-slate-600 mt-6">Option P&L estimated using delta-gamma approximation. Theta decay and IV changes not included.</p>
        )}
      </div>
    </div>
  )
}

const EquityCurveView = ({ config, onBack }) => {
  const { tables, balanceColumns } = config
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from(tables.balance)
        .select('*')
        .order(balanceColumns.createdAt, { ascending: true })
      setHistory(data || [])
      setLoading(false)
    }
    load()
  }, [tables.balance, balanceColumns.createdAt])

  const chartData = history.map((row, i) => ({
    index: i + 1,
    date: row[balanceColumns.createdAt] ? new Date(row[balanceColumns.createdAt]).toLocaleDateString() : '',
    balance: parseFloat(row[balanceColumns.balance]) || 0,
    change: parseFloat(row[balanceColumns.changeAmount]) || 0,
    reason: row[balanceColumns.reason] || ''
  }))

  const startBalance = chartData[0]?.balance ?? 0
  const currentBalance = chartData[chartData.length - 1]?.balance ?? 0
  const totalPnL = currentBalance - startBalance
  const closedChanges = history.filter(r => parseFloat(r[balanceColumns.changeAmount]) !== 0)
  const wins = closedChanges.filter(r => parseFloat(r[balanceColumns.changeAmount]) > 0).length
  const winRate = closedChanges.length > 0 ? ((wins / closedChanges.length) * 100).toFixed(1) : 'N/A'

  let peak = 0, maxDD = 0
  chartData.forEach(d => {
    if (d.balance > peak) peak = d.balance
    const dd = peak > 0 ? ((peak - d.balance) / peak) * 100 : 0
    if (dd > maxDD) maxDD = dd
  })

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-slate-300 font-semibold">{d.date}</p>
        <p className="text-white">Balance: <span className="font-bold">${d.balance.toFixed(2)}</span></p>
        {d.change !== 0 && <p className={d.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>{d.change >= 0 ? '+' : ''}${d.change.toFixed(2)}</p>}
        {d.reason && <p className="text-slate-400 text-xs mt-1 max-w-[200px]">{d.reason}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Equity Curve</h1>
        {loading ? <p className="text-slate-400">Loading balance history...</p> : chartData.length < 2 ? (
          <p className="text-slate-400">Not enough balance history to display a chart. Close some trades first.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Starting Balance', value: `$${startBalance.toFixed(2)}`, color: 'text-slate-100' },
                { label: 'Current Balance', value: `$${currentBalance.toFixed(2)}`, color: 'text-slate-100' },
                { label: 'Total P&L', value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`, color: totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'Max Drawdown', value: `${maxDD.toFixed(1)}%`, color: maxDD > 10 ? 'text-red-400' : 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={startBalance} stroke="#475569" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="balance" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#a78bfa' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Win Rate (balance changes)</p>
                <p className="text-2xl font-bold text-slate-100">{winRate}{winRate !== 'N/A' ? '%' : ''}</p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-slate-100">{chartData.length}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const FuturesPositionSizer = ({ config, onBack }) => {
  const [mode, setMode] = useState('stopFromContracts')
  const [currentBalance, setCurrentBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState('')
  const [riskPercent, setRiskPercent] = useState('1')
  const [dollarPerTick, setDollarPerTick] = useState('')
  const [stopLossTicks, setStopLossTicks] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [result, setResult] = useState(null)

  const { tables, balanceColumns, labels, tickPresets = [] } = config

  useEffect(() => {
    const loadBalance = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from(tables.balance)
          .select('*')
          .order(balanceColumns.createdAt, { ascending: false })
          .limit(1)
        if (error) throw error
        const latest = data?.[0]
        setCurrentBalance(latest ? parseFloat(latest[balanceColumns.balance]) || 0 : 0)
      } catch (err) {
        console.error('Error loading balance:', err.message)
      }
      setLoading(false)
    }
    loadBalance()
  }, [tables.balance, balanceColumns.createdAt, balanceColumns.balance])

  const handlePresetChange = (presetSymbol) => {
    setSelectedPreset(presetSymbol)
    const preset = tickPresets.find(p => p.symbol === presetSymbol)
    if (preset) {
      setDollarPerTick(preset.dollarPerTick.toString())
    }
  }

  useEffect(() => {
    const balance = currentBalance
    const risk = parseFloat(riskPercent) / 100
    const tickValue = parseFloat(dollarPerTick)

    if (mode === 'stopFromContracts') {
      const numContracts = parseInt(contracts)
      if (!balance || !risk || !tickValue || !numContracts || numContracts <= 0) {
        setResult(null)
        return
      }
      const riskDollars = balance * risk
      const maxStopTicks = Math.floor(riskDollars / (tickValue * numContracts))
      const actualRiskDollars = maxStopTicks * tickValue * numContracts
      setResult({
        type: 'stopFromContracts',
        maxStopTicks,
        riskDollars: actualRiskDollars,
        riskPercent: (actualRiskDollars / balance) * 100,
        contracts: numContracts
      })
    } else {
      const stopTicks = parseInt(stopLossTicks)
      if (!balance || !risk || !tickValue || !stopTicks || stopTicks <= 0) {
        setResult(null)
        return
      }
      const riskDollars = balance * risk
      const maxContracts = Math.floor(riskDollars / (tickValue * stopTicks))
      const actualRiskDollars = maxContracts * tickValue * stopTicks
      setResult({
        type: 'contractsFromStop',
        maxContracts,
        riskDollars: actualRiskDollars,
        riskPercent: (actualRiskDollars / balance) * 100,
        stopTicks
      })
    }
  }, [contracts, riskPercent, dollarPerTick, stopLossTicks, mode, currentBalance])

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
      >
        ← Back to Menu
      </button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{labels.positionSizerButton || 'Position Sizing Calculator'}</h1>
        <p className="text-slate-400 mb-8">Calculate optimal position size or maximum stop loss based on your risk parameters.</p>

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">{labels.balanceHeroLabel || 'Account Balance:'}</span>
            {loading ? (
              <span className="text-slate-400">Loading...</span>
            ) : (
              <span className="text-2xl font-bold text-emerald-400">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('stopFromContracts')}
            className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
              mode === 'stopFromContracts'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="font-semibold">Calculate Max Stop</div>
            <div className="text-xs opacity-80">Given # of contracts</div>
          </button>
          <button
            onClick={() => setMode('contractsFromStop')}
            className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
              mode === 'contractsFromStop'
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="font-semibold">Calculate Max Contracts</div>
            <div className="text-xs opacity-80">Given stop loss ticks</div>
          </button>
        </div>

        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-300">Risk Percentage (%)</label>
            <div className="flex gap-2 mb-2">
              {['0.25', '0.5', '1', '2'].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRiskPercent(pct)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    riskPercent === pct
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.01"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
              placeholder="Enter custom %"
            />
          </div>

          {tickPresets.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-slate-300">Quick Select Instrument</label>
              <div className="flex flex-wrap gap-2">
                {tickPresets.map(preset => (
                  <button
                    key={preset.symbol}
                    type="button"
                    onClick={() => handlePresetChange(preset.symbol)}
                    className={`px-3 py-2 rounded text-sm border transition-colors ${
                      selectedPreset === preset.symbol
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-semibold">{preset.symbol}</div>
                    <div className="text-xs opacity-80">${preset.dollarPerTick}/tick</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-300">{labels.dollarPerTickLabel || 'Dollar per Tick ($)'}</label>
            <input
              type="number"
              step="0.01"
              value={dollarPerTick}
              onChange={(e) => { setDollarPerTick(e.target.value); setSelectedPreset(''); }}
              className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
              placeholder="e.g., 12.50 for ES"
            />
          </div>

          {mode === 'stopFromContracts' ? (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-slate-300">{labels.contractsLabel || 'Number of Contracts'}</label>
              <input
                type="number"
                step="1"
                value={contracts}
                onChange={(e) => setContracts(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                placeholder="e.g., 2"
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-slate-300">{labels.stopLossTicksLabel || 'Stop Loss (Ticks)'}</label>
              <input
                type="number"
                step="1"
                value={stopLossTicks}
                onChange={(e) => setStopLossTicks(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                placeholder="e.g., 10"
              />
            </div>
          )}
        </div>

        {result && (
          <div className="mt-6 bg-slate-900 border border-amber-500/30 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-amber-300 mb-4">Calculation Result</h3>

            {result.type === 'stopFromContracts' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Maximum Stop Loss:</span>
                  <span className="text-3xl font-bold text-emerald-400">{result.maxStopTicks} ticks</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Risk Amount:</span>
                  <span className="text-lg font-semibold text-slate-100">${result.riskDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Actual Risk %:</span>
                  <span className="text-lg font-semibold text-slate-100">{result.riskPercent.toFixed(3)}%</span>
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  With {result.contracts} contract(s), you can risk up to {result.maxStopTicks} ticks before exceeding your risk limit.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Maximum Contracts:</span>
                  <span className="text-3xl font-bold text-emerald-400">{result.maxContracts}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Risk Amount:</span>
                  <span className="text-lg font-semibold text-slate-100">${result.riskDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Actual Risk %:</span>
                  <span className="text-lg font-semibold text-slate-100">{result.riskPercent.toFixed(3)}%</span>
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  With a {result.stopTicks}-tick stop, you can trade up to {result.maxContracts} contract(s) within your risk limit.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const TradingEnvironment = ({ config, onBack }) => {
  const [currentView, setCurrentView] = useState('menu')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({ ...config.formDefaults })
  const [dashStats, setDashStats] = useState(null)
  const features = config.features || {}
  const supportsMissedTrades = features.missedTrades && config.tables?.missed
  const supportsTradingPlan = features.tradingPlan !== false && config.tables?.plan
  const supportsPositionSizer = features.positionSizer && config.tables?.balance
  const supportsGreeksCalculator = config.key === 'options'
  const supportsPartialExits = Boolean(config.tables?.partialExits)
  const supportsTagLinks = Boolean(config.tables?.tagLinks)
  const supportsEquityCurve = Boolean(config.tables?.balance)

  useEffect(() => {
    setCurrentView('menu')
    setMessage('')
    setIsSubmitting(false)
    setFormData({ ...config.formDefaults })
    setDashStats(null)
  }, [config])

  useEffect(() => {
    if (currentView !== 'menu') return
    const load = async () => {
      const { tradeColumns, balanceColumns } = config
      const [tradesRes, balRes] = await Promise.all([
        supabase.from(config.tables.trades).select('*').order(tradeColumns.entryDate, { ascending: false }).limit(50),
        supabase.from(config.tables.balance).select('*').order(balanceColumns.createdAt, { ascending: false }).limit(1)
      ])
      const trades = tradesRes.data || []
      const balance = balRes.data?.[0] ? parseFloat(balRes.data[0][balanceColumns.balance]) || 0 : 0
      const closed = trades.filter(t => t[tradeColumns.status] === 'closed')
      const open = trades.filter(t => t[tradeColumns.status] === 'open')
      const wins = closed.filter(t => parseFloat(t[tradeColumns.pnl] ?? 0) > 0)
      const totalPnL = closed.reduce((s, t) => s + (parseFloat(t[tradeColumns.pnl] ?? 0)), 0)
      const winRate = closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(1) : null
      const avgPnL = closed.length > 0 ? (totalPnL / closed.length).toFixed(2) : null
      setDashStats({ balance, openCount: open.length, winRate, avgPnL, totalPnL, recentTrades: trades.slice(0, 5) })
    }
    load()
  }, [currentView, config])

  if (currentView === 'menu') {
    const { tradeColumns } = config
    const statCards = dashStats ? [
      { label: 'Account Balance', value: `$${dashStats.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-slate-100' },
      { label: 'Open Trades', value: dashStats.openCount, color: 'text-blue-400' },
      { label: 'Win Rate', value: dashStats.winRate !== null ? `${dashStats.winRate}%` : '—', color: parseFloat(dashStats.winRate) >= 50 ? 'text-emerald-400' : 'text-amber-400' },
      { label: 'Avg P&L', value: dashStats.avgPnL !== null ? `$${parseFloat(dashStats.avgPnL) >= 0 ? '+' : ''}${dashStats.avgPnL}` : '—', color: parseFloat(dashStats.avgPnL) >= 0 ? 'text-emerald-400' : 'text-red-400' },
    ] : []

    return (
      <div className="min-h-screen bg-gray-950 text-slate-100">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">{config.labels.menuBack}</button>
          <h1 className="text-xl font-bold text-slate-100">{config.environmentTitle}</h1>
          <div className="w-24" />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {dashStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {dashStats?.recentTrades?.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Recent Trades</h2>
              <div className="space-y-2">
                {dashStats.recentTrades.map(trade => {
                  const pnl = parseFloat(trade[tradeColumns.pnl] ?? 0)
                  const isClosed = trade[tradeColumns.status] === 'closed'
                  return (
                    <div key={trade[tradeColumns.id]} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-100">{trade[tradeColumns.instrument]}</span>
                        {tradeColumns.direction && <span className="text-xs text-slate-500 uppercase">{trade[tradeColumns.direction]}</span>}
                        {tradeColumns.optionType && <span className="text-xs text-slate-500 uppercase">{trade[tradeColumns.optionType]}</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isClosed ? 'bg-slate-700 text-slate-400' : 'bg-blue-900/40 text-blue-400'}`}>{trade[tradeColumns.status]}</span>
                      </div>
                      <div className="text-right">
                        {isClosed && <span className={`font-semibold text-sm ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</span>}
                        <p className="text-xs text-slate-500">{trade[tradeColumns.entryDate] ? new Date(trade[tradeColumns.entryDate]).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {config.checklist?.tables?.attempts && <ChecklistAnalyticsCard config={config} />}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { label: config.labels.newTradeButton, view: 'new-trade', primary: true },
              { label: config.labels.updateTradeButton, view: 'update-trade' },
              { label: config.labels.editTradeButton || 'Edit Trade', view: 'edit-trade' },
              { label: config.labels.viewDataButton, view: 'view-data' },
              ...(supportsPartialExits ? [{ label: config.labels.partialExitButton || 'Partial Exit', view: 'partial-exit' }] : []),
              ...(supportsGreeksCalculator ? [{ label: config.labels.greeksCalculatorButton, view: 'greeks-calculator' }, { label: 'Trailing Stop Tracker', view: 'trailing-stop' }] : []),
              ...(supportsPositionSizer ? [{ label: config.labels.positionSizerButton, view: 'position-sizer' }] : []),
              ...(supportsMissedTrades ? [{ label: config.labels.missedTradeButton, view: 'missed-trade' }, { label: config.labels.missedDataButton, view: 'missed-data' }] : []),
              ...(supportsTradingPlan ? [{ label: config.labels.tradingPlanButton, view: 'trading-plan' }] : []),
              ...(supportsEquityCurve ? [{ label: 'Equity Curve', view: 'equity-curve' }] : []),
              ...(supportsTagLinks ? [{ label: config.labels.manageTagsButton || 'Manage Tags', view: 'manage-tags' }] : []),
            ].map(({ label, view, primary }) => (
              <button key={view} onClick={() => setCurrentView(view)}
                className={`p-4 rounded-xl border text-sm font-medium text-left transition-all hover:border-slate-500 ${primary ? config.classes.primaryButton + ' border-transparent' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'new-trade') {
    return (
      <NewTradeView
        setCurrentView={setCurrentView}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        message={message}
        setMessage={setMessage}
        config={config}
      />
    )
  }

  if (currentView === 'update-trade') {
    return (
      <UpdateTradeView
        setCurrentView={setCurrentView}
        setMessage={setMessage}
        message={message}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        config={config}
      />
    )
  }

  if (currentView === 'edit-trade') return <EditTradeView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'partial-exit' && supportsPartialExits) return <PartialExitView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'manage-tags' && supportsTagLinks) return <ManageTagsView setCurrentView={setCurrentView} />
  if (currentView === 'equity-curve' && supportsEquityCurve) return <EquityCurveView config={config} onBack={() => setCurrentView('menu')} />
  if (currentView === 'view-data') return <ViewHistoricalData setCurrentView={setCurrentView} config={config} />
  if (currentView === 'missed-trade' && supportsMissedTrades) return <MissedTradeView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'missed-data' && supportsMissedTrades) return <ViewMissedTrades setCurrentView={setCurrentView} config={config} />
  if (currentView === 'trading-plan' && supportsTradingPlan) return <TradingPlanView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'position-sizer' && supportsPositionSizer) return <FuturesPositionSizer config={config} onBack={() => setCurrentView('menu')} />
  if (currentView === 'greeks-calculator' && supportsGreeksCalculator) return <OptionsGreeksCalculator onBack={() => setCurrentView('menu')} />
  if (currentView === 'trailing-stop' && supportsGreeksCalculator) return <TrailingStopView onBack={() => setCurrentView('menu')} />
  return null
}

export default function Home() {
  const [activeMode, setActiveMode] = useState(null)

  if (!activeMode) {
    return (
      <div className="min-h-screen bg-gray-950 text-slate-100 flex items-center justify-center">
        <div className="w-full max-w-2xl px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4">Trading Journal</h1>
          <p className="text-slate-400 mb-10 text-lg">Select your workspace to manage trades, review performance, and sharpen your edge.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <MenuButton onClick={() => setActiveMode('options')} className={MODE_CONFIG.options.classes.primaryButton}>
              {MODE_CONFIG.options.homeButtonLabel}
            </MenuButton>
            <MenuButton onClick={() => setActiveMode('futures')} className={MODE_CONFIG.futures.classes.primaryButton}>
              {MODE_CONFIG.futures.homeButtonLabel}
            </MenuButton>
          </div>
        </div>
      </div>
    )
  }

  return <TradingEnvironment config={MODE_CONFIG[activeMode]} onBack={() => setActiveMode(null)} />
}
