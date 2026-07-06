'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

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
    <label className="block text-sm font-medium mb-2 text-zinc-400">
      {label} {required && <span className="text-white">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      autoComplete="off"
      className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/30 placeholder-zinc-600"
    />
  </div>
)

const SelectField = ({ label, value, onChange, options, required = false }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-2 text-zinc-400">
      {label} {required && <span className="text-white">*</span>}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/30"
    >
      {options.map(option => (
        <option key={option.value} value={option.value} className="bg-zinc-950 text-white">
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

const getWeekBounds = (offset = 0) => {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon … 6=Sat
  const daysToLastMon = day === 0 ? 13 : day + 6
  const mon = new Date(today)
  mon.setDate(today.getDate() - daysToLastMon + offset * 7)
  mon.setHours(0, 0, 0, 0)
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  fri.setHours(23, 59, 59, 999)
  return { from: mon, to: fri }
}
const getLastWeekBounds = () => getWeekBounds(0)

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
    <div className="min-h-screen bg-black text-slate-100">
      {/* Navigation */}
      <nav className="bg-zinc-950/95 border-b border-zinc-900 px-4 py-3 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Falcon FX</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Pre-Trade Checklist</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('checklist')} className={`px-3 py-2 text-sm font-medium rounded transition-colors ${activeTab === 'checklist' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-slate-200'}`}>Checklist</button>
            <button onClick={() => setActiveTab('reference')} className={`px-3 py-2 text-sm font-medium rounded transition-colors ${activeTab === 'reference' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-slate-200'}`}>Reference</button>
          </div>
        </div>
      </nav>

      {/* Checklist Tab */}
      {activeTab === 'checklist' && (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <button onClick={onBack} className="mb-5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded border border-zinc-800 transition-colors text-sm">
            ← Back to Menu
          </button>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>{completedCount}/{totalCount} complete</span>
            </div>
            <div className="bg-zinc-900 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-zinc-400 to-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map(step => {
              const isComplete = step.isRuleOfThree ? !!ruleOfThree : step.isZone ? (!!zone && zone !== 'Red') : !!checked[step.num]
              return (
                <div
                  key={step.num}
                  onClick={!step.isRuleOfThree && !step.isZone ? () => setChecked(prev => ({ ...prev, [step.num]: !prev[step.num] })) : undefined}
                  className={`bg-zinc-950 border rounded-lg p-4 transition-colors ${isComplete ? 'border-emerald-700/50' : 'border-zinc-900'} ${!step.isRuleOfThree && !step.isZone ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox / completion indicator */}
                    {!step.isRuleOfThree && !step.isZone && (
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        checked[step.num] ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
                      }`}>
                        {checked[step.num] && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    )}
                    {(step.isRuleOfThree || step.isZone) && (
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isComplete ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'}`}>
                        {isComplete && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-zinc-400 w-5">{step.num}.</span>
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
                                  ? 'bg-white/10 border-white text-white'
                                  : 'bg-zinc-900 border-zinc-800 text-slate-300 hover:border-slate-500'
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
                                  : 'bg-zinc-900 border-zinc-800 text-slate-300 hover:border-slate-500'
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
            <button type="button" onClick={handleReset} className="px-4 py-3 rounded-lg border border-zinc-800 text-slate-300 hover:bg-zinc-900 transition-colors text-sm font-medium">
              Reset
            </button>
            <button
              type="button"
              disabled={!canProceed || unlocking}
              onClick={handleProceed}
              className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all text-sm ${
                canProceed && !unlocking
                  ? 'bg-white hover:bg-zinc-100 text-black font-semibold'
                  : 'bg-zinc-800 text-slate-400 cursor-not-allowed'
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
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Quick Reference</h2>
            <p className="text-slate-400 text-sm">
              Use these resources while completing your checklist. Understanding these concepts helps you make better decisions.
            </p>
          </div>

          {/* Key Concepts */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-zinc-900">
              Key Concepts
            </h3>
            <div className="bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden">
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-zinc-900">
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
                  NO TRADES ALLOWED. Price is in a bad location. Walk away. You&apos;re not missing out — you&apos;re preserving capital.
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
                : 'bg-zinc-900 text-slate-300 border-zinc-800'
            } else if (step.isSpecial) {
              display = value || '—'
              badgeClasses = value
                ? 'bg-blue-600/20 text-blue-200 border-blue-400/50'
                : 'bg-zinc-900 text-slate-300 border-zinc-800'
            } else {
              display = value === true ? 'YES' : value === false ? 'NO' : '—'
              badgeClasses = value === true
                ? 'bg-emerald-600/20 text-emerald-200 border-emerald-400/50'
                : value === false
                ? 'bg-red-600/20 text-red-200 border-red-400/50'
                : 'bg-zinc-900 text-slate-300 border-zinc-800'
            }

            return (
              <div key={step.num} className="flex items-center justify-between gap-3 bg-zinc-950/40 border border-zinc-900 rounded-lg p-3">
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
                      : 'bg-zinc-900 text-slate-300 border border-zinc-800'
                : value === 'yes'
                  ? 'bg-emerald-600/20 text-emerald-200 border border-emerald-400/50'
                  : value === 'no'
                    ? 'bg-red-600/20 text-red-200 border border-red-400/50'
                    : 'bg-zinc-900 text-slate-300 border border-zinc-800'
              return (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-zinc-950/40 border border-zinc-900 rounded-lg p-3">
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
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 space-y-4">
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
          <div className="bg-black/60 border border-zinc-900 rounded-lg p-4">
            <p className="text-xs text-slate-500 tracking-wide uppercase">Pass Rate</p>
            <p className="text-3xl font-bold text-emerald-300">{passRate}%</p>
            <p className="text-xs text-slate-500 mt-1">{stats.passes} passes</p>
          </div>
          <div className="bg-black/60 border border-zinc-900 rounded-lg p-4">
            <p className="text-xs text-slate-500 tracking-wide uppercase">Failures Logged</p>
            <p className="text-3xl font-bold text-red-300">{stats.fails}</p>
            <p className="text-xs text-slate-500 mt-1">{failRate}% of attempts</p>
          </div>
          <div className="bg-black/60 border border-zinc-900 rounded-lg p-4">
            <p className="text-xs text-slate-500 tracking-wide uppercase">Consistency</p>
            <p className="text-lg font-semibold text-slate-100">Forecast discipline trend</p>
            <p className="text-xs text-slate-500 mt-1">Log every pass/fail to spot habits.</p>
          </div>
          <div className="bg-black/60 border border-zinc-900 rounded-lg p-4">
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
    accounts: [
      { value: 'non-registered', label: 'Non-Registered' },
      { value: 'tfsa', label: 'TFSA (Alpha Generation)' },
      { value: 'rrsp', label: 'RRSP' },
    ],
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
      delta: 'delta',
      gamma: 'gamma',
      theta: 'theta',
      vega: 'vega',
      entryStockPrice: 'entry_stock_price',
      slStockPrice: 'sl_stock_price',
      tpStockPrice: 'tp_stock_price',
      forecastUrl: 'forecast_url',
      entryUrl: 'entry_url',
      notes: 'notes',
      status: 'status',
      pnl: 'pnl',
      entryDate: 'entry_date',
      exitDate: 'exit_date',
      exitUrl: 'exit_url',
      id: 'id',
      account: 'account_type',
      playType: 'play_type',
    },
    balanceColumns: {
      id: 'id',
      balance: 'balance',
      changeAmount: 'change_amount',
      reason: 'change_reason',
      tradeId: 'trade_id',
      createdAt: 'created_at',
      currency: 'account_type',
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
      entryStockPriceLabel: 'Entry Stock Price ($)',
      deltaLabel: 'Delta',
      gammaLabel: 'Gamma',
      thetaLabel: 'Theta (Θ)',
      slStockPriceLabel: 'SL Stock Price ($)',
      tpStockPriceLabel: 'TP Stock Price ($)',
      greeksCalculatorButton: 'Greeks Calculator',
      editTradeButton: 'Edit Trade Details',
      missedTradeButton: 'Log Missed Option Trade',
      missedDataButton: 'Review Missed Options',
      missedPattern: 'Setup Spotted',
      partialExitButton: 'Log Partial Exit',
      manageTagsButton: 'Manage Tags',
      accountLabel: 'Account',
      playTypeLabel: 'Play Type',
    },
    optionTypeOptions: [
      { value: 'call', label: 'Call' },
      { value: 'put', label: 'Put' }
    ],
    directionOptions: [
      { value: 'long', label: 'Long (Buy)' },
      { value: 'short', label: 'Short (Sell)' }
    ],
    playTypeOptions: [
      { value: 'short-term', label: 'Short Term' },
      { value: 'leap', label: 'LEAP' },
    ],
    formDefaults: {
      instrument: '',
      optionType: 'call',
      direction: 'long',
      strike: '',
      expiry: '',
      contracts: '',
      premium: '',
      entryStockPrice: '',
      slStockPrice: '',
      tpStockPrice: '',
      breakevenStock: '',
      delta: '',
      gamma: '',
      theta: '',
      vega: '',
      entryUrl: '',
      forecastUrl: '',
      notes: '',
      account: 'non-registered',
      playType: '',
    },
    riskFraction: 0.005,
    stopSizeStep: null,
    uppercaseInstrument: true,
    classes: {
      primaryButton: 'bg-white hover:bg-zinc-100 border-white text-black font-semibold',
      primaryAction: 'bg-white hover:bg-zinc-100 text-black font-semibold'
    }
  },
  forex: {
    key: 'forex',
    journalTitle: "FTMO Forex Journal",
    environmentTitle: 'Forex Trading Workspace',
    environmentDescription: 'Track FTMO forex trades with lot sizing, risk management, and pre-trade discipline.',
    homeButtonLabel: 'Forex Trades (FTMO)',
    menuTagline: 'Manage your FTMO forex positions with precise lot sizing.',
    features: {
      missedTrades: true,
      analytics: true,
      tradingPlan: true,
      forexTools: true
    },
    accounts: [],
    tables: {
      trades: 'forex_trades',
      balance: 'forex_balance_history',
      missed: 'forex_missed_trades',
      plan: 'forex_trading_plan'
    },
    tradeColumns: {
      instrument: 'instrument',
      direction: 'direction',
      lotSize: 'lot_size',
      entryPrice: 'entry_price',
      stopLossPips: 'stop_loss_pips',
      takeProfitPips: 'take_profit_pips',
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
      instrument: 'instrument',
      direction: 'direction',
      beforeUrl: 'before_url',
      afterUrl: 'after_url',
      pattern: 'pattern',
      potential: 'potential_return',
      createdAt: 'created_at'
    },
    missedAnalyticsLabels: {
      day: 'By Day of Week',
      instrument: 'By Pair',
      pattern: 'Top Setups Missed'
    },
    missedPatternOptions: [
      { value: '', label: 'Select a setup...' },
      { value: 'Breakout', label: 'Breakout' },
      { value: 'Pullback', label: 'Pullback' },
      { value: 'Trend Continuation', label: 'Trend Continuation' },
      { value: 'Reversal', label: 'Reversal' },
      { value: 'Range Fade', label: 'Range Fade' }
    ],
    planColumns: {
      id: 'id',
      content: 'content',
      updatedAt: 'updated_at'
    },
    labels: {
      instrument: 'Currency Pair',
      instrumentPlaceholder: 'e.g., EUR/USD',
      balanceTitle: 'FTMO Account Balance',
      balanceHeroLabel: 'Account Balance:',
      addBalanceButton: 'Add Deposit/Withdrawal',
      addBalanceModalTitle: 'Add Deposit or Withdrawal',
      addBalancePlaceholder: 'e.g., Funding account, Drawdown adjustment',
      addBalanceSubmit: 'Add Transaction',
      newBalanceToggleCancel: 'Cancel',
      historyTitle: 'Recent Balance Changes',
      newTradeButton: 'Log Forex Trade',
      updateTradeButton: 'Close Existing Forex Trade',
      viewDataButton: 'View Forex History',
      tradingPlanButton: 'Forex Playbook',
      entryUrlLabel: 'Entry Chart URL (Optional)',
      forecastUrlLabel: 'Forecast TradingView URL (Optional)',
      notesLabel: 'Notes (Optional)',
      pnlLabel: 'P&L ($)',
      planTitle: 'Forex Playbook',
      planSave: 'Save Playbook',
      menuBack: '← All Workspaces',
      riskSummaryLabel: 'Account Balance',
      analyticsInstrumentTitle: 'Pair Performance',
      newTradeTitle: 'Log Forex Trade',
      balanceToggleLabel: 'Add Deposit/Withdrawal',
      directionLabel: 'Direction',
      lotSizeLabel: 'Lot Size',
      entryPriceLabel: 'Entry Price',
      stopLossPipsLabel: 'Stop Loss (Pips)',
      takeProfitPipsLabel: 'Take Profit (Pips)',
      editTradeButton: 'Edit Trade Details',
      missedTradeButton: 'Log Missed Forex Trade',
      missedDataButton: 'Review Missed Forex',
      missedPattern: 'Setup Spotted',
      missedTableInstrument: 'Pair',
      missedTablePattern: 'Setup',
      missedPatternPlaceholder: 'Select a setup...'
    },
    analyticsLabels: {
      day: 'Day of Week Performance',
      instrument: 'Pair Performance'
    },
    directionOptions: [
      { value: 'long', label: 'Long (Buy)' },
      { value: 'short', label: 'Short (Sell)' }
    ],
    formDefaults: {
      instrument: '',
      direction: 'long',
      lotSize: '',
      entryPrice: '',
      stopLossPips: '',
      takeProfitPips: '',
      forecastUrl: '',
      entryUrl: '',
      notes: ''
    },
    riskFraction: 0.005,
    uppercaseInstrument: false,
    classes: {
      primaryButton: 'bg-white hover:bg-zinc-100 border-white text-black font-semibold',
      primaryAction: 'bg-white hover:bg-zinc-100 text-black font-semibold'
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
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg mb-6">
          <h3 className="text-lg text-slate-400 mb-4">{labels.balanceAccountsTitle}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map(account => (
              <div key={account.value} className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg">
                <p className="text-sm text-slate-400">{account.label}</p>
                <p className="text-3xl font-bold text-emerald-400">
                  ${(currentBalances[account.value] || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg mb-6">
          <div className="text-center">
            <h3 className="text-lg text-slate-400">{labels.balanceHeroLabel}</h3>
            <p className="text-4xl font-bold text-emerald-400">${currentBalance.toFixed(2)}</p>
          </div>
        </div>
      )}

      {showAddBalance && (
        <form onSubmit={handleAddBalance} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-6">
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
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-800 text-white rounded-lg transition-colors"
            >
              {labels.newBalanceToggleCancel}
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <h3 className="p-4 font-semibold border-b border-zinc-800 text-slate-100">{labels.historyTitle}</h3>
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
                <div key={entry[idColumn] || index} className="p-4 border-b border-zinc-800 last:border-b-0">
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
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button
        onClick={() => setCurrentView('menu')}
        className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors"
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
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedTrade?.[tradeColumns.id] === trade[tradeColumns.id] ? 'border-emerald-500 bg-emerald-900/20' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900'}`}
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
              <div className="mt-8 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
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
                      className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedTrade(null)}
                      className="px-6 py-2 bg-zinc-700 hover:bg-zinc-800 text-white rounded-lg transition-colors"
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
    if (tradeColumns.entryStockPrice) data.entryStockPrice = trade[tradeColumns.entryStockPrice] ?? ''
    if (tradeColumns.delta) data.delta = trade[tradeColumns.delta] ?? ''
    if (tradeColumns.gamma) data.gamma = trade[tradeColumns.gamma] ?? ''
    if (tradeColumns.theta) data.theta = trade[tradeColumns.theta] ?? ''
    if (tradeColumns.vega) data.vega = trade[tradeColumns.vega] ?? ''
    if (tradeColumns.slStockPrice) data.slStockPrice = trade[tradeColumns.slStockPrice] ?? ''
    if (tradeColumns.tpStockPrice) data.tpStockPrice = trade[tradeColumns.tpStockPrice] ?? ''
    if (tradeColumns.entryPrice) data.entryPrice = trade[tradeColumns.entryPrice] ?? ''
    if (tradeColumns.lotSize) data.lotSize = trade[tradeColumns.lotSize] ?? ''
    if (tradeColumns.stopLossPips) data.stopLossPips = trade[tradeColumns.stopLossPips] ?? ''
    if (tradeColumns.takeProfitPips) data.takeProfitPips = trade[tradeColumns.takeProfitPips] ?? ''
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
      set(tradeColumns.entryStockPrice, editData.entryStockPrice === '' ? null : (editData.entryStockPrice != null ? parseFloat(editData.entryStockPrice) : null))
      set(tradeColumns.delta, editData.delta === '' ? null : (editData.delta != null ? parseFloat(editData.delta) : null))
      set(tradeColumns.gamma, editData.gamma === '' ? null : (editData.gamma != null ? parseFloat(editData.gamma) : null))
      set(tradeColumns.theta, editData.theta === '' ? null : (editData.theta != null ? parseFloat(editData.theta) : null))
      set(tradeColumns.vega, editData.vega === '' ? null : (editData.vega != null ? parseFloat(editData.vega) : null))
      set(tradeColumns.slStockPrice, editData.slStockPrice === '' ? null : (editData.slStockPrice != null ? parseFloat(editData.slStockPrice) : null))
      set(tradeColumns.tpStockPrice, editData.tpStockPrice === '' ? null : (editData.tpStockPrice != null ? parseFloat(editData.tpStockPrice) : null))
      set(tradeColumns.entryPrice, editData.entryPrice === '' ? null : (editData.entryPrice != null ? parseFloat(editData.entryPrice) : null))
      set(tradeColumns.lotSize, editData.lotSize === '' ? null : (editData.lotSize != null ? parseFloat(editData.lotSize) : null))
      set(tradeColumns.stopLossPips, editData.stopLossPips === '' ? null : (editData.stopLossPips != null ? parseFloat(editData.stopLossPips) : null))
      set(tradeColumns.takeProfitPips, editData.takeProfitPips === '' ? null : (editData.takeProfitPips != null ? parseFloat(editData.takeProfitPips) : null))
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
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
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
                  className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none placeholder-slate-400"
                />
                <div className="grid gap-3">
                  {filteredTrades.map(trade => (
                    <div
                      key={trade[idColumn]}
                      onClick={() => handleSelectTrade(trade)}
                      className="p-4 bg-zinc-900 border border-zinc-800 hover:border-slate-500 rounded-lg cursor-pointer transition-colors"
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
                          <span className={`text-xs px-2 py-1 rounded-full ${trade[statusColumn] === 'open' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-zinc-800 text-slate-400'}`}>
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
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
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
                  {tradeColumns.entryStockPrice && (
                    <InputField label={labels.entryStockPriceLabel || 'Entry Stock Price ($)'} type="number" step="0.01" value={editData.entryStockPrice ?? ''} onChange={(e) => setEditData(p => ({ ...p, entryStockPrice: e.target.value }))} />
                  )}
                  {tradeColumns.delta && (
                    <InputField label={labels.deltaLabel || 'Delta'} type="number" step="0.001" value={editData.delta ?? ''} onChange={(e) => setEditData(p => ({ ...p, delta: e.target.value }))} />
                  )}
                  {tradeColumns.gamma && (
                    <InputField label={labels.gammaLabel || 'Gamma'} type="number" step="0.001" value={editData.gamma ?? ''} onChange={(e) => setEditData(p => ({ ...p, gamma: e.target.value }))} />
                  )}
                  {tradeColumns.theta && (
                    <InputField label={labels.thetaLabel || 'Theta (Θ)'} type="number" step="0.001" value={editData.theta ?? ''} onChange={(e) => setEditData(p => ({ ...p, theta: e.target.value }))} />
                  )}
                  {tradeColumns.vega && (
                    <InputField label={labels.vegaLabel || 'Vega (V)'} type="number" step="0.001" value={editData.vega ?? ''} onChange={(e) => setEditData(p => ({ ...p, vega: e.target.value }))} />
                  )}
                  {tradeColumns.slStockPrice && (
                    <InputField label={labels.slStockPriceLabel || 'SL Stock Price ($)'} type="number" step="0.01" value={editData.slStockPrice ?? ''} onChange={(e) => setEditData(p => ({ ...p, slStockPrice: e.target.value }))} />
                  )}
                  {tradeColumns.tpStockPrice && (
                    <InputField label={labels.tpStockPriceLabel || 'TP Stock Price ($)'} type="number" step="0.01" value={editData.tpStockPrice ?? ''} onChange={(e) => setEditData(p => ({ ...p, tpStockPrice: e.target.value }))} />
                  )}
                  {tradeColumns.entryPrice && (
                    <InputField label={labels.entryPriceLabel || 'Entry Price'} type="number" step="0.00001" value={editData.entryPrice ?? ''} onChange={(e) => setEditData(p => ({ ...p, entryPrice: e.target.value }))} />
                  )}
                  {tradeColumns.lotSize && (
                    <InputField label={labels.lotSizeLabel || 'Lot Size'} type="number" step="0.01" value={editData.lotSize ?? ''} onChange={(e) => setEditData(p => ({ ...p, lotSize: e.target.value }))} />
                  )}
                  {tradeColumns.stopLossPips && (
                    <InputField label={labels.stopLossPipsLabel || 'Stop Loss (Pips)'} type="number" step="0.1" value={editData.stopLossPips ?? ''} onChange={(e) => setEditData(p => ({ ...p, stopLossPips: e.target.value }))} />
                  )}
                  {tradeColumns.takeProfitPips && (
                    <InputField label={labels.takeProfitPipsLabel || 'Take Profit (Pips)'} type="number" step="0.1" value={editData.takeProfitPips ?? ''} onChange={(e) => setEditData(p => ({ ...p, takeProfitPips: e.target.value }))} />
                  )}
                  {tradeColumns.dollarPerTick && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-slate-300">{labels.dollarPerTickLabel || 'Dollar per Tick ($)'}</label>
                      {tickPresets.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {tickPresets.map(preset => (
                            <button key={preset.symbol} type="button" onClick={() => setEditData(p => ({ ...p, dollarPerTick: preset.dollarPerTick.toString() }))}
                              className={`px-2 py-1 rounded text-xs border transition-colors ${editData.dollarPerTick === preset.dollarPerTick.toString() ? 'bg-white text-black border-white' : 'bg-zinc-800 text-slate-300 border-zinc-700 hover:border-slate-500'}`}>
                              {preset.symbol} (${preset.dollarPerTick})
                            </button>
                          ))}
                        </div>
                      )}
                      <input type="number" step="0.01" value={editData.dollarPerTick ?? ''} onChange={(e) => setEditData(p => ({ ...p, dollarPerTick: e.target.value }))} className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
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
                      <textarea value={editData.notes || ''} onChange={(e) => setEditData(p => ({ ...p, notes: e.target.value }))} rows="3" className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setSelectedTrade(null); setEditData({}) }} className="px-6 py-2 bg-zinc-700 hover:bg-zinc-800 text-white rounded-lg transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${isSubmitting ? 'bg-zinc-700 cursor-not-allowed' : classes.primaryAction}`}>
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
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Manage Tags</h1>
        {message && <div className={`p-4 rounded-lg mb-6 border ${message.includes('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>{message}</div>}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Your Tags ({tags.length})</h2>
            {tags.length === 0 ? <p className="text-slate-400">No tags yet.</p> : (
              <div className="space-y-2">
                {tags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
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
          className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${linkedTagIds.has(tag.id) ? 'text-white border-transparent' : 'text-slate-400 border-zinc-700 hover:border-slate-400 bg-transparent'}`}
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
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
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
                  <div key={trade[idColumn]} onClick={() => handleSelectTrade(trade)} className="p-4 bg-zinc-900 border border-zinc-800 hover:border-slate-500 rounded-lg cursor-pointer transition-colors">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
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
                      <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows="2" className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none placeholder-slate-400" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className={`w-full p-3 rounded-lg font-semibold transition-colors ${isSubmitting ? 'bg-zinc-700 cursor-not-allowed' : classes.primaryAction}`}>
                      {isSubmitting ? 'Logging...' : 'Log Partial Exit'}
                    </button>
                  </form>
                </div>

                {partialExits.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                    <h3 className="text-lg font-semibold mb-4">Previous Partial Exits</h3>
                    <div className="space-y-2">
                      {partialExits.map(exit => (
                        <div key={exit.id} className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Risk-Reward Profile</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Average Win:</span><span className="text-emerald-400 font-semibold">${avgWin.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Average Loss:</span><span className="text-red-400 font-semibold">${avgLoss.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Risk-Reward Ratio:</span><span className="text-slate-100 font-semibold">{riskRewardRatio}</span></div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Trading Volume</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Total Trades:</span><span className="text-slate-100 font-semibold">{closedTrades.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Winning Trades:</span><span className="text-emerald-400 font-semibold">{winningTrades.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Losing Trades:</span><span className="text-red-400 font-semibold">{losingTrades.length}</span></div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
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
  const lotSizeColumn = tradeColumns.lotSize
  const stopLossPipsColumn = tradeColumns.stopLossPips
  const takeProfitPipsColumn = tradeColumns.takeProfitPips
  const dollarPerTickColumn = tradeColumns.dollarPerTick
  const stopLossTicksColumn = tradeColumns.stopLossTicks
  const targetTicksColumn = tradeColumns.targetTicks
  const playTypeColumn = tradeColumns.playType
  const hasMultipleAccounts = accounts.length > 0 && config.balanceColumns.currency
  const showAnalytics = config.features?.analytics !== false

  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('desc')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterPlayType, setFilterPlayType] = useState('')
  const [filterTicker, setFilterTicker] = useState('')
  const [filterDirection, setFilterDirection] = useState('')
  const [filterOptionType, setFilterOptionType] = useState('')
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
    if (filterAccount && accountField) result = result.filter(t => t[accountField] === filterAccount)
    if (filterPlayType && playTypeColumn) result = result.filter(t => t[playTypeColumn] === filterPlayType)
    if (filterTicker) result = result.filter(t => (t[instrumentColumn] || '').toLowerCase().includes(filterTicker.toLowerCase()))
    if (filterDirection && directionColumn) result = result.filter(t => t[directionColumn] === filterDirection)
    if (filterOptionType && optionTypeColumn) result = result.filter(t => t[optionTypeColumn] === filterOptionType)
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
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{labels.viewDataButton}</h1>
          {config.tables?.tagLinks && (
            <button onClick={() => setCurrentView('manage-tags')} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Manage Tags</button>
          )}
        </div>

        {journalReminders.length > 0 && (
          <div className="mb-6 space-y-2">
            {journalReminders.map(trade => (
              <div key={trade[tradeColumns.id]} className="flex items-center justify-between p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
                <div>
                  <span className="text-amber-300 font-semibold">Journal reminder: </span>
                  <span className="text-slate-200">{trade[instrumentColumn]} — 1-week review due. How did this trade go?</span>
                </div>
                <button onClick={() => handleOpenJournal(trade)} className="ml-4 px-3 py-1 bg-white hover:bg-zinc-100 text-black rounded text-sm transition-colors shrink-0">Write Journal</button>
              </div>
            ))}
          </div>
        )}

        <BalanceManager config={config} />

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
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
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'overview' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-900 text-slate-300 border-zinc-700 hover:border-slate-500'}`}>Overview</button>
          {showAnalytics && (
            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'analytics' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-900 text-slate-300 border-zinc-700 hover:border-slate-500'}`}>Analytics</button>
          )}
          <button onClick={() => setActiveTab('trades')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'trades' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-900 text-slate-300 border-zinc-700 hover:border-slate-500'}`}>Trades Table</button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Open Trades</h3><p className="text-2xl font-bold text-slate-100">{trades.filter(t => t[statusColumn] === 'open').length}</p></div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Closed Trades</h3><p className="text-2xl font-bold text-slate-100">{trades.filter(t => t[statusColumn] === 'closed').length}</p></div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Risk Budget (0.5%)</h3><p className="text-2xl font-bold text-slate-100">${(currentBalance * riskFraction).toFixed(2)}</p></div>
          </div>
        )}

        {showAnalytics && activeTab === 'analytics' && <TradingAnalytics trades={trades} config={config} />}

        {activeTab === 'trades' && (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4 space-y-3">
              <div className="flex flex-wrap gap-3 items-center">
                <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded border text-sm ${filter === 'all' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-800 text-slate-300 border-zinc-700 hover:border-zinc-600'}`}>All</button>
                <button onClick={() => setFilter('open')} className={`px-3 py-1 rounded border text-sm ${filter === 'open' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-800 text-slate-300 border-zinc-700 hover:border-zinc-600'}`}>Open</button>
                <button onClick={() => setFilter('closed')} className={`px-3 py-1 rounded border text-sm ${filter === 'closed' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-800 text-slate-300 border-zinc-700 hover:border-zinc-600'}`}>Closed</button>
                <div className="flex items-center gap-2 ml-auto">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500" />
                  <span className="text-slate-500 text-sm">to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500" />
                  {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-slate-400 hover:text-slate-200 text-sm px-2">&#x2715;</button>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="Filter by ticker..." value={filterTicker} onChange={e => setFilterTicker(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500 w-36" />
                {hasMultipleAccounts && accountField && (
                  <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500">
                    <option value="">All Accounts</option>
                    {accounts.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                )}
                {playTypeColumn && (
                  <select value={filterPlayType} onChange={e => setFilterPlayType(e.target.value)}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500">
                    <option value="">All Play Types</option>
                    <option value="short-term">Short Term</option>
                    <option value="leap">LEAP</option>
                  </select>
                )}
                {directionColumn && (
                  <select value={filterDirection} onChange={e => setFilterDirection(e.target.value)}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500">
                    <option value="">All Directions</option>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                )}
                {optionTypeColumn && (
                  <select value={filterOptionType} onChange={e => setFilterOptionType(e.target.value)}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-slate-300 text-sm focus:outline-none focus:border-slate-500">
                    <option value="">All Types</option>
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                )}
                {(filterAccount || filterPlayType || filterTicker || filterDirection || filterOptionType) && (
                  <button onClick={() => { setFilterAccount(''); setFilterPlayType(''); setFilterTicker(''); setFilterDirection(''); setFilterOptionType('') }}
                    className="text-xs text-slate-500 hover:text-slate-300 ml-auto transition-colors">Clear filters</button>
                )}
              </div>
            </div>
            {loading ? (
              <p className="text-slate-400">Loading trades...</p>
            ) : trades.length === 0 ? (
              <p className="text-slate-400">No trades found.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="min-w-max w-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 text-sm">
                  <thead className="bg-zinc-800">
                    <tr>
                      {[{ label: 'Entry Date', col: entryDateColumn }, { label: labels.instrument, col: instrumentColumn }].map(({ label, col }) => (
                        <th key={col} className="p-3 text-left text-slate-300 cursor-pointer hover:text-white select-none" onClick={() => handleSort(col)}>
                          {label}{sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                      ))}
                      {accountField && <th className="p-3 text-left text-slate-300">Account</th>}
                      {playTypeColumn && <th className="p-3 text-left text-slate-300">Play Type</th>}
                      {directionColumn && <th className="p-3 text-left text-slate-300">{labels.directionLabel || 'Direction'}</th>}
                      {optionTypeColumn && <th className="p-3 text-left text-slate-300">{labels.optionTypeLabel || 'Option Type'}</th>}
                      {strikeColumn && <th className="p-3 text-left text-slate-300">{labels.strikeLabel || 'Strike'}</th>}
                      {expiryColumn && <th className="p-3 text-left text-slate-300">{labels.expiryLabel || 'Expiry'}</th>}
                      {contractsColumn && <th className="p-3 text-left text-slate-300">{labels.contractsLabel || 'Contracts'}</th>}
                      {premiumColumn && <th className="p-3 text-left text-slate-300">{labels.premiumLabel || 'Premium'}</th>}
                      {entryPriceColumn && <th className="p-3 text-left text-slate-300">{labels.entryPriceLabel || 'Entry Price'}</th>}
                      {lotSizeColumn && <th className="p-3 text-left text-slate-300">{labels.lotSizeLabel || 'Lot Size'}</th>}
                      {stopLossPipsColumn && <th className="p-3 text-left text-slate-300">{labels.stopLossPipsLabel || 'SL Pips'}</th>}
                      {takeProfitPipsColumn && <th className="p-3 text-left text-slate-300">{labels.takeProfitPipsLabel || 'TP Pips'}</th>}
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
                      <tr key={trade[tradeColumns.id] || idx} className={idx % 2 === 0 ? 'bg-zinc-900' : 'bg-slate-750'}>
                        <td className="p-3 text-slate-300">{trade[entryDateColumn] ? new Date(trade[entryDateColumn]).toLocaleDateString() : '-'}</td>
                        <td className="p-3 font-semibold text-slate-100">{trade[instrumentColumn]}</td>
                        {accountField && <td className="p-3 text-slate-300">{trade[accountField] || '-'}</td>}
                        {playTypeColumn && <td className="p-3 text-slate-300">{trade[playTypeColumn] ? (trade[playTypeColumn] === 'leap' ? 'LEAP' : 'Short Term') : '-'}</td>}
                        {directionColumn && <td className="p-3 text-slate-300">{(trade[directionColumn] || '').toString().toUpperCase()}</td>}
                        {optionTypeColumn && <td className="p-3 text-slate-300">{(trade[optionTypeColumn] || '').toString().toUpperCase()}</td>}
                        {strikeColumn && <td className="p-3 text-slate-300">{trade[strikeColumn] ?? '-'}</td>}
                        {expiryColumn && <td className="p-3 text-slate-300">{trade[expiryColumn] ? new Date(trade[expiryColumn]).toLocaleDateString() : '-'}</td>}
                        {contractsColumn && <td className="p-3 text-slate-300">{trade[contractsColumn] ?? '-'}</td>}
                        {premiumColumn && <td className="p-3 text-slate-300">{trade[premiumColumn] ?? '-'}</td>}
                        {entryPriceColumn && <td className="p-3 text-slate-300">{trade[entryPriceColumn] ?? '-'}</td>}
                        {lotSizeColumn && <td className="p-3 text-slate-300">{trade[lotSizeColumn] ?? '-'}</td>}
                        {stopLossPipsColumn && <td className="p-3 text-slate-300">{trade[stopLossPipsColumn] ?? '-'}</td>}
                        {takeProfitPipsColumn && <td className="p-3 text-slate-300">{trade[takeProfitPipsColumn] ?? '-'}</td>}
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
                              className={`text-xs px-2 py-1 rounded border transition-colors ${trade.journal_notes ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-600/10' : 'border-zinc-700 text-slate-400 hover:border-slate-400'}`}
                            >
                              {trade.journal_notes ? 'Edit' : 'Write'}
                            </button>
                          ) : (
                            <div className="flex gap-1">
                              <button onClick={() => setCurrentView('edit-trade')} className="text-xs px-2 py-1 rounded border border-zinc-700 text-slate-400 hover:border-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap">Edit</button>
                              {config.tables?.partialExits && <button onClick={() => setCurrentView('partial-exit')} className="text-xs px-2 py-1 rounded border border-zinc-700 text-slate-400 hover:border-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap">Part. Exit</button>}
                            </div>
                          )}
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
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Trade Journal</p>
                <h3 className="text-xl font-bold text-white">{journalTrade[instrumentColumn]} — {journalTrade[entryDateColumn] ? new Date(journalTrade[entryDateColumn]).toLocaleDateString() : ''}</h3>
              </div>
              <button onClick={() => setJournalTrade(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-slate-400">What worked? What didn&apos;t? What would you do differently?</p>
            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              rows={8}
              placeholder="Write your post-trade reflection here..."
              className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 placeholder-slate-500"
            />
            {journalMessage && (
              <p className={`text-sm ${journalMessage.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{journalMessage}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setJournalTrade(null)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSaveJournal} disabled={journalSaving} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 text-white rounded-lg font-semibold transition-colors">
                {journalSaving ? 'Saving...' : 'Save Journal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedChecklist && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
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

const MissedTradeView = ({ setCurrentView, config, embedded = false }) => {
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
    <div className={embedded ? 'p-6 max-w-2xl mx-auto' : 'min-h-screen bg-black text-slate-100 p-8'}>
      {!embedded && <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>}
      <div className={embedded ? '' : 'max-w-2xl mx-auto'}>
        {!embedded && <h1 className="text-3xl font-bold mb-6">{labels.missedTradeButton}</h1>}
        {message && <div className={`p-4 rounded-lg mb-6 border ${message.startsWith('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
          <InputField label={labels.instrument} value={form.instrument} onChange={(e) => handleInput('instrument', e.target.value)} placeholder={labels.instrumentPlaceholder} required />
          <SelectField label="Direction" value={form.direction} onChange={(e) => handleInput('direction', e.target.value)} options={LONG_SHORT_OPTIONS} required />
          <InputField label="Before Trade Chart/Notes (Optional)" type="url" value={form.beforeUrl} onChange={(e) => handleInput('beforeUrl', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <SelectField label={labels.missedPattern} value={form.pattern} onChange={(e) => handleInput('pattern', e.target.value)} options={missedPatternOptions} />
          <InputField label="After Trade Review (Optional)" type="url" value={form.afterUrl} onChange={(e) => handleInput('afterUrl', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <InputField label="Potential Return (%)" type="number" step="0.01" value={form.potential} onChange={(e) => handleInput('potential', e.target.value)} placeholder="e.g., 2.5 for +2.5" />
          <button type="submit" disabled={isSubmitting} className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 text-white rounded-lg font-semibold transition-colors">
            {isSubmitting ? 'Logging...' : 'Log Missed Trade'}
          </button>
        </form>
      </div>
    </div>
  )
}

const ViewMissedTrades = ({ setCurrentView, config, embedded = false }) => {
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
    <div className={embedded ? 'p-6' : 'min-h-screen bg-black text-slate-100 p-8'}>
      {!embedded && <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>}
      <div className={embedded ? '' : 'max-w-7xl mx-auto'}>
        {!embedded && <h1 className="text-3xl font-bold mb-8">{labels.missedDataButton}</h1>}

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'overview' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-900 text-slate-300 border-zinc-700 hover:border-slate-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'analytics' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-900 text-slate-300 border-zinc-700 hover:border-slate-500'}`}>Analytics</button>
          <button onClick={() => setActiveTab('trades')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'trades' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-900 text-slate-300 border-zinc-700 hover:border-slate-500'}`}>Missed Trades Table</button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Missed Trades</h3><p className="text-2xl font-bold text-slate-100">{missed.length}</p></div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Total Potential (Σ%)</h3><p className={`text-2xl font-bold ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPct.toFixed(2)}%</p></div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Avg Potential / Miss</h3><p className="text-2xl font-bold text-slate-100">{avgPct.toFixed(2)}%</p></div>
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
                <table className="min-w-max w-full bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
                  <thead className="bg-zinc-800">
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
                      <tr key={row[missedColumns.id] || idx} className={idx % 2 === 0 ? 'bg-zinc-900' : 'bg-slate-750'}>
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

const NewTradeView = ({ setCurrentView, formData, setFormData, isSubmitting, setIsSubmitting, message, setMessage, config, sidePanel, onTradeLogged }) => {
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
  const [pasteFormState, setPasteFormState] = useState('idle')
  const [reviewPending, setReviewPending] = useState(null)
  const [duplicateAccounts, setDuplicateAccounts] = useState([])

  useEffect(() => {
    if (!tradeColumns.premium) return
    const handlePaste = async e => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageItem = Array.from(items).find(i => i.type.startsWith('image/'))
      if (!imageItem) return
      const file = imageItem.getAsFile()
      if (!file) return
      setPasteFormState('loading')
      const reader = new FileReader()
      reader.onload = async ev => {
        const [header, base64] = ev.target.result.split(',')
        const mediaType = header.match(/data:(.*);/)?.[1] || 'image/png'
        try {
          const res = await fetch('/api/extract-greeks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mediaType })
          })
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          setFormData(prev => ({
            ...prev,
            ...(data.strike != null ? { strike: String(data.strike) } : {}),
            ...(data.stockPrice != null ? { entryStockPrice: String(data.stockPrice) } : {}),
            ...(data.premium != null ? { premium: String(data.premium) } : {}),
            ...(data.delta != null ? { delta: String(data.delta) } : {}),
            ...(data.gamma != null ? { gamma: String(data.gamma) } : {}),
            ...(data.theta != null ? { theta: String(data.theta) } : {}),
            ...(data.vega != null ? { vega: String(data.vega) } : {}),
          }))
          setPasteFormState('success')
          setTimeout(() => setPasteFormState('idle'), 4000)
        } catch {
          setPasteFormState('error')
          setTimeout(() => setPasteFormState('idle'), 4000)
        }
      }
      reader.readAsDataURL(file)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [tradeColumns.premium, setFormData])

  useEffect(() => {
    if (!tradeColumns.exitDate) { setReviewPending(false); return }
    const check = async () => {
      const { from, to } = getLastWeekBounds()
      const { data } = await supabase
        .from(tradesTable)
        .select(`${tradeColumns.id}, journal_notes`)
        .eq(tradeColumns.status, 'closed')
        .gte(tradeColumns.exitDate, from.toISOString())
        .lte(tradeColumns.exitDate, to.toISOString())
      const unreviewed = (data || []).filter(t => !t.journal_notes?.trim())
      setReviewPending(unreviewed.length > 0 ? unreviewed.length : false)
    }
    check()
  }, [tradesTable, tradeColumns.exitDate, tradeColumns.id, tradeColumns.status])

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
    if (!checklistTables.attempts) return
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
      assignValue(tradeColumns.entryStockPrice, formData.entryStockPrice === '' ? null : (formData.entryStockPrice ? parseFloat(formData.entryStockPrice) : null))
      assignValue(tradeColumns.delta, formData.delta === '' ? null : (formData.delta ? parseFloat(formData.delta) : null))
      assignValue(tradeColumns.gamma, formData.gamma === '' ? null : (formData.gamma ? parseFloat(formData.gamma) : null))
      assignValue(tradeColumns.theta, formData.theta === '' ? null : (formData.theta ? parseFloat(formData.theta) : null))
      assignValue(tradeColumns.vega, formData.vega === '' ? null : (formData.vega ? parseFloat(formData.vega) : null))
      assignValue(tradeColumns.slStockPrice, formData.slStockPrice === '' ? null : (formData.slStockPrice ? parseFloat(formData.slStockPrice) : null))
      assignValue(tradeColumns.tpStockPrice, formData.tpStockPrice === '' ? null : (formData.tpStockPrice ? parseFloat(formData.tpStockPrice) : null))
      assignValue(tradeColumns.entryPrice, formData.entryPrice === '' ? null : (formData.entryPrice ? parseFloat(formData.entryPrice) : null))
      assignValue(tradeColumns.lotSize, formData.lotSize === '' ? null : (formData.lotSize ? parseFloat(formData.lotSize) : null))
      assignValue(tradeColumns.stopLossPips, formData.stopLossPips === '' ? null : (formData.stopLossPips ? parseFloat(formData.stopLossPips) : null))
      assignValue(tradeColumns.takeProfitPips, formData.takeProfitPips === '' ? null : (formData.takeProfitPips ? parseFloat(formData.takeProfitPips) : null))
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
      assignValue(tradeColumns.playType, formData.playType || null)
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

      if (duplicateAccounts.length > 0 && accountField) {
        const dupePayloads = duplicateAccounts.map(accountValue => ({ ...payload, [accountField]: accountValue }))
        await supabase.from(tradesTable).insert(dupePayloads)
      }

      setMessage('Trade added successfully!')
      setFormData({ ...config.formDefaults })
      setChecklistSnapshot(null)
      setChecklistComplete(false)
      setDuplicateAccounts([])
      if (onTradeLogged) onTradeLogged()
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setIsSubmitting(false)
  }

  if (reviewPending === null) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Checking weekly review status...</p>
      </div>
    )
  }

  if (reviewPending) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-zinc-950 border border-amber-500/30 rounded-xl p-8 text-center">
          <p className="text-5xl mb-5">⚠️</p>
          <h2 className="text-2xl font-bold mb-3">Weekly Review Pending</h2>
          <p className="text-slate-400 mb-8">
            You have <span className="text-white font-semibold">{reviewPending} trade{reviewPending !== 1 ? 's' : ''}</span> from last week without a self-review.
            Complete your weekly review before logging new trades.
          </p>
          <button
            onClick={() => setCurrentView('weekly-review')}
            className="w-full px-6 py-3 bg-white hover:bg-zinc-100 text-black font-semibold rounded-lg mb-4 transition-colors"
          >
            Go to Weekly Review
          </button>
          <button
            onClick={() => setCurrentView('menu')}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Back to menu
          </button>
        </div>
      </div>
    )
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
    <div className={`min-h-screen bg-black text-slate-100 ${sidePanel ? 'flex' : 'p-8'}`}>
      <div className={sidePanel ? 'flex-1 min-w-0 overflow-y-auto p-8' : ''}>
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
      <div className={sidePanel ? '' : 'max-w-2xl mx-auto'}>
        <div className="flex justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold whitespace-nowrap">{labels.newTradeTitle}</h1>
          <div className="shrink-0">
            {balanceLoading ? (
              <div className="text-slate-400">Loading balance...</div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 p-5 md:p-6 rounded-lg w-fit min-w-[22rem] md:min-w-[28rem] text-left">
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
          <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-800/40 rounded-lg px-4 py-3 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-emerald-400 text-sm font-semibold">✓ Checklist complete</span>
              {checklistSnapshot.zone && (
                <span className="text-xs text-slate-400">Zone: {checklistSnapshot.zone}</span>
              )}
              <span className="text-xs text-slate-600">{new Date(checklistSnapshot.recordedAt).toLocaleTimeString()}</span>
            </div>
            <button type="button" onClick={handleChecklistReset}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors shrink-0">
              Redo Checklist
            </button>
          </div>
        )}

        {tradeColumns.premium && (
          <div
            onDrop={async e => {
              e.preventDefault()
              const file = e.dataTransfer?.files?.[0]
              if (!file || !file.type.startsWith('image/')) return
              setPasteFormState('loading')
              const reader = new FileReader()
              reader.onload = async ev => {
                const [header, base64] = ev.target.result.split(',')
                const mediaType = header.match(/data:(.*);/)?.[1] || 'image/png'
                try {
                  const res = await fetch('/api/extract-greeks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, mediaType }) })
                  const data = await res.json()
                  if (data.error) throw new Error(data.error)
                  setFormData(prev => ({
                    ...prev,
                    ...(data.strike != null ? { strike: String(data.strike) } : {}),
                    ...(data.stockPrice != null ? { entryStockPrice: String(data.stockPrice) } : {}),
                    ...(data.premium != null ? { premium: String(data.premium) } : {}),
                    ...(data.delta != null ? { delta: String(data.delta) } : {}),
                    ...(data.gamma != null ? { gamma: String(data.gamma) } : {}),
                    ...(data.theta != null ? { theta: String(data.theta) } : {}),
                    ...(data.vega != null ? { vega: String(data.vega) } : {}),
                  }))
                  setPasteFormState('success')
                  setTimeout(() => setPasteFormState('idle'), 4000)
                } catch { setPasteFormState('error'); setTimeout(() => setPasteFormState('idle'), 4000) }
              }
              reader.readAsDataURL(file)
            }}
            onDragOver={e => e.preventDefault()}
            className={`mb-6 rounded-lg border-2 border-dashed px-4 py-4 text-center text-sm transition-colors cursor-default ${
              pasteFormState === 'loading' ? 'border-zinc-700 bg-zinc-900/50 text-slate-400' :
              pasteFormState === 'success' ? 'border-emerald-700/50 bg-emerald-900/10 text-emerald-400' :
              pasteFormState === 'error' ? 'border-red-700/50 bg-red-900/10 text-red-400' :
              'border-zinc-800 text-slate-500 hover:border-slate-500 hover:text-slate-300'
            }`}
          >
            {pasteFormState === 'loading' && 'Extracting from screenshot...'}
            {pasteFormState === 'success' && '✓ Auto-filled strike, stock price, premium & Greeks — review and adjust'}
            {pasteFormState === 'error' && 'Could not extract — fill in fields manually'}
            {pasteFormState === 'idle' && 'Paste broker screenshot (Ctrl+V / ⌘V) or drag & drop to auto-fill option fields'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
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

          {tradeColumns.playType && config.playTypeOptions && (
            <SelectField
              label={labels.playTypeLabel || 'Play Type'}
              value={formData.playType}
              onChange={(e) => handleInputChange('playType', e.target.value)}
              options={[{ value: '', label: 'Select type...' }, ...config.playTypeOptions]}
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

          {tradeColumns.entryStockPrice && (
            <InputField label={labels.entryStockPriceLabel || 'Entry Stock Price ($)'} type="number" step="0.01" value={formData.entryStockPrice} onChange={(e) => handleInputChange('entryStockPrice', e.target.value)} placeholder="e.g. 150.00" />
          )}

          {tradeColumns.delta && (
            <InputField label={labels.deltaLabel || 'Delta'} type="number" step="0.001" value={formData.delta} onChange={(e) => handleInputChange('delta', e.target.value)} placeholder="-0.45 for puts" />
          )}

          {tradeColumns.gamma && (
            <InputField label={labels.gammaLabel || 'Gamma'} type="number" step="0.001" value={formData.gamma} onChange={(e) => handleInputChange('gamma', e.target.value)} placeholder="e.g. 0.03" />
          )}

          {tradeColumns.theta && (
            <InputField label={labels.thetaLabel || 'Theta (Θ)'} type="number" step="0.001" value={formData.theta} onChange={(e) => handleInputChange('theta', e.target.value)} placeholder="-0.05 (daily decay)" />
          )}

          {tradeColumns.vega && (
            <InputField label={labels.vegaLabel || 'Vega (V)'} type="number" step="0.001" value={formData.vega} onChange={(e) => handleInputChange('vega', e.target.value)} placeholder="e.g. 0.12" />
          )}

          {tradeColumns.slStockPrice && (
            <InputField label={labels.slStockPriceLabel || 'SL Stock Price ($)'} type="number" step="0.01" value={formData.slStockPrice} onChange={e => handleInputChange('slStockPrice', e.target.value)} placeholder="e.g. 145.00" />
          )}

          {tradeColumns.tpStockPrice && (
            <InputField label={labels.tpStockPriceLabel || 'TP Stock Price ($)'} type="number" step="0.01" value={formData.tpStockPrice} onChange={e => handleInputChange('tpStockPrice', e.target.value)} placeholder="e.g. 158.00" />
          )}

          {tradeColumns.premium && (
            <InputField
              label="Breakeven Stock Price ($)"
              type="number"
              step="0.01"
              value={(() => {
                if (formData.breakevenStock !== '') return formData.breakevenStock
                const s = parseFloat(formData.strike)
                const p = parseFloat(formData.premium)
                if (isNaN(s) || isNaN(p)) return ''
                return (formData.optionType === 'call' ? s + p : s - p).toFixed(2)
              })()}
              onChange={e => handleInputChange('breakevenStock', e.target.value)}
              placeholder="Auto-filled from strike + premium"
            />
          )}

          {tradeColumns.entryPrice && (
            <InputField label={labels.entryPriceLabel || 'Entry Price'} type="number" step="0.00001" value={formData.entryPrice} onChange={(e) => handleInputChange('entryPrice', e.target.value)} placeholder="e.g., 1.08500" />
          )}

          {tradeColumns.lotSize && (
            <InputField label={labels.lotSizeLabel || 'Lot Size'} type="number" step="0.01" value={formData.lotSize} onChange={(e) => handleInputChange('lotSize', e.target.value)} placeholder="e.g., 0.01" />
          )}

          {tradeColumns.stopLossPips && (
            <InputField label={labels.stopLossPipsLabel || 'Stop Loss (Pips)'} type="number" step="0.1" value={formData.stopLossPips} onChange={(e) => handleInputChange('stopLossPips', e.target.value)} placeholder="e.g., 20" />
          )}

          {tradeColumns.takeProfitPips && (
            <InputField label={labels.takeProfitPipsLabel || 'Take Profit (Pips)'} type="number" step="0.1" value={formData.takeProfitPips} onChange={(e) => handleInputChange('takeProfitPips', e.target.value)} placeholder="e.g., 40" />
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
                          ? 'bg-white text-black border-white'
                          : 'bg-zinc-800 text-slate-300 border-zinc-700 hover:border-slate-500'
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
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
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
              <textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Trade setup, reasons, strategy..." rows="4" className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
            </div>
          )}

          <PnLDecisionCard
            premium={formData.premium}
            delta={formData.delta}
            gamma={formData.gamma}
            contracts={formData.contracts}
            currentStock={formData.entryStockPrice}
            targetStock={formData.tpStockPrice}
            stopStock={formData.slStockPrice}
            breakevenStock={(() => {
              if (formData.breakevenStock !== '') return formData.breakevenStock
              const s = parseFloat(formData.strike)
              const p = parseFloat(formData.premium)
              if (isNaN(s) || isNaN(p)) return ''
              return (formData.optionType === 'call' ? s + p : s - p).toFixed(2)
            })()}
            accountSize={currentBalance}
            optionType={formData.optionType}
            direction={formData.direction}
          />

          {hasMultipleAccounts && (
            <div className="pt-3 border-t border-zinc-800">
              <p className="text-xs text-slate-500 mb-2">Also log to</p>
              <div className="flex flex-wrap gap-4">
                {accounts
                  .filter(a => a.value !== (formData.account || accounts[0]?.value))
                  .map(a => (
                    <label key={a.value} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={duplicateAccounts.includes(a.value)}
                        onChange={e => setDuplicateAccounts(prev => e.target.checked ? [...prev, a.value] : prev.filter(v => v !== a.value))}
                        className="rounded border-zinc-600 bg-zinc-800 accent-emerald-500"
                      />
                      {a.label}
                    </label>
                  ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={isSubmitting || exceedsLimit} className={`w-full p-4 rounded-lg font-semibold transition-colors ${isSubmitting || exceedsLimit ? 'bg-zinc-700 text-white cursor-not-allowed' : classes.primaryAction}`}>
            {exceedsLimit ? `Risk Exceeds ${(riskFraction * 100).toFixed(1)}% Limit` : isSubmitting ? 'Adding Trade...' : 'Add Trade'}
          </button>
        </form>
      </div>
      </div>
      {sidePanel && (
        <div className="w-[440px] shrink-0 border-l border-zinc-900 sticky top-0 h-screen overflow-y-auto bg-zinc-950">
          {sidePanel}
        </div>
      )}
    </div>
  )
}

const MissedTradesView = ({ setCurrentView, config }) => {
  const [tab, setTab] = useState('log')
  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="sticky top-0 z-10 bg-black/95 border-b border-zinc-900 px-8 py-3 flex items-center gap-3">
        <button onClick={() => setCurrentView('menu')} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mr-4">← Menu</button>
        <button onClick={() => setTab('log')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'log' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Log New</button>
        <button onClick={() => setTab('review')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'review' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Review</button>
      </div>
      {tab === 'log'
        ? <MissedTradeView setCurrentView={setCurrentView} config={config} embedded />
        : <ViewMissedTrades setCurrentView={setCurrentView} config={config} embedded />
      }
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
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
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

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
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
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-500"
              />
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-slate-500">Tip: Keep this updated as your playbook evolves.</div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 text-white rounded-lg font-semibold transition-colors"
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

const calcOptionLeg = (P, d, g, targetStock, S, n) => {
  const dStock = targetStock - S
  const dOption = d * dStock + 0.5 * g * dStock * dStock
  const estPrice = P + dOption
  const pctChange = P !== 0 ? (dOption / P) * 100 : null
  const totalDollar = dOption * n * 100
  return { dStock, dOption, estPrice, pctChange, totalDollar }
}

const BREAKEVEN_THIN_EDGE_THRESHOLD = 0.5

const PnLDecisionCard = ({
  premium, delta, gamma, contracts,
  currentStock, targetStock, stopStock, breakevenStock,
  accountSize, optionType, direction
}) => {
  const P = parseFloat(premium)
  const d = parseFloat(delta)
  const g = parseFloat(gamma)
  const n = parseInt(contracts)
  const S = parseFloat(currentStock)
  const tp = parseFloat(targetStock)
  const sl = parseFloat(stopStock)
  const be = parseFloat(breakevenStock)

  const hasBase = ![P, d, g, n, S].some(isNaN) && n > 0
  const hasTp = !isNaN(tp)
  const hasSl = !isNaN(sl)

  if (!hasBase || (!hasTp && !hasSl)) return null

  const tpCalc = hasTp ? calcOptionLeg(P, d, g, tp, S, n) : null
  const slCalc = hasSl ? calcOptionLeg(P, d, g, sl, S, n) : null

  const profitAtTarget = tpCalc ? tpCalc.totalDollar : null
  const lossAtStop = slCalc ? slCalc.totalDollar : null
  const lossAtStopAbs = lossAtStop !== null ? Math.abs(lossAtStop) : null

  const rr = profitAtTarget !== null && lossAtStop !== null && lossAtStop !== 0
    ? Math.abs(profitAtTarget / lossAtStop)
    : null
  const rrOk = rr !== null && rr >= 3

  const maxLoss = (accountSize || 0) * 0.05
  const breaches5pct = accountSize > 0 && lossAtStopAbs !== null && lossAtStopAbs > maxLoss

  const isCall = optionType === 'call'
  const deltaSignWrong = !isNaN(d) && ((isCall && d < 0) || (!isCall && d > 0))

  let beGapText = null
  let beVerdictColor = null
  let beVerdictMsg = null
  if (!isNaN(be) && hasTp && S > 0) {
    const moveToBreakeven = Math.abs(be - S)
    const moveToTarget = Math.abs(tp - S)
    const breakevenGapPct = (moveToBreakeven / S) * 100
    const breakevenShare = moveToTarget > 0 ? moveToBreakeven / moveToTarget : null
    const targetClearsBE = isCall ? tp > be : tp < be

    beGapText = `Breakeven $${be.toFixed(2)} — a ${breakevenGapPct.toFixed(1)}% move from here`
    if (!targetClearsBE) {
      beVerdictColor = 'red'
      beVerdictMsg = "Target never reaches breakeven — this contract can't profit even if your target hits."
    } else if (breakevenShare !== null && breakevenShare > BREAKEVEN_THIN_EDGE_THRESHOLD) {
      beVerdictColor = 'amber'
      beVerdictMsg = `Breakeven eats ${(breakevenShare * 100).toFixed(0)}% of your move to target — thin edge.`
    } else {
      beVerdictColor = 'green'
      beVerdictMsg = breakevenShare !== null
        ? `Breakeven is only ${(breakevenShare * 100).toFixed(0)}% of the move — most of the target move is profit.`
        : 'Breakeven clears target.'
    }
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">P&amp;L Decision</p>
      {deltaSignWrong && (
        <div className="mb-3 p-3 rounded-lg bg-red-900/20 border border-red-700/40 text-red-400 text-xs">
          ⚠ Delta sign looks wrong for a {isCall ? 'call' : 'put'} — {isCall ? 'calls have positive' : 'puts have negative'} delta. Check your delta value.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {tpCalc && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-zinc-900/50">
            <p className="text-xs text-slate-400 mb-1">Profit at target</p>
            <p className={`text-lg font-bold font-mono ${profitAtTarget >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profitAtTarget >= 0 ? '+' : ''}${Math.abs(profitAtTarget).toFixed(2)}
            </p>
          </div>
        )}
        {slCalc && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-zinc-900/50">
            <p className="text-xs text-slate-400 mb-1">Loss at stop</p>
            <p className={`text-lg font-bold font-mono ${lossAtStop >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {lossAtStop >= 0 ? '+' : '-'}${Math.abs(lossAtStop).toFixed(2)}
            </p>
          </div>
        )}
      </div>
      {rr !== null && (
        <div className={`mb-3 p-2 rounded text-center text-xs font-semibold border ${rrOk ? 'border-emerald-600/50 text-emerald-400' : 'border-amber-600/50 text-amber-400'}`}>
          R:R {rr.toFixed(2)}:1{!rrOk ? ' — below 3:1 minimum' : ''}
        </div>
      )}
      {hasSl && lossAtStopAbs !== null && accountSize > 0 && (
        breaches5pct ? (
          <div className="mb-3 p-3 rounded-lg bg-red-900/20 border border-red-600/50 text-red-400 text-xs font-medium">
            ⚠ Loss at stop is ${lossAtStopAbs.toFixed(2)} — over your 5% limit (${maxLoss.toFixed(2)} on a ${(accountSize || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} account)
          </div>
        ) : (
          <p className="mb-3 text-xs text-zinc-500">Within 5% risk limit (${maxLoss.toFixed(2)} max)</p>
        )
      )}
      {beGapText && (
        <div className={`p-3 rounded-lg border text-xs ${
          beVerdictColor === 'red' ? 'bg-red-900/20 border-red-700/40 text-red-400' :
          beVerdictColor === 'amber' ? 'bg-amber-900/20 border-amber-700/40 text-amber-400' :
          'bg-emerald-900/20 border-emerald-700/40 text-emerald-400'
        }`}>
          <span className="font-medium">{beGapText}</span>
          {beVerdictMsg && <span className="block mt-0.5 opacity-80">{beVerdictMsg}</span>}
        </div>
      )}
      <p className="text-xs text-zinc-700 mt-2">Delta-gamma approx. only — does not account for IV changes.</p>
    </div>
  )
}

const OptionsAnalyzerTab = ({ isInline = false }) => {
  const [stockPrice, setStockPrice] = useState('')
  const [premium, setPremium] = useState('')
  const [contracts, setContracts] = useState('1')
  const [daysToHold, setDaysToHold] = useState('1')
  const [delta, setDelta] = useState('')
  const [gamma, setGamma] = useState('')
  const [theta, setTheta] = useState('')
  const [vega, setVega] = useState('')
  const [expiry, setExpiry] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [tpPrice, setTpPrice] = useState('')
  const [targetStockPrice, setTargetStockPrice] = useState('')
  const [maxRisk, setMaxRisk] = useState('300')
  const [expectedMove, setExpectedMove] = useState('')
  const [ivChange, setIvChange] = useState('0')
  const [openTrades, setOpenTrades] = useState([])
  const [selectedImport, setSelectedImport] = useState('')
  const [pasteState, setPasteState] = useState('idle')

  const extractFromImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setPasteState('loading')
    const reader = new FileReader()
    reader.onload = async ev => {
      const [header, base64] = ev.target.result.split(',')
      const mediaType = header.match(/data:(.*);/)?.[1] || 'image/png'
      try {
        const res = await fetch('/api/extract-greeks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (data.stockPrice != null) setStockPrice(String(data.stockPrice))
        if (data.premium != null) setPremium(String(data.premium))
        if (data.delta != null) setDelta(String(data.delta))
        if (data.gamma != null) setGamma(String(data.gamma))
        if (data.theta != null) setTheta(String(data.theta))
        if (data.vega != null) setVega(String(data.vega))
        setPasteState('success')
        setTimeout(() => setPasteState('idle'), 4000)
      } catch {
        setPasteState('error')
        setTimeout(() => setPasteState('idle'), 4000)
      }
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const handlePaste = async e => {
      const imageItem = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
      if (imageItem) extractFromImage(imageItem.getAsFile())
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  useEffect(() => {
    supabase.from('options_trades')
      .select('id, ticker, premium, contracts, delta, gamma, theta, vega, entry_stock_price, sl_stock_price, tp_stock_price, expiry_date')
      .eq('status', 'open')
      .order('entry_date', { ascending: false })
      .then(({ data }) => { if (data) setOpenTrades(data) })
  }, [])

  const handleImport = (id) => {
    setSelectedImport(id)
    const t = openTrades.find(o => String(o.id) === id)
    if (!t) return
    if (t.entry_stock_price != null) setStockPrice(String(t.entry_stock_price))
    if (t.premium != null) setPremium(String(t.premium))
    if (t.delta != null) setDelta(String(t.delta))
    if (t.gamma != null) setGamma(String(t.gamma))
    if (t.theta != null) setTheta(String(t.theta))
    if (t.vega != null) setVega(String(t.vega))
    if (t.contracts != null) setContracts(String(t.contracts))
    if (t.expiry_date) setExpiry(t.expiry_date.split('T')[0])
    if (t.sl_stock_price != null) setStopPrice(String(t.sl_stock_price))
    if (t.tp_stock_price != null) setTpPrice(String(t.tp_stock_price))
  }

  const handleReset = () => {
    setStockPrice(''); setPremium(''); setContracts('1'); setDaysToHold('1')
    setDelta(''); setGamma(''); setTheta(''); setVega('')
    setExpiry(''); setStopPrice(''); setTpPrice('')
    setTargetStockPrice(''); setMaxRisk('300'); setExpectedMove(''); setIvChange('0')
    setPasteState('idle'); setSelectedImport('')
  }

  const S = parseFloat(stockPrice)
  const P = parseFloat(premium)
  const d = parseFloat(delta)
  const g = parseFloat(gamma)
  const th = parseFloat(theta)
  const v = parseFloat(vega)
  const n = parseInt(contracts) || 1
  const holdDays = parseInt(daysToHold) || 1
  const canBase = [S, P, d, g].every(x => !isNaN(x)) && n > 0

  const daysToExpiry = expiry ? Math.ceil((new Date(expiry) - new Date()) / 86400000) : null

  const R = parseFloat(maxRisk)
  const canReverse = canBase && !isNaN(R) && R > 0
  const ivChg = parseFloat(ivChange) || 0

  const thetaCostDollar = !isNaN(th) ? th * holdDays * 100 * n : 0
  const ivImpactDollar  = !isNaN(v)  ? v  * ivChg    * 100 * n : 0
  const timeDragDollar  = thetaCostDollar + ivImpactDollar

  const slVal = parseFloat(stopPrice)
  const tpVal = parseFloat(tpPrice)
  const slResult = canBase && !isNaN(slVal) ? calcOptionLeg(P, d, g, slVal, S, n) : null
  const tpResult = canBase && !isNaN(tpVal) ? calcOptionLeg(P, d, g, tpVal, S, n) : null
  const allInSL = slResult ? slResult.totalDollar + timeDragDollar : null
  const allInTP = tpResult ? tpResult.totalDollar + timeDragDollar : null
  const rr = allInSL !== null && allInTP !== null && allInSL !== 0
    ? Math.abs(allInTP / allInSL)
    : null

  const T = parseFloat(targetStockPrice)
  const canBuyStop = canBase && !isNaN(T) && P > 0
  const buystopResult = canBuyStop ? calcOptionLeg(P, d, g, T, S, n) : null
  const isUpside = canBuyStop && T > S
  const atMarket = canBuyStop && T === S
  const worthless = buystopResult && buystopResult.estPrice <= 0

  const adjustedPriceBudget = canReverse ? R + timeDragDollar : 0
  const timeDragExceedsRisk = canReverse && timeDragDollar <= -R
  const thetaPct = canReverse ? Math.abs(thetaCostDollar) / R * 100 : 0
  const ivPct    = canReverse ? Math.abs(ivImpactDollar)  / R * 100 : 0
  const pricePct = canReverse && !timeDragExceedsRisk ? adjustedPriceBudget / R * 100 : 0

  let stopLevel = null
  if (canReverse && !timeDragExceedsRisk && adjustedPriceBudget > 0) {
    const maxLossPerShare = adjustedPriceBudget / (n * 100)
    const dir = d > 0 ? -1 : 1
    let lo = 0, hi = 1000
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      const actualDS = dir * mid
      const loss = Math.abs(d * actualDS + 0.5 * g * actualDS * actualDS)
      if (loss < maxLossPerShare) lo = mid
      else hi = mid
    }
    const magnitude = (lo + hi) / 2
    stopLevel = { dS: dir * magnitude, stopStockPrice: S + dir * magnitude, isCall: d > 0 }
  }

  const timeDragPerShare = (!isNaN(th) ? th * holdDays : 0) + (!isNaN(v) ? v * ivChg : 0)
  let breakevenMove = null
  if (canReverse && timeDragPerShare !== 0) {
    if (Math.abs(g) < 1e-10) {
      breakevenMove = d !== 0 ? -timeDragPerShare / d : null
    } else {
      const disc = d * d - 2 * g * timeDragPerShare
      if (disc >= 0) {
        breakevenMove = d > 0
          ? (-d + Math.sqrt(disc)) / g
          : (-d - Math.sqrt(disc)) / g
      }
    }
  }

  const dS = parseFloat(expectedMove)
  const canForward = canReverse && !isNaN(dS)
  let fwd = null
  if (canForward) {
    const calc = calcOptionLeg(P, d, g, S + dS, S, n)
    const fwdAllIn = calc.totalDollar + timeDragDollar
    fwd = { ...calc, pnlPerContract: calc.dOption * 100, fwdAllIn, breached: Math.abs(fwdAllIn) >= R }
  }

  const thetaDailyDollar = !isNaN(th) ? th * 100 * n : null
  const vegaPerPctDollar = !isNaN(v) ? v * 100 * n : null

  const fmtDollar = (val, sign = true) => {
    const abs = Math.abs(val).toFixed(2)
    if (!sign) return `$${abs}`
    return val >= 0 ? `+$${abs}` : `-$${abs}`
  }
  const formatDollar = val => `${val >= 0 ? '+' : ''}$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${val < 0 ? ' loss' : ' gain'}`
  const formatPct = val => val !== null ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : 'N/A'

  const ResultRow = ({ label, value, large, color }) => (
    <div className={`flex justify-between items-center p-3 rounded-lg ${large ? 'bg-zinc-900' : 'bg-zinc-900/50'}`}>
      <span className={`text-sm ${large ? 'text-slate-300' : 'text-slate-400'}`}>{label}</span>
      <span className={`font-bold ${large ? 'text-xl' : ''} ${color}`}>{value}</span>
    </div>
  )

  const presetBtn = (pct, setter, currentVal) => {
    const computed = !isNaN(S) ? parseFloat((S * (1 + pct / 100)).toFixed(2)) : null
    const isActive = computed !== null && currentVal === String(computed)
    return (
      <button
        key={pct}
        disabled={isNaN(S)}
        onClick={() => computed !== null && setter(String(computed))}
        className={`px-2 py-0.5 text-xs rounded border transition-colors ${isNaN(S) ? 'opacity-30 cursor-not-allowed border-zinc-800 text-slate-500' : isActive ? 'border-white bg-white/10 text-white' : 'border-zinc-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
      >
        {pct > 0 ? `+${pct}%` : `${pct}%`}
      </button>
    )
  }

  return (
    <div>
      {!isInline && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-500 text-sm">Enter details or paste a broker screenshot to auto-fill.</p>
          <button onClick={handleReset} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Reset</button>
        </div>
      )}

      {openTrades.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Import from open trade (optional)</label>
          <select value={selectedImport} onChange={e => handleImport(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-zinc-500">
            <option value="">— select a trade —</option>
            {openTrades.map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.ticker} — {t.contracts}× @ ${t.premium}{t.delta != null ? ` (Δ ${t.delta})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        onDrop={e => { e.preventDefault(); extractFromImage(e.dataTransfer?.files?.[0]) }}
        onDragOver={e => e.preventDefault()}
        className={`mb-5 rounded-lg border-2 border-dashed px-4 py-3 text-center text-sm transition-colors cursor-default ${
          pasteState === 'loading' ? 'border-zinc-700 bg-zinc-900/30 text-slate-400' :
          pasteState === 'success' ? 'border-emerald-700/50 bg-emerald-900/10 text-emerald-400' :
          pasteState === 'error' ? 'border-red-700/50 bg-red-900/10 text-red-400' :
          'border-zinc-900 text-slate-600 hover:border-zinc-800 hover:text-slate-500'
        }`}
      >
        {pasteState === 'loading' && 'Extracting Greeks from screenshot...'}
        {pasteState === 'success' && '✓ Auto-filled — review values and adjust if needed'}
        {pasteState === 'error' && 'Could not extract — please fill in fields manually'}
        {pasteState === 'idle' && 'Paste broker screenshot (Ctrl+V / ⌘V) or drag & drop to auto-fill Greeks'}
      </div>

      {/* ── SECTION 1: INPUTS ─────────────────────────────────────────── */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current Stock Price ($)</label>
            <input type="number" step="0.01" value={stockPrice} onChange={e => setStockPrice(e.target.value)}
              placeholder="e.g. 450.00"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current Option Premium ($)</label>
            <input type="number" step="0.01" value={premium} onChange={e => setPremium(e.target.value)}
              placeholder="e.g. 3.50"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Delta (Δ)</label>
            <input type="number" step="0.001" value={delta} onChange={e => setDelta(e.target.value)}
              placeholder="e.g. 0.45 or -0.45"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Gamma (Γ)</label>
            <input type="number" step="0.001" value={gamma} onChange={e => setGamma(e.target.value)}
              placeholder="e.g. 0.05"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Theta (Θ) <span className="text-slate-600">optional</span></label>
            <input type="number" step="0.001" value={theta} onChange={e => setTheta(e.target.value)}
              placeholder="e.g. -0.08"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Vega (V) <span className="text-slate-600">optional</span></label>
            <input type="number" step="0.001" value={vega} onChange={e => setVega(e.target.value)}
              placeholder="e.g. 0.12"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Contracts</label>
            <input type="number" step="1" min="1" value={contracts} onChange={e => setContracts(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Days to Hold</label>
            <input type="number" step="1" min="1" value={daysToHold} onChange={e => setDaysToHold(e.target.value)}
              placeholder="e.g. 3"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
            <div className="flex gap-1 mt-1.5">
              {[['1D', '1'], ['3D', '3']].map(([label, val]) => (
                <button key={label} onClick={() => setDaysToHold(val)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${daysToHold === val ? 'border-white bg-white/10 text-white' : 'border-zinc-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                  {label}
                </button>
              ))}
              <button
                disabled={daysToExpiry === null}
                onClick={() => daysToExpiry !== null && setDaysToHold(String(daysToExpiry))}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${daysToExpiry === null ? 'opacity-30 cursor-not-allowed border-zinc-800 text-slate-500' : daysToHold === String(daysToExpiry) ? 'border-white bg-white/10 text-white' : 'border-zinc-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                To Exp
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Expiry Date <span className="text-slate-600">optional</span></label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none" />
            {daysToExpiry !== null && (
              <p className="text-xs mt-1.5 text-slate-400">
                <span className={`font-semibold ${daysToExpiry <= 7 ? 'text-red-400' : daysToExpiry <= 21 ? 'text-amber-400' : 'text-slate-300'}`}>{daysToExpiry} DTE</span>
                {' — set "Days to Hold" or use '}
                <button onClick={() => setDaysToHold(String(daysToExpiry))} className="underline hover:text-white transition-colors">To Exp</button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: THETA DECAY ────────────────────────────────────── */}
      {!isInline && !isNaN(th) && (
        <div className="bg-zinc-950 border border-amber-500/30 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wide mb-3">Theta Decay</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center bg-zinc-900/50 rounded-lg p-3">
              <span className="text-xs text-slate-400 mb-1">Daily (Θ × N × 100)</span>
              <span className="font-bold text-amber-400">{(th * n * 100) >= 0 ? '+' : ''}${(th * n * 100).toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-center bg-zinc-900/50 rounded-lg p-3">
              <span className="text-xs text-slate-400 mb-1">Days to Hold</span>
              <span className="font-bold text-white">{holdDays}</span>
            </div>
            <div className="flex flex-col items-center bg-zinc-900/50 rounded-lg p-3">
              <span className="text-xs text-slate-400 mb-1">Total Decay</span>
              <span className="font-bold text-red-400">{(th * holdDays * n * 100) >= 0 ? '+' : ''}${(th * holdDays * n * 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 3: RISK STOP ──────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Risk Stop</p>
        <p className="text-slate-500 text-xs mb-4">Find the underlying price where your max dollar risk is breached, back-calculated from your Greeks.</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Max Dollar Risk ($)</label>
            <input type="number" step="1" min="1" value={maxRisk} onChange={e => setMaxRisk(e.target.value)}
              placeholder="e.g. 300"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Expected Move ($) <span className="text-slate-600">optional</span></label>
            <input type="number" step="0.01" value={expectedMove} onChange={e => setExpectedMove(e.target.value)}
              placeholder="e.g. -5.00"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Expected IV Change (pts) <span className="text-slate-600">optional</span></label>
            <input type="number" step="0.1" value={ivChange} onChange={e => setIvChange(e.target.value)}
              placeholder="e.g. -5 for crush"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        {timeDragExceedsRisk && (
          <div className="p-4 bg-amber-900/20 border border-amber-800/50 rounded-xl text-amber-400 text-sm mb-4">
            Time decay alone exceeds your risk budget over this holding period — no stop level available.
          </div>
        )}
        {canReverse && !timeDragExceedsRisk && stopLevel && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 mb-3 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Risk Budget</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Price move budget</span>
              <span className="text-sm font-semibold font-mono text-slate-200">
                ${adjustedPriceBudget.toFixed(2)} <span className="text-xs text-slate-600">({pricePct.toFixed(0)}%)</span>
              </span>
            </div>
            {thetaCostDollar !== 0 && (
              <div className="flex justify-between items-center">
                <span className={`text-sm ${thetaPct > 50 ? 'text-red-400' : thetaPct > 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                  Theta cost ({holdDays}d)
                </span>
                <span className={`text-sm font-semibold font-mono ${thetaPct > 50 ? 'text-red-400' : thetaPct > 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {fmtDollar(thetaCostDollar)} <span className="text-xs text-slate-600">({thetaPct.toFixed(0)}%)</span>
                </span>
              </div>
            )}
            {ivImpactDollar !== 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">IV impact ({ivChg > 0 ? '+' : ''}{ivChg} pts)</span>
                <span className={`text-sm font-semibold font-mono ${ivImpactDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtDollar(ivImpactDollar)} <span className="text-xs text-slate-600">({ivPct.toFixed(0)}%)</span>
                </span>
              </div>
            )}
            <div className="border-t border-zinc-800 pt-2 flex justify-between items-center">
              <span className="text-sm text-slate-400">Total risk budget</span>
              <span className="text-sm font-semibold font-mono text-slate-200">${R.toFixed(2)}</span>
            </div>
          </div>
        )}
        {stopLevel && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Stop Loss Level</p>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Underlying stop price</p>
                <p className={`text-3xl font-bold ${stopLevel.isCall ? 'text-red-400' : 'text-amber-400'}`}>
                  ${stopLevel.stopStockPrice.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">Adverse move</p>
                <p className="text-lg font-semibold text-slate-300">{fmtDollar(stopLevel.dS)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {stopLevel.isCall
                ? `Exit if the stock falls to ~$${stopLevel.stopStockPrice.toFixed(2)} — calls lose value on drops ↓`
                : `Exit if the stock rises to ~$${stopLevel.stopStockPrice.toFixed(2)} — puts lose value on rises ↑`}
            </p>
          </div>
        )}
        {breakevenMove !== null && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Breakeven Move</p>
            <p className="text-sm text-slate-300">
              Underlying must move{' '}
              <span className="font-semibold text-white">
                {breakevenMove >= 0 ? '+' : ''}${Math.abs(breakevenMove).toFixed(2)}
              </span>{' '}
              in your favor just to break even after {holdDays} day{holdDays !== 1 ? 's' : ''} of holding.
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION 4: BUY STOP ───────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Buy Stop</p>
        <p className="text-slate-500 text-xs mb-4">Enter when the stock confirms your direction — use this price as your buy-stop limit order.</p>
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Target Stock Price ($)</label>
          <input type="number" step="0.01" value={targetStockPrice} onChange={e => setTargetStockPrice(e.target.value)}
            placeholder="e.g. 455.00"
            className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
        </div>
        {canBuyStop && atMarket && (
          <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-slate-400 text-sm text-center">
            Target equals current price — enter at market.
          </div>
        )}
        {canBuyStop && !atMarket && worthless && (
          <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm text-center">
            Option likely worthless at that level — target is too far from current price.
          </div>
        )}
        {canBuyStop && !atMarket && !worthless && buystopResult && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Buy Stop Order Price</p>
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${isUpside ? 'text-emerald-400 border-emerald-700 bg-emerald-900/20' : 'text-amber-400 border-amber-700 bg-amber-900/20'}`}>
                {isUpside ? 'Waiting for upside ↑' : 'Waiting for downside ↓'}
              </span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">${Math.max(0, buystopResult.estPrice).toFixed(2)}</p>
            <p className="text-slate-500 text-xs mb-4">per contract · set as your buy stop limit</p>
            <div className="grid grid-cols-3 gap-3 text-sm border-t border-zinc-800 pt-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">vs entering now</p>
                <p className={`font-semibold text-sm ${buystopResult.dOption >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {buystopResult.dOption >= 0 ? '+' : ''}${(buystopResult.dOption * 100).toFixed(2)}/ct
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total cost ({n} ct)</p>
                <p className="text-white font-semibold text-sm">${(Math.max(0, buystopResult.estPrice) * n * 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Premium change</p>
                <p className={`font-semibold text-sm ${(buystopResult.pctChange ?? 0) >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {buystopResult.pctChange != null ? `${buystopResult.pctChange >= 0 ? '+' : ''}${buystopResult.pctChange.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 5: SL / TP ────────────────────────────────────────── */}
      {!isInline && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Stop Loss / Take Profit</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stop Loss Price ($)</label>
              <input type="number" step="0.01" value={stopPrice} onChange={e => setStopPrice(e.target.value)}
                placeholder="e.g. 445.00"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {PRESET_SL.map(pct => presetBtn(pct, setStopPrice, stopPrice))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Take Profit Price ($)</label>
              <input type="number" step="0.01" value={tpPrice} onChange={e => setTpPrice(e.target.value)}
                placeholder="e.g. 458.00"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm focus:border-zinc-600 focus:outline-none placeholder-slate-600" />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {PRESET_TP.map(pct => presetBtn(pct, setTpPrice, tpPrice))}
              </div>
            </div>
          </div>
          {(slResult || tpResult) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {slResult && (
                <div className="bg-zinc-950 border border-red-500/30 rounded-lg p-4 space-y-2">
                  <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide mb-3">Stop Loss</h2>
                  <ResultRow label="ΔStock" value={`${slResult.dStock >= 0 ? '+' : ''}${slResult.dStock.toFixed(2)}`} color={slResult.dStock >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  <ResultRow label="Option Price at SL" large value={<>{`$${Math.max(slResult.estPrice, 0).toFixed(2)}`}{slResult.estPrice < 0 && <span className="text-xs font-normal text-red-400 ml-1">(floored)</span>}</>} color="text-white" />
                  <ResultRow label="% Change" value={formatPct(slResult.pctChange)} color={slResult.pctChange !== null && slResult.pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  <ResultRow label={`Total all-in (${n}× 100)`} large value={formatDollar(allInSL)} color={allInSL >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  {(thetaCostDollar !== 0 || ivImpactDollar !== 0) && (
                    <p className="text-xs text-slate-600 pl-1">
                      Price move: {fmtDollar(slResult.totalDollar)}
                      {thetaCostDollar !== 0 && ` | Theta (${holdDays}d): ${fmtDollar(thetaCostDollar)}`}
                      {ivImpactDollar !== 0 && ` | IV: ${fmtDollar(ivImpactDollar)}`}
                    </p>
                  )}
                </div>
              )}
              {tpResult && (
                <div className="bg-zinc-950 border border-emerald-500/30 rounded-lg p-4 space-y-2">
                  <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-3">Take Profit</h2>
                  <ResultRow label="ΔStock" value={`${tpResult.dStock >= 0 ? '+' : ''}${tpResult.dStock.toFixed(2)}`} color={tpResult.dStock >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  <ResultRow label="Option Price at TP" large value={`$${Math.max(tpResult.estPrice, 0).toFixed(2)}`} color="text-white" />
                  <ResultRow label="% Change" value={formatPct(tpResult.pctChange)} color={tpResult.pctChange !== null && tpResult.pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  <ResultRow label={`Total all-in (${n}× 100)`} large value={formatDollar(allInTP)} color={allInTP >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  {(thetaCostDollar !== 0 || ivImpactDollar !== 0) && (
                    <p className="text-xs text-slate-600 pl-1">
                      Price move: {fmtDollar(tpResult.totalDollar)}
                      {thetaCostDollar !== 0 && ` | Theta (${holdDays}d): ${fmtDollar(thetaCostDollar)}`}
                      {ivImpactDollar !== 0 && ` | IV: ${fmtDollar(ivImpactDollar)}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {rr !== null && (
            <div className={`rounded-lg p-4 flex items-center justify-between border ${rr >= 1.5 ? 'bg-emerald-900/20 border-emerald-600' : 'bg-amber-900/20 border-amber-600'}`}>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">Risk / Reward (all-in)</p>
                <p className={`text-4xl font-bold ${rr >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>1 : {rr.toFixed(2)}</p>
                {rr < 1.5 && <p className="text-xs text-amber-400 mt-1">Below 1.5:1 minimum — consider adjusting targets.</p>}
              </div>
              <div className="text-right text-sm text-slate-400 space-y-1">
                {allInSL !== null && <p>Risk: <span className="text-red-400 font-semibold">{formatDollar(allInSL)}</span></p>}
                {allInTP !== null && <p>Reward: <span className="text-emerald-400 font-semibold">{formatDollar(allInTP)}</span></p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 6: GREEK CALLOUTS ─────────────────────────────────── */}
      {(thetaDailyDollar != null || vegaPerPctDollar != null) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Greek Callouts</p>
          <div className="space-y-2">
            {thetaDailyDollar != null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Theta decay ({holdDays} day{holdDays !== 1 ? 's' : ''})</span>
                <span className={`text-sm font-semibold font-mono ${thetaDailyDollar * holdDays < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {fmtDollar(thetaDailyDollar * holdDays)}
                </span>
              </div>
            )}
            {vegaPerPctDollar != null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Vega impact (per 1% IV move)</span>
                <span className={`text-sm font-semibold font-mono ${vegaPerPctDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtDollar(vegaPerPctDollar)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 7: FORWARD P&L ────────────────────────────────────── */}
      {fwd && (
        <div className={`rounded-xl border p-5 ${fwd.breached ? 'border-red-700/50 bg-red-900/10' : 'border-emerald-700/50 bg-emerald-900/10'}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-lg font-bold tracking-wide ${fwd.breached ? 'text-red-400' : 'text-emerald-400'}`}>
              {fwd.breached ? '✗ STOP LOSS HIT' : '✓ SAFE'}
            </span>
            <span className="text-xs text-slate-500">at expected move of {dS > 0 ? '+' : ''}{dS.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Est. Option Price</p>
              <p className="text-xl font-bold text-slate-100">${Math.max(0, fwd.estPrice).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">P&L / Contract</p>
              <p className={`text-xl font-bold ${fwd.pnlPerContract >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtDollar(fwd.pnlPerContract)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Total P&L (all-in)</p>
              <p className={`text-xl font-bold ${fwd.fwdAllIn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtDollar(fwd.fwdAllIn)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


const TrailingStopBanner = ({ onGoToStops }) => {
  const [alerts, setAlerts] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailing_dismissed') || '{}') } catch { return {} }
  })

  useEffect(() => {
    supabase
      .from('options_trades')
      .select('id, ticker, trailing_stop_price, trailing_stop_set_date, contracts')
      .eq('status', 'open')
      .not('trailing_stop_price', 'is', null)
      .then(({ data }) => { if (data) setAlerts(data) })
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const dismiss = (id) => {
    const key = `${id}_${today}`
    const next = { ...dismissed, [key]: true }
    setDismissed(next)
    localStorage.setItem('trailing_dismissed', JSON.stringify(next))
  }

  const expired = alerts.filter(a => {
    if (!a.trailing_stop_set_date) return false
    const setDate = a.trailing_stop_set_date.split('T')[0]
    return setDate < today && !dismissed[`${a.id}_${today}`]
  })

  if (expired.length === 0) return null

  return (
    <div className="mb-6 space-y-2">
      {expired.map(a => (
        <div key={a.id} className="flex items-start justify-between gap-4 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-amber-400">
              Trailing Stop Expired — {a.ticker}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Your trailing stop at <span className="text-white font-mono">${a.trailing_stop_price}</span> from {a.trailing_stop_set_date} has expired.
              Re-enter it in your broker, or close the trade if your stop was hit.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { dismiss(a.id); onGoToStops?.() }}
              className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors whitespace-nowrap">
              Re-enter Stop
            </button>
            <button onClick={() => dismiss(a.id)}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">&#x2715;</button>
          </div>
        </div>
      ))}
    </div>
  )
}

const TrailingStopsTab = () => {
  const [openTrades, setOpenTrades] = useState([])
  const [selectedImport, setSelectedImport] = useState('')
  const [form, setForm] = useState({
    ticker: '',
    entryPrice: '',
    entryDate: '',
    premium: '',
    delta: '',
    gamma: '',
    theta: '',
    contracts: '',
  })
  const [stopPrice, setStopPrice] = useState('')
  const [logMsg, setLogMsg] = useState('')

  useEffect(() => {
    supabase
      .from('options_trades')
      .select('id, ticker, premium, contracts, delta, gamma, theta, entry_stock_price, entry_date')
      .eq('status', 'open')
      .order('entry_date', { ascending: false })
      .then(({ data }) => { if (data) setOpenTrades(data) })
  }, [])

  const handleImportTrade = (id) => {
    setSelectedImport(id)
    const t = openTrades.find(o => String(o.id) === id)
    if (!t) return
    setForm({
      ticker: t.ticker || '',
      entryPrice: t.entry_stock_price != null ? String(t.entry_stock_price) : '',
      entryDate: t.entry_date ? t.entry_date.split('T')[0] : '',
      premium: t.premium != null ? String(t.premium) : '',
      contracts: t.contracts != null ? String(t.contracts) : '',
      delta: t.delta != null ? String(t.delta) : '',
      gamma: t.gamma != null ? String(t.gamma) : '',
      theta: t.theta != null ? String(t.theta) : '',
    })
    setStopPrice('')
  }

  const handleReset = () => {
    setForm({ ticker: '', entryPrice: '', entryDate: '', premium: '', delta: '', gamma: '', theta: '', contracts: '' })
    setStopPrice('')
    setSelectedImport('')
    setLogMsg('')
  }

  const handleLogStop = async () => {
    if (!selectedImport || !canCalc) return
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('options_trades')
      .update({ trailing_stop_price: stopSP, trailing_stop_set_date: today })
      .eq('id', selectedImport)
    setLogMsg(error ? `Error: ${error.message}` : `Trailing stop at $${stopSP.toFixed(2)} logged for today.`)
    setTimeout(() => setLogMsg(''), 4000)
  }

  const S = parseFloat(form.entryPrice)
  const P = parseFloat(form.premium)
  const d = parseFloat(form.delta)
  const g = parseFloat(form.gamma)
  const th = parseFloat(form.theta)
  const n = parseInt(form.contracts) || 1
  const stopSP = parseFloat(stopPrice)

  const todayObj = new Date()
  todayObj.setHours(0, 0, 0, 0)
  const entryDateObj = form.entryDate ? new Date(form.entryDate) : null
  const daysHeld = entryDateObj ? Math.max(0, Math.round((todayObj - entryDateObj) / 86400000)) : null

  const canCalc = [S, P, d, g].every(x => !isNaN(x)) && n > 0 && !isNaN(stopSP)
  const priceResult = canCalc ? calcOptionLeg(P, d, g, stopSP, S, n) : null
  const thetaCostPerShare = (!isNaN(th) && daysHeld !== null) ? th * daysHeld : 0
  const thetaCostDollar = thetaCostPerShare * n * 100
  const estPriceAllIn = priceResult ? Math.max(0, priceResult.estPrice + thetaCostPerShare) : null
  const totalDollarAllIn = priceResult ? priceResult.totalDollar + thetaCostDollar : null

  const inputCls = 'w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-zinc-600'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">Enter your trade details to see what your option will be worth at a given stop price.</p>
        <button onClick={handleReset} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Reset</button>
      </div>

      {openTrades.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Import from open trade</label>
          <select value={selectedImport} onChange={e => handleImportTrade(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-zinc-600">
            <option value="">— select a trade —</option>
            {openTrades.map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.ticker} — {t.contracts}× @ ${t.premium}{t.delta != null ? ` (Δ ${t.delta})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Entry Stock Price ($)</label>
          <input type="number" step="0.01" value={form.entryPrice}
            onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))}
            placeholder="e.g. 450.00" className={inputCls} />
          {!form.entryPrice && <p className="text-xs text-amber-500 mt-1">Required — enter your stock entry price</p>}
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Entry Date</label>
          <input type="date" value={form.entryDate}
            onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
            className={inputCls} />
          {!form.entryDate && <p className="text-xs text-slate-600 mt-1">Optional — needed for theta</p>}
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Option Premium ($)</label>
          <input type="number" step="0.01" value={form.premium}
            onChange={e => setForm(f => ({ ...f, premium: e.target.value }))}
            placeholder="e.g. 3.50" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Contracts</label>
          <input type="number" step="1" min="1" value={form.contracts}
            onChange={e => setForm(f => ({ ...f, contracts: e.target.value }))}
            placeholder="e.g. 2" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Delta (Δ)</label>
          <input type="number" step="0.001" value={form.delta}
            onChange={e => setForm(f => ({ ...f, delta: e.target.value }))}
            placeholder="e.g. 0.45 or -0.45" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Gamma (Γ)</label>
          <input type="number" step="0.001" value={form.gamma}
            onChange={e => setForm(f => ({ ...f, gamma: e.target.value }))}
            placeholder="e.g. 0.03" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Theta (Θ) <span className="text-slate-600">daily decay</span></label>
          <input type="number" step="0.001" value={form.theta}
            onChange={e => setForm(f => ({ ...f, theta: e.target.value }))}
            placeholder="e.g. -0.05" className={inputCls} />
          {!form.theta && <p className="text-xs text-amber-500 mt-1">Required — enter theta so time decay is included</p>}
        </div>
      </div>

      <div className="mt-5">
        <label className="block text-xs text-slate-400 mb-1">Stop Loss Stock Price ($)</label>
        <input type="number" step="0.01" value={stopPrice}
          onChange={e => setStopPrice(e.target.value)}
          placeholder="Stock price where you want to place your stop"
          className={inputCls} />
      </div>

      {daysHeld !== null && (
        <p className="text-xs text-slate-500 mt-2">
          Held for <span className="text-slate-300 font-semibold">{daysHeld} day{daysHeld !== 1 ? 's' : ''}</span>
          {' '}({form.entryDate} → today)
        </p>
      )}

      {canCalc && estPriceAllIn !== null && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Option Value at Stop</p>
            <span className="text-xs px-2 py-1 rounded-full border border-zinc-700 text-slate-400">
              stock @ ${parseFloat(stopPrice).toFixed(2)}
            </span>
          </div>
          <p className="text-4xl font-bold text-white mb-1">${estPriceAllIn.toFixed(2)}</p>
          <p className="text-slate-500 text-xs mb-4">per contract · set as your broker stop limit</p>
          <div className={`grid gap-3 text-sm border-t border-zinc-800 pt-3 ${thetaCostDollar !== 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div>
              <p className="text-xs text-slate-500 mb-1">Price move P&L</p>
              <p className={`font-semibold ${priceResult.totalDollar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {priceResult.totalDollar >= 0 ? '+' : ''}${Math.abs(priceResult.totalDollar).toFixed(2)}
              </p>
            </div>
            {thetaCostDollar !== 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Theta ({daysHeld}d)</p>
                <p className="font-semibold text-red-400">{thetaCostDollar >= 0 ? '+' : ''}${Math.abs(thetaCostDollar).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 mb-1">All-in P&L ({n} ct)</p>
              <p className={`font-semibold ${totalDollarAllIn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalDollarAllIn >= 0 ? '+' : ''}${Math.abs(totalDollarAllIn).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedImport && canCalc && (
        <div className="mt-4">
          <button onClick={handleLogStop}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-sm transition-colors">
            Log This Stop to Trade
          </button>
          {logMsg && (
            <p className={`text-xs mt-2 text-center ${logMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{logMsg}</p>
          )}
        </div>
      )}

      <p className="text-xs text-slate-700 mt-5">Option price estimated using delta-gamma approximation + theta decay. IV changes not included.</p>
    </div>
  )
}

const FOREX_PIP_VALUES = {
  'EUR/USD': 10, 'GBP/USD': 10, 'AUD/USD': 10, 'NZD/USD': 10,
  'USD/JPY': 9.30, 'USD/CAD': 7.70, 'USD/CHF': 10.80,
  'GBP/JPY': 9.30, 'EUR/JPY': 9.30, 'EUR/GBP': 10, 'AUD/JPY': 9.30,
}

const ForexLotSizeCalculator = ({ config }) => {
  const [accountBalance, setAccountBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [riskPercent, setRiskPercent] = useState('0.5')
  const [pair, setPair] = useState('EUR/USD')
  const [stopLossPips, setStopLossPips] = useState('')

  useEffect(() => {
    const load = async () => {
      setBalanceLoading(true)
      try {
        const { data } = await supabase
          .from(config.tables.balance)
          .select('balance')
          .order(config.balanceColumns?.createdAt || 'created_at', { ascending: false })
          .limit(1)
        const balCol = config.balanceColumns?.balance || 'balance'
        setAccountBalance(data?.[0] ? parseFloat(data[0][balCol]) || 0 : config.accountBalance || 10000)
      } catch {
        setAccountBalance(config.accountBalance || 10000)
      }
      setBalanceLoading(false)
    }
    load()
  }, [config.tables.balance, config.accountBalance])

  const pipValue = FOREX_PIP_VALUES[pair] ?? 10
  const riskDollars = accountBalance * (parseFloat(riskPercent) / 100)
  const stopPips = parseFloat(stopLossPips)
  const lotSize = (!isNaN(stopPips) && stopPips > 0 && riskDollars > 0)
    ? Math.round((riskDollars / (stopPips * pipValue)) * 100) / 100
    : null

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">FX Lot Size Calculator</h2>
      <p className="text-slate-400 mb-6">Calculate the right lot size for your FTMO risk parameters.</p>

      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-6 flex justify-between items-center">
        <span className="text-slate-400">Account Balance</span>
        {balanceLoading ? (
          <span className="text-slate-400 text-sm">Loading...</span>
        ) : (
          <span className="text-white font-semibold">${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">Risk %</label>
          <div className="flex gap-2 mb-2">
            {['0.25', '0.5', '1'].map(p => (
              <button key={p} type="button" onClick={() => setRiskPercent(p)}
                className={`px-3 py-1.5 rounded text-sm border transition-colors ${riskPercent === p ? 'bg-white text-black border-white' : 'bg-zinc-800 text-slate-300 border-zinc-700 hover:border-slate-500'}`}>
                {p}%
              </button>
            ))}
          </div>
          <input type="number" step="0.01" min="0.01" max="5" value={riskPercent} onChange={e => setRiskPercent(e.target.value)}
            className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-slate-500 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">Currency Pair</label>
          <select value={pair} onChange={e => setPair(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-slate-100 focus:outline-none focus:border-slate-500">
            {Object.keys(FOREX_PIP_VALUES).map(p => <option key={p} value={p}>{p} (${FOREX_PIP_VALUES[p]}/pip)</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">Stop Loss (Pips)</label>
          <input type="number" step="0.1" min="0.1" value={stopLossPips} onChange={e => setStopLossPips(e.target.value)}
            placeholder="e.g., 20"
            className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-slate-100 focus:border-slate-500 focus:outline-none placeholder-slate-500" />
        </div>
      </div>

      {lotSize !== null && (
        <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          {lotSize < 0.01 ? (
            <p className="text-amber-400 text-sm">Position too small — tighten stop or increase risk %</p>
          ) : (
            <>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Recommended Lot Size</p>
              <p className="text-5xl font-bold text-white mb-1">{lotSize.toFixed(2)}</p>
              <p className="text-slate-400 text-sm">lots</p>
              <div className="mt-4 flex gap-6 text-sm text-slate-300">
                <span>Risk: <span className="text-emerald-400 font-semibold">${riskDollars.toFixed(2)}</span></span>
                <span>Pip value: <span className="text-slate-100">${pipValue}/lot</span></span>
              </div>
            </>
          )}
        </div>
      )}

      {lotSize === null && stopLossPips && (
        <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-slate-500 text-sm">
          Enter a valid stop loss to see the recommendation.
        </div>
      )}
    </div>
  )
}

const ForexToolsView = ({ config, onBack }) => (
  <div className="min-h-screen bg-black text-slate-100">
    <div className="border-b border-zinc-900 px-6 py-4 flex items-center gap-6">
      <button onClick={onBack} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">← Back</button>
      <h1 className="text-lg font-semibold text-slate-100">Forex Tools</h1>
    </div>
    <div className="max-w-2xl mx-auto px-6 py-6">
      <ForexLotSizeCalculator config={config} />
    </div>
  </div>
)

const StopMarketOrderView = ({ onBack }) => {
  const [ticker, setTicker] = useState('')
  const [optionType, setOptionType] = useState('call')
  const [strike, setStrike] = useState('')
  const [expiry, setExpiry] = useState('')
  const [contracts, setContracts] = useState('1')
  const [premium, setPremium] = useState('')
  const [delta, setDelta] = useState('')
  const [gamma, setGamma] = useState('')
  const [theta, setTheta] = useState('')
  const [vega, setVega] = useState('')
  const [stopOptionPrice, setStopOptionPrice] = useState('')
  const [targetUnderlyingPrice, setTargetUnderlyingPrice] = useState('')
  const [currentStockPrice, setCurrentStockPrice] = useState('')
  const [stopLossStockPrice, setStopLossStockPrice] = useState('')
  const [breakevenStockPrice, setBreakevenStockPrice] = useState('')
  const [accountSize, setAccountSize] = useState(0)
  const [maxRisk, setMaxRisk] = useState('300')
  const [notes, setNotes] = useState('')
  const [playType, setPlayType] = useState('')
  const [pasteState, setPasteState] = useState('idle')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase
      .from('options_balance_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setAccountSize(parseFloat(data?.[0]?.balance) || 0)
      })
  }, [])

  const extractFromImage = async (file) => {
    if (!file) return
    setPasteState('loading')
    try {
      const reader = new FileReader()
      const base64 = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const resp = await fetch('/api/extract-greeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type })
      })
      const data = await resp.json()
      if (data.strike != null) setStrike(String(data.strike))
      if (data.stockPrice != null) setCurrentStockPrice(String(data.stockPrice))
      if (data.premium != null) setPremium(String(data.premium))
      if (data.delta != null) setDelta(String(data.delta))
      if (data.gamma != null) setGamma(String(data.gamma))
      if (data.theta != null) setTheta(String(data.theta))
      if (data.vega != null) setVega(String(data.vega))
      setPasteState('success')
    } catch {
      setPasteState('error')
    }
  }

  useEffect(() => {
    const handlePaste = async e => {
      const imageItem = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
      if (imageItem) extractFromImage(imageItem.getAsFile())
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!ticker.trim()) return setMessage('Ticker is required.')
    setSubmitting(true)
    setMessage('')
    const { error } = await supabase.from('stop_market_orders').insert({
      ticker: ticker.trim().toUpperCase(),
      option_type: optionType,
      strike_price: strike ? parseFloat(strike) : null,
      expiry_date: expiry || null,
      contracts: contracts ? parseInt(contracts) : null,
      premium: premium ? parseFloat(premium) : null,
      delta: delta ? parseFloat(delta) : null,
      gamma: gamma ? parseFloat(gamma) : null,
      theta: theta ? parseFloat(theta) : null,
      vega: vega ? parseFloat(vega) : null,
      stop_option_price: stopOptionPrice ? parseFloat(stopOptionPrice) : null,
      target_underlying_price: targetUnderlyingPrice ? parseFloat(targetUnderlyingPrice) : null,
      max_risk: maxRisk ? parseFloat(maxRisk) : null,
      notes: notes.trim() || null,
      play_type: playType || null,
      status: 'pending',
    })
    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Stop market order logged as pending.')
      setTicker(''); setStrike(''); setExpiry(''); setContracts('1')
      setPremium(''); setDelta(''); setGamma(''); setTheta(''); setVega('')
      setStopOptionPrice(''); setTargetUnderlyingPrice(''); setMaxRisk('300'); setNotes('')
      setCurrentStockPrice(''); setStopLossStockPrice(''); setBreakevenStockPrice('')
      setOptionType('call'); setPlayType(''); setPasteState('idle')
    }
    setSubmitting(false)
  }

  return (
    <div>
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors text-sm">← Back to Menu</button>
      <h1 className="text-3xl font-bold mb-1">Log Stop Market Order</h1>
      <p className="text-slate-400 text-sm mb-6">Log an options buy stop order. Mark it as executed once the trade fills, or cancel if the level is never reached.</p>

      {message && (
        <div className={`p-4 rounded-lg mb-6 border ${message.startsWith('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
          {message}
        </div>
      )}

      <div
        onDrop={e => { e.preventDefault(); extractFromImage(e.dataTransfer?.files?.[0]) }}
        onDragOver={e => e.preventDefault()}
        className={`mb-6 rounded-lg border-2 border-dashed px-4 py-4 text-center text-sm transition-colors cursor-default ${
          pasteState === 'loading' ? 'border-zinc-700 bg-zinc-900/50 text-slate-400' :
          pasteState === 'success' ? 'border-emerald-700/50 bg-emerald-900/10 text-emerald-400' :
          pasteState === 'error' ? 'border-red-700/50 bg-red-900/10 text-red-400' :
          'border-zinc-800 text-slate-500 hover:border-slate-500 hover:text-slate-300'
        }`}
      >
        {pasteState === 'loading' && 'Extracting from screenshot...'}
        {pasteState === 'success' && '✓ Auto-filled strike, premium & Greeks — review and adjust'}
        {pasteState === 'error' && 'Could not extract — fill in fields manually'}
        {pasteState === 'idle' && 'Paste broker screenshot (Ctrl+V / ⌘V) or drag & drop to auto-fill option fields'}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Ticker</label>
            <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="e.g. AAPL"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Option Type</label>
            <select value={optionType} onChange={e => setOptionType(e.target.value)}
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none">
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Play Type</label>
            <select value={playType} onChange={e => setPlayType(e.target.value)}
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none">
              <option value="">Select type...</option>
              <option value="short-term">Short Term</option>
              <option value="leap">LEAP</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Strike Price ($)</label>
            <input type="number" step="0.01" value={strike} onChange={e => setStrike(e.target.value)} placeholder="e.g. 185"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Expiry Date</label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Contracts</label>
            <input type="number" step="1" min="1" value={contracts} onChange={e => setContracts(e.target.value)}
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current Premium ($)</label>
            <input type="number" step="0.01" value={premium} onChange={e => setPremium(e.target.value)} placeholder="e.g. 2.80"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Delta (Δ)</label>
            <input type="number" step="0.001" value={delta} onChange={e => setDelta(e.target.value)} placeholder="e.g. 0.45"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Gamma (Γ)</label>
            <input type="number" step="0.001" value={gamma} onChange={e => setGamma(e.target.value)} placeholder="e.g. 0.03"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Theta (Θ) <span className="text-slate-600">daily decay</span></label>
            <input type="number" step="0.001" value={theta} onChange={e => setTheta(e.target.value)} placeholder="e.g. -0.05"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Vega (ν) <span className="text-slate-600">per IV pt</span></label>
            <input type="number" step="0.001" value={vega} onChange={e => setVega(e.target.value)} placeholder="e.g. 0.12"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Stop Option Price ($)</label>
            <input type="number" step="0.01" value={stopOptionPrice} onChange={e => setStopOptionPrice(e.target.value)} placeholder="Buy stop at this premium"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Target Underlying Price ($)</label>
            <input type="number" step="0.01" value={targetUnderlyingPrice} onChange={e => setTargetUnderlyingPrice(e.target.value)} placeholder="Stock trigger price"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current Stock Price ($)</label>
            <input type="number" step="0.01" value={currentStockPrice} onChange={e => setCurrentStockPrice(e.target.value)} placeholder="e.g. 182.00"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Stop Loss Stock Price ($)</label>
            <input type="number" step="0.01" value={stopLossStockPrice} onChange={e => setStopLossStockPrice(e.target.value)} placeholder="e.g. 175.00"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Breakeven Stock Price ($)</label>
            <input type="number" step="0.01"
              value={(() => {
                if (breakevenStockPrice !== '') return breakevenStockPrice
                const s = parseFloat(strike)
                const p = parseFloat(premium)
                if (isNaN(s) || isNaN(p)) return ''
                return (optionType === 'call' ? s + p : s - p).toFixed(2)
              })()}
              onChange={e => setBreakevenStockPrice(e.target.value)} placeholder="Auto-filled from strike + premium"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Max Risk ($)</label>
          <input type="number" step="1" min="1" value={maxRisk} onChange={e => setMaxRisk(e.target.value)} placeholder="e.g. 300"
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Notes / Thesis</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Why are you placing this stop order? What's your thesis?"
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-slate-100 text-sm focus:border-zinc-500 focus:outline-none placeholder-slate-600 resize-none" />
        </div>
        <PnLDecisionCard
          premium={premium}
          delta={delta}
          gamma={gamma}
          contracts={contracts}
          currentStock={currentStockPrice}
          targetStock={targetUnderlyingPrice}
          stopStock={stopLossStockPrice}
          breakevenStock={(() => {
            if (breakevenStockPrice !== '') return breakevenStockPrice
            const s = parseFloat(strike)
            const p = parseFloat(premium)
            if (isNaN(s) || isNaN(p)) return ''
            return (optionType === 'call' ? s + p : s - p).toFixed(2)
          })()}
          accountSize={accountSize}
          optionType={optionType}
          direction="long"
        />
        <button type="submit" disabled={submitting}
          className={`w-full p-4 rounded-lg font-semibold transition-colors ${submitting ? 'bg-zinc-700 text-white cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}>
          {submitting ? 'Logging...' : 'Log Stop Market Order'}
        </button>
      </form>
    </div>
  )
}

const StopMarketOrdersListView = ({ onBack, onExecute }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    const { data } = await supabase.from('stop_market_orders').select('*').order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  const handleExecute = (order) => {
    if (onExecute) onExecute(order)
  }

  const handleCancel = async (order) => {
    await supabase.from('stop_market_orders').update({ status: 'cancelled' }).eq('id', order.id)
    loadOrders()
  }

  const fmtDate = s => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'

  const statusBadge = status => {
    if (status === 'pending') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-900/40 border border-amber-700/50 text-amber-400">PENDING</span>
    if (status === 'executed') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/40 border border-emerald-700/50 text-emerald-400">EXECUTED</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 border border-zinc-700 text-slate-400">CANCELLED</span>
  }

  const groups = [
    { key: 'pending', label: 'Pending Orders' },
    { key: 'executed', label: 'Executed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors text-sm">← Back to Menu</button>
      <h1 className="text-3xl font-bold mb-1">Stop Market Orders</h1>
      <p className="text-slate-400 text-sm mb-6">Manage your pending buy stop orders. Execute when filled, cancel if the level is never hit.</p>

      {actionMsg && (
        <div className={`p-4 rounded-lg mb-6 border ${actionMsg.startsWith('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-slate-500">No stop market orders yet.</p>
      ) : (
        <div className="space-y-8">
          {groups.map(({ key, label }) => {
            const groupOrders = orders.filter(o => o.status === key)
            if (groupOrders.length === 0) return null
            return (
              <div key={key}>
                <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">{label}</h2>
                <div className="space-y-3">
                  {groupOrders.map(order => (
                    <div key={order.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          {statusBadge(order.status)}
                          <span className="text-lg font-bold">{order.ticker}</span>
                          <span className="text-slate-400 text-sm capitalize">{order.option_type}</span>
                          {order.strike_price && <span className="text-slate-400 text-sm">Strike ${order.strike_price}</span>}
                          {order.expiry_date && <span className="text-slate-400 text-sm">Exp {fmtDate(order.expiry_date)}</span>}
                          {order.contracts && <span className="text-slate-400 text-sm">{order.contracts}×</span>}
                        </div>
                        {order.status === 'pending' && (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleExecute(order)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors">
                              Execute
                            </button>
                            <button onClick={() => handleCancel(order)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-zinc-700">
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
                        {order.stop_option_price && <span>Stop entry: <span className="text-slate-200">${order.stop_option_price}/contract</span></span>}
                        {order.target_underlying_price && <span>Trigger: <span className="text-slate-200">stock @ ${order.target_underlying_price}</span></span>}
                        {order.max_risk && <span>Max risk: <span className="text-slate-200">${order.max_risk}</span></span>}
                        <span>Logged: <span className="text-slate-200">{fmtDate(order.created_at)}</span></span>
                        {order.executed_at && <span>Executed: <span className="text-emerald-400">{fmtDate(order.executed_at)}</span></span>}
                      </div>
                      {order.notes && <p className="mt-2 text-xs text-slate-500 italic">{order.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const InlineCalculatorPanel = () => {
  const [activeTab, setActiveTab] = useState('analyzer')
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-zinc-900 px-4 py-3 flex gap-1 flex-wrap shrink-0">
        {[['analyzer', 'Options Analyzer'], ['trailing', 'Trailing Stops']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === key ? 'bg-zinc-800 text-white' : 'text-slate-500 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
        {activeTab === 'analyzer' ? <OptionsAnalyzerTab isInline={true} /> : <TrailingStopsTab />}
      </div>
    </div>
  )
}

const defaultTrancheSettings = {
  startMonth: '2026-06',
  startNav: 10,
  startAccountValue: 50000,
  defaultParentContrib: 1200,
  defaultSelfContrib: 600,
  taxRate: 0.4,
  projRate: 0.08,
}

const trancheCad = (n) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(isFinite(n) ? n : 0)
const trancheNum = (n, d = 2) =>
  (isFinite(n) ? n : 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d })
const tranchePct = (n) => `${(isFinite(n) ? n * 100 : 0).toFixed(2)}%`

function nextTrancheMonthLabel(months, settings) {
  const last = months[months.length - 1]
  const ref = last ? last.label : settings.startMonth
  const [y, m] = ref.split('-').map(Number)
  if (!y || !m) return settings.startMonth
  if (!last) return settings.startMonth
  const d = new Date(y, m - 1 + 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const ParentTrancheTrackerTab = () => {
  const [loaded, setLoaded] = useState(false)
  const [settings, setSettings] = useState(defaultTrancheSettings)
  const [settingsId, setSettingsId] = useState(null)
  const [months, setMonths] = useState([])
  const [showSetup, setShowSetup] = useState(false)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    (async () => {
      const [{ data: settingsRows }, { data: monthRows }] = await Promise.all([
        supabase.from('parent_tranche_settings').select('*').limit(1),
        supabase.from('parent_tranche_months').select('*').order('created_at', { ascending: true }),
      ])

      let row = settingsRows?.[0]
      if (!row) {
        const insertPayload = {
          start_month: defaultTrancheSettings.startMonth,
          start_nav: defaultTrancheSettings.startNav,
          start_account_value: defaultTrancheSettings.startAccountValue,
          default_parent_contrib: defaultTrancheSettings.defaultParentContrib,
          default_self_contrib: defaultTrancheSettings.defaultSelfContrib,
          tax_rate: defaultTrancheSettings.taxRate,
          proj_rate: defaultTrancheSettings.projRate,
        }
        const { data: inserted } = await supabase.from('parent_tranche_settings').insert([insertPayload]).select().single()
        row = inserted
      }
      if (row) {
        setSettingsId(row.id)
        setSettings({
          startMonth: row.start_month,
          startNav: row.start_nav,
          startAccountValue: row.start_account_value,
          defaultParentContrib: row.default_parent_contrib,
          defaultSelfContrib: row.default_self_contrib,
          taxRate: row.tax_rate,
          projRate: row.proj_rate,
        })
      }

      if (monthRows) {
        setMonths(monthRows.map(r => ({
          id: r.id,
          label: r.label,
          valuePreFlows: r.value_pre_flows,
          parentContrib: r.parent_contrib,
          selfContrib: r.self_contrib,
          selfExtraction: r.self_extraction,
          parentTaxRedemption: r.parent_tax_redemption,
        })))
      }

      setLoaded(true)
    })()
  }, [])

  useEffect(() => {
    if (!loaded || !settingsId) return
    supabase.from('parent_tranche_settings').update({
      start_month: settings.startMonth,
      start_nav: settings.startNav,
      start_account_value: settings.startAccountValue,
      default_parent_contrib: settings.defaultParentContrib,
      default_self_contrib: settings.defaultSelfContrib,
      tax_rate: settings.taxRate,
      proj_rate: settings.projRate,
      updated_at: new Date().toISOString(),
    }).eq('id', settingsId)
  }, [settings, loaded, settingsId])

  const ledger = useMemo(() => {
    const startNav = parseFloat(settings.startNav) || 10
    const startVal = parseFloat(settings.startAccountValue) || 0
    let nav = startNav
    let selfUnits = startNav > 0 ? startVal / startNav : 0
    let parentUnits = 0
    let pContrib = 0, pTax = 0, sContrib = 0, sExtract = 0
    const rows = []
    months.forEach((m) => {
      const pre = parseFloat(m.valuePreFlows)
      const before = selfUnits + parentUnits
      if (before > 0 && isFinite(pre)) nav = pre / before
      const se = parseFloat(m.selfExtraction) || 0
      const pt = parseFloat(m.parentTaxRedemption) || 0
      const sc = parseFloat(m.selfContrib) || 0
      const pc = parseFloat(m.parentContrib) || 0
      if (se && nav > 0) { selfUnits -= se / nav; sExtract += se }
      if (pt && nav > 0) { parentUnits -= pt / nav; pTax += pt }
      if (sc && nav > 0) { selfUnits += sc / nav; sContrib += sc }
      if (pc && nav > 0) { parentUnits += pc / nav; pContrib += pc }
      const pVal = parentUnits * nav
      const sVal = selfUnits * nav
      rows.push({
        ...m, nav, parentUnits, parentValue: pVal, parentContributed: pContrib, parentTaxPaid: pTax,
        parentNetGain: pVal - pContrib, parentGrossGain: pVal - pContrib + pTax,
        selfUnits, selfValue: sVal, selfContributed: sContrib, selfExtracted: sExtract,
        accountValue: pVal + sVal, parentPct: (pVal + sVal) > 0 ? pVal / (pVal + sVal) : 0,
      })
    })
    const last = rows[rows.length - 1] || {
      nav: startNav, parentUnits: 0, parentValue: 0, parentContributed: 0, parentTaxPaid: 0,
      parentNetGain: 0, parentGrossGain: 0, selfUnits, selfValue: startVal, selfContributed: 0,
      selfExtracted: 0, accountValue: startVal, parentPct: 0,
    }
    return { rows, last, startNav, startVal }
  }, [settings, months])

  const L = ledger.last
  const untaxedGain = Math.max(0, L.parentGrossGain - L.parentTaxPaid)
  const suggestedTax = untaxedGain * (parseFloat(settings.taxRate) || 0)

  const projection = useMemo(() => {
    const elapsed = months.length
    const remaining = Math.max(0, 120 - elapsed)
    const r = parseFloat(settings.projRate) || 0
    const rm = Math.pow(1 + r, 1 / 12) - 1
    const P = parseFloat(settings.defaultParentContrib) || 0
    const grow = L.parentValue * Math.pow(1 + r, remaining / 12)
    const contribFV = rm > 0 ? P * ((Math.pow(1 + rm, remaining) - 1) / rm) : P * remaining
    const total = grow + contribFV
    const totalContributedAtEnd = L.parentContributed + P * remaining
    return { remaining, total, totalContributedAtEnd, gain: total - totalContributedAtEnd }
  }, [months.length, settings, L.parentValue, L.parentContributed])

  const chartData = ledger.rows.map((r) => ({
    label: r.label,
    'Parents value': Math.round(r.parentValue),
    'Parents contributed': Math.round(r.parentContributed),
    'Account total': Math.round(r.accountValue),
  }))

  function openDraft() {
    setDraft({
      label: nextTrancheMonthLabel(months, settings),
      valuePreFlows: L.accountValue ? Math.round(L.accountValue) : settings.startAccountValue,
      parentContrib: settings.defaultParentContrib,
      selfContrib: settings.defaultSelfContrib,
      selfExtraction: 0,
      parentTaxRedemption: 0,
    })
  }

  async function commitDraft() {
    const { data, error } = await supabase.from('parent_tranche_months').insert([{
      label: draft.label,
      value_pre_flows: draft.valuePreFlows,
      parent_contrib: draft.parentContrib,
      self_contrib: draft.selfContrib,
      self_extraction: draft.selfExtraction,
      parent_tax_redemption: draft.parentTaxRedemption,
    }]).select().single()
    if (!error && data) {
      setMonths(prev => [...prev, {
        id: data.id,
        label: data.label,
        valuePreFlows: data.value_pre_flows,
        parentContrib: data.parent_contrib,
        selfContrib: data.self_contrib,
        selfExtraction: data.self_extraction,
        parentTaxRedemption: data.parent_tax_redemption,
      }])
    }
    setDraft(null)
  }

  async function removeRow(id) {
    await supabase.from('parent_tranche_months').delete().eq('id', id)
    setMonths(prev => prev.filter(m => m.id !== id))
  }

  async function resetAll() {
    if (typeof window === 'undefined' || !window.confirm('Clear all entries and reset settings?')) return
    const ids = months.map(m => m.id)
    if (ids.length > 0) await supabase.from('parent_tranche_months').delete().in('id', ids)
    if (settingsId) {
      await supabase.from('parent_tranche_settings').update({
        start_month: defaultTrancheSettings.startMonth,
        start_nav: defaultTrancheSettings.startNav,
        start_account_value: defaultTrancheSettings.startAccountValue,
        default_parent_contrib: defaultTrancheSettings.defaultParentContrib,
        default_self_contrib: defaultTrancheSettings.defaultSelfContrib,
        tax_rate: defaultTrancheSettings.taxRate,
        proj_rate: defaultTrancheSettings.projRate,
        updated_at: new Date().toISOString(),
      }).eq('id', settingsId)
    }
    setMonths([])
    setSettings(defaultTrancheSettings)
  }

  const gainColor = L.parentNetGain >= 0 ? 'text-emerald-400' : 'text-red-400'
  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-zinc-600"
  const labelClass = "block text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1.5"
  const cardClass = "bg-zinc-950 border border-zinc-800 rounded-lg p-4"
  const ghostBtn = "bg-zinc-900 hover:bg-zinc-800 text-slate-300 border border-zinc-800 rounded px-3 py-1.5 text-sm transition-colors"
  const primaryBtn = "bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-2 text-sm font-medium transition-colors"

  if (!loaded) {
    return <div className="py-16 text-center text-slate-500 text-sm">Loading ledger…</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[.2em] text-amber-600 font-bold">Non-registered · unit accounting</p>
          <h2 className="text-2xl font-semibold mt-1">Parents&apos; Tranche Ledger</h2>
          <p className="text-sm text-slate-400 mt-1">Pro-rata gains &amp; losses · lump-sum payout at year 10</p>
        </div>
        <div className="flex gap-2">
          <button className={ghostBtn} onClick={() => setShowSetup(s => !s)}>Setup</button>
          <button className={ghostBtn} onClick={resetAll}>Reset</button>
        </div>
      </div>

      {showSetup && (
        <div className={`${cardClass} bg-zinc-900`}>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {[
              ['Start month', 'startMonth', 'text'],
              ['Starting account value', 'startAccountValue', 'number'],
              ['Starting NAV', 'startNav', 'number'],
              ['Default parent / mo', 'defaultParentContrib', 'number'],
              ['Default self / mo', 'defaultSelfContrib', 'number'],
              ['Tax rate (0–1)', 'taxRate', 'number'],
              ['Projection rate (0–1)', 'projRate', 'number'],
            ].map(([lab, key, type]) => (
              <div key={key}>
                <label className={labelClass}>{lab}</label>
                <input
                  className={`${inputClass} font-mono`}
                  type={type}
                  step="any"
                  value={settings[key]}
                  onChange={(e) => setSettings(s => ({ ...s, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Starting account value &amp; NAV define your existing capital at inception (all yours). The first row then
            applies that month&apos;s contributions. NAV is arbitrary — $10 is just a clean baseline.
          </p>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wide text-amber-400 font-bold">Parents&apos; value</p>
          <p className="text-2xl font-semibold mt-2 font-mono">{trancheCad(L.parentValue)}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">{trancheNum(L.parentUnits, 2)} units @ {trancheCad(L.nav)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">Contributed</p>
          <p className="text-2xl font-semibold mt-2 font-mono">{trancheCad(L.parentContributed)}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">tax redeemed {trancheCad(L.parentTaxPaid)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">Net gain (after tax)</p>
          <p className={`text-2xl font-semibold mt-2 font-mono ${gainColor}`}>
            {L.parentNetGain >= 0 ? '+' : ''}{trancheCad(L.parentNetGain)}
          </p>
          <p className={`text-xs mt-1 font-mono ${gainColor}`}>
            {L.parentContributed > 0 ? tranchePct(L.parentNetGain / L.parentContributed) : '—'}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-[11px] uppercase tracking-wide text-sky-400 font-bold">Account total</p>
          <p className="text-2xl font-semibold mt-2 font-mono">{trancheCad(L.accountValue)}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">parents {tranchePct(L.parentPct)} · you {tranchePct(1 - L.parentPct)}</p>
        </div>
      </div>

      {!draft ? (
        <button className={primaryBtn} onClick={openDraft}>+ Add month</button>
      ) : (
        <div className={`${cardClass} border-amber-700/50`}>
          <p className="text-base font-semibold mb-3">New month entry</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            {[
              ['Month', 'label', 'text'],
              ['Acct value (after trading, pre-flows)', 'valuePreFlows', 'number'],
              ['Parent contribution', 'parentContrib', 'number'],
              ['Your contribution', 'selfContrib', 'number'],
              ['Your extraction', 'selfExtraction', 'number'],
              ['Parent tax redemption', 'parentTaxRedemption', 'number'],
            ].map(([lab, key, type]) => (
              <div key={key}>
                <label className={labelClass}>{lab}</label>
                <input
                  className={`${inputClass} font-mono`}
                  type={type}
                  step="any"
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button className={primaryBtn} onClick={commitDraft}>Save entry</button>
            <button className={ghostBtn} onClick={() => setDraft(null)}>Cancel</button>
            {suggestedTax > 0 && (
              <span className="text-xs text-slate-500">
                year-end tax est. ≈ {trancheCad(suggestedTax)} ({tranchePct(parseFloat(settings.taxRate) || 0)} of untaxed gain)
              </span>
            )}
          </div>
        </div>
      )}

      <div className={`${cardClass} p-0 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 760 }}>
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="p-3 text-left text-slate-400 text-xs uppercase tracking-wide">Month</th>
                <th className="p-3 text-right text-slate-400 text-xs uppercase tracking-wide">NAV</th>
                <th className="p-3 text-right text-slate-400 text-xs uppercase tracking-wide">Parent units</th>
                <th className="p-3 text-right text-amber-400 text-xs uppercase tracking-wide">Parent value</th>
                <th className="p-3 text-right text-slate-400 text-xs uppercase tracking-wide">Contributed</th>
                <th className="p-3 text-right text-slate-400 text-xs uppercase tracking-wide">Net gain</th>
                <th className="p-3 text-right text-slate-400 text-xs uppercase tracking-wide">Your value</th>
                <th className="p-3 text-right text-slate-400 text-xs uppercase tracking-wide">Account</th>
                <th className="p-3 text-right text-slate-400 text-xs uppercase tracking-wide">P %</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {ledger.rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 text-sm">No entries yet — add a month to start.</td>
                </tr>
              )}
              {ledger.rows.map(r => (
                <tr key={r.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                  <td className="p-3 text-left font-medium text-slate-200">{r.label}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{trancheCad(r.nav)}</td>
                  <td className="p-3 text-right font-mono text-slate-400">{trancheNum(r.parentUnits, 2)}</td>
                  <td className="p-3 text-right font-mono text-amber-400 font-semibold">{trancheCad(r.parentValue)}</td>
                  <td className="p-3 text-right font-mono text-slate-400">{trancheCad(r.parentContributed)}</td>
                  <td className={`p-3 text-right font-mono ${r.parentNetGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.parentNetGain >= 0 ? '+' : ''}{trancheCad(r.parentNetGain)}
                  </td>
                  <td className="p-3 text-right font-mono text-sky-400">{trancheCad(r.selfValue)}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{trancheCad(r.accountValue)}</td>
                  <td className="p-3 text-right font-mono text-slate-400">{tranchePct(r.parentPct)}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => removeRow(r.id)} className="text-slate-500 hover:text-red-400 transition-colors" title="Remove">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <div className={cardClass}>
          <p className="text-base font-semibold mb-3">Parents&apos; tranche over time</p>
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Add entries to see the curve.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} stroke="#27272a" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} stroke="#27272a" width={52}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }} formatter={(v) => trancheCad(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Parents value" stroke="#fbbf24" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="Parents contributed" stroke="#94a3b8" strokeWidth={1.4} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="Account total" stroke="#38bdf8" strokeWidth={1.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={cardClass}>
          <p className="text-base font-semibold mb-1">Year-10 projection</p>
          <p className="text-xs text-slate-500 mb-4">
            Hypothetical — assumes {tranchePct(parseFloat(settings.projRate) || 0)}/yr and continued {trancheCad(parseFloat(settings.defaultParentContrib) || 0)}/mo.
          </p>
          <div className="mb-3">
            <p className={labelClass}>Months remaining</p>
            <p className="text-lg font-mono">{projection.remaining}</p>
          </div>
          <div className="mb-3">
            <p className={labelClass}>Projected lump sum</p>
            <p className="text-2xl font-bold font-mono text-amber-400">{trancheCad(projection.total)}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className={labelClass}>Contributed</p>
              <p className="text-sm font-mono">{trancheCad(projection.totalContributedAtEnd)}</p>
            </div>
            <div>
              <p className={labelClass}>Projected gain</p>
              <p className="text-sm font-mono text-emerald-400">{trancheCad(projection.gain)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            Adjust the rate in Setup. Tax handled separately via redemptions, not modeled here.
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Each month: enter the account value <em>after that month&apos;s trading but before flows</em> — the tool derives NAV
        from it. Leave <span className="text-slate-400">parent tax redemption</span> at 0 to absorb their tax yourself,
        or enter your CPA&apos;s figure each December to keep it self-funding. Not tax advice.
      </p>
    </div>
  )
}

const OptionsToolsView = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('analyzer')
  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="border-b border-zinc-900 px-6 py-4 flex items-center gap-6">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">← Back</button>
        <div className="flex gap-1">
          {[['analyzer', 'Options Analyzer'], ['trailing', 'Trailing Stops'], ['tranche', 'Tranche Ledger']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === key ? 'bg-zinc-900 text-white' : 'text-slate-500 hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={activeTab === 'tranche' ? 'max-w-6xl mx-auto px-6 py-6' : 'max-w-2xl mx-auto px-6 py-6'}>
        {activeTab === 'analyzer' ? <OptionsAnalyzerTab /> : activeTab === 'trailing' ? <TrailingStopsTab /> : <ParentTrancheTrackerTab />}
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
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm shadow-lg">
        <p className="text-slate-300 font-semibold">{d.date}</p>
        <p className="text-white">Balance: <span className="font-bold">${d.balance.toFixed(2)}</span></p>
        {d.change !== 0 && <p className={d.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>{d.change >= 0 ? '+' : ''}${d.change.toFixed(2)}</p>}
        {d.reason && <p className="text-slate-400 text-xs mt-1 max-w-[200px]">{d.reason}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
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
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
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
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Win Rate (balance changes)</p>
                <p className="text-2xl font-bold text-slate-100">{winRate}{winRate !== 'N/A' ? '%' : ''}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
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
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors"
      >
        ← Back to Menu
      </button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{labels.positionSizerButton || 'Position Sizing Calculator'}</h1>
        <p className="text-slate-400 mb-8">Calculate optimal position size or maximum stop loss based on your risk parameters.</p>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-6">
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
                ? 'bg-white text-black border-white'
                : 'bg-zinc-900 text-slate-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="font-semibold">Calculate Max Stop</div>
            <div className="text-xs opacity-80">Given # of contracts</div>
          </button>
          <button
            onClick={() => setMode('contractsFromStop')}
            className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${
              mode === 'contractsFromStop'
                ? 'bg-white text-black border-white'
                : 'bg-zinc-900 text-slate-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="font-semibold">Calculate Max Contracts</div>
            <div className="text-xs opacity-80">Given stop loss ticks</div>
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-4">
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
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-800 text-slate-300 border-zinc-700 hover:border-slate-500'
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
              className="w-full p-3 bg-zinc-950 border border-zinc-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
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
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-800 text-slate-300 border-zinc-700 hover:border-slate-500'
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
              className="w-full p-3 bg-zinc-950 border border-zinc-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
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
                className="w-full p-3 bg-zinc-950 border border-zinc-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
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
                className="w-full p-3 bg-zinc-950 border border-zinc-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                placeholder="e.g., 10"
              />
            </div>
          )}
        </div>

        {result && (
          <div className="mt-6 bg-zinc-950 border border-amber-500/30 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-amber-300 mb-4">Calculation Result</h3>

            {result.type === 'stopFromContracts' ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-zinc-900 rounded-lg">
                  <span className="text-slate-300">Maximum Stop Loss:</span>
                  <span className="text-3xl font-bold text-emerald-400">{result.maxStopTicks} ticks</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-slate-400">Risk Amount:</span>
                  <span className="text-lg font-semibold text-slate-100">${result.riskDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-slate-400">Actual Risk %:</span>
                  <span className="text-lg font-semibold text-slate-100">{result.riskPercent.toFixed(3)}%</span>
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  With {result.contracts} contract(s), you can risk up to {result.maxStopTicks} ticks before exceeding your risk limit.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-zinc-900 rounded-lg">
                  <span className="text-slate-300">Maximum Contracts:</span>
                  <span className="text-3xl font-bold text-emerald-400">{result.maxContracts}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-slate-400">Risk Amount:</span>
                  <span className="text-lg font-semibold text-slate-100">${result.riskDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
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

const WeeklyReviewView = ({ config, onBack }) => {
  const { tables, tradeColumns } = config

  const [weekOffset, setWeekOffset] = useState(0)
  const { from, to } = useMemo(() => getWeekBounds(weekOffset), [weekOffset])

  const weekLabel = useMemo(() => {
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${fmt(from)} – ${fmt(to)}`
  }, [from, to])

  const weekRelLabel = weekOffset === 0 ? 'Last week' : weekOffset === 1 ? 'This week' : `${Math.abs(weekOffset)} weeks ago`

  const [trades, setTrades] = useState([])
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setSaved({})
      const { data } = await supabase
        .from(tables.trades)
        .select('*')
        .eq(tradeColumns.status, 'closed')
        .gte(tradeColumns.exitDate, from.toISOString())
        .lte(tradeColumns.exitDate, to.toISOString())
        .order(tradeColumns.exitDate, { ascending: true })
      const rows = data || []
      setTrades(rows)
      const init = {}
      rows.forEach(t => { init[t[tradeColumns.id]] = t.journal_notes || '' })
      setNotes(init)
      setLoading(false)
    }
    load()
  }, [tables.trades, tradeColumns.status, tradeColumns.exitDate, tradeColumns.id, from, to])

  const handleSave = async (id) => {
    setSaving(s => ({ ...s, [id]: true }))
    await supabase
      .from(tables.trades)
      .update({ journal_notes: notes[id], journal_reviewed_at: new Date().toISOString() })
      .eq(tradeColumns.id, id)
    setSaving(s => ({ ...s, [id]: false }))
    setSaved(s => ({ ...s, [id]: true }))
  }

  const reviewedCount = Object.entries(saved).filter(([, v]) => v).length +
    trades.filter(t => t.journal_notes?.trim() && !saved[t[tradeColumns.id]]).length
  const allDone = trades.length > 0 && reviewedCount >= trades.length

  if (loading) return (
    <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
      <p className="text-slate-400">Loading trades...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1">Weekly Review</h1>
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setWeekOffset(o => o - 1)}
                className="px-2 py-1 text-slate-500 hover:text-white transition-colors text-lg leading-none">&#8592;</button>
              <div className="text-center">
                <p className="text-slate-400 text-sm">{weekLabel}</p>
                <p className="text-xs text-slate-600">{weekRelLabel}</p>
              </div>
              <button onClick={() => setWeekOffset(o => o + 1)}
                disabled={weekOffset >= 1}
                className="px-2 py-1 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg leading-none">&#8594;</button>
            </div>
          </div>
          {trades.length > 0 && (
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${allDone ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700' : 'bg-amber-900/20 text-amber-400 border-amber-700/50'}`}>
              {reviewedCount} / {trades.length} reviewed
            </span>
          )}
        </div>

        {allDone && (
          <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-700 rounded-lg text-emerald-300 text-sm font-medium">
            Week complete — you&apos;re clear to trade next week.
          </div>
        )}

        {trades.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center">
            <p className="text-slate-400">No closed trades that week. Nothing to review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {trades.map(trade => {
              const id = trade[tradeColumns.id]
              const instrument = trade[tradeColumns.instrument] || '—'
              const direction = (trade[tradeColumns.direction] || '').toUpperCase()
              const pnl = trade[tradeColumns.pnl]
              const exitDateStr = trade[tradeColumns.exitDate] ? new Date(trade[tradeColumns.exitDate]).toLocaleDateString() : '—'
              const entryUrl = tradeColumns.entryUrl ? trade[tradeColumns.entryUrl] : null
              const forecastUrl = tradeColumns.forecastUrl ? trade[tradeColumns.forecastUrl] : null
              const exitUrl = tradeColumns.exitUrl ? trade[tradeColumns.exitUrl] : null
              const isSaved = saved[id] || (trade.journal_notes?.trim() && !saved[id] === false)
              const noteValue = notes[id] ?? ''
              const hasNote = noteValue.trim().length > 0

              return (
                <div key={id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">{instrument}</span>
                        <span className="text-sm text-slate-400">{direction}</span>
                        {saved[id] && <span className="text-xs text-emerald-400 font-medium">✓ Reviewed</span>}
                        {!saved[id] && trade.journal_notes?.trim() && <span className="text-xs text-emerald-400 font-medium">✓ Previously reviewed</span>}
                      </div>
                      <p className="text-xs text-slate-500">Closed {exitDateStr}</p>
                    </div>
                    <div className="text-right">
                      {pnl !== null && pnl !== undefined && (
                        <p className={`text-xl font-bold ${parseFloat(pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {parseFloat(pnl) >= 0 ? '+' : ''}${parseFloat(pnl).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  {(tradeColumns.entryPrice || tradeColumns.lotSize || tradeColumns.premium || tradeColumns.contracts) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
                      {tradeColumns.entryPrice && trade[tradeColumns.entryPrice] != null && (
                        <span>Entry: <span className="text-slate-200">{trade[tradeColumns.entryPrice]}</span></span>
                      )}
                      {tradeColumns.lotSize && trade[tradeColumns.lotSize] != null && (
                        <span>Lot: <span className="text-slate-200">{trade[tradeColumns.lotSize]}</span></span>
                      )}
                      {tradeColumns.stopLossPips && trade[tradeColumns.stopLossPips] != null && (
                        <span>SL: <span className="text-slate-200">{trade[tradeColumns.stopLossPips]}p</span></span>
                      )}
                      {tradeColumns.takeProfitPips && trade[tradeColumns.takeProfitPips] != null && (
                        <span>TP: <span className="text-slate-200">{trade[tradeColumns.takeProfitPips]}p</span></span>
                      )}
                      {tradeColumns.premium && trade[tradeColumns.premium] != null && (
                        <span>Premium: <span className="text-slate-200">${trade[tradeColumns.premium]}</span></span>
                      )}
                      {tradeColumns.contracts && trade[tradeColumns.contracts] != null && (
                        <span>Contracts: <span className="text-slate-200">{trade[tradeColumns.contracts]}</span></span>
                      )}
                      {tradeColumns.strike && trade[tradeColumns.strike] != null && (
                        <span>Strike: <span className="text-slate-200">${trade[tradeColumns.strike]}</span></span>
                      )}
                    </div>
                  )}

                  {(entryUrl || forecastUrl || exitUrl) && (
                    <div className="flex gap-3 mb-4">
                      {forecastUrl && <a href={forecastUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-emerald-400 underline transition-colors">Forecast ↗</a>}
                      {entryUrl && <a href={entryUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-emerald-400 underline transition-colors">Entry Chart ↗</a>}
                      {exitUrl && <a href={exitUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-emerald-400 underline transition-colors">Exit Chart ↗</a>}
                    </div>
                  )}

                  <div className="border-t border-zinc-800 pt-4">
                    <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wide">Self Review</label>
                    <textarea
                      value={noteValue}
                      onChange={e => setNotes(n => ({ ...n, [id]: e.target.value }))}
                      placeholder="What went well? What didn't? How can you do better?"
                      rows={4}
                      className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-slate-100 text-sm placeholder-slate-600 focus:border-zinc-600 focus:outline-none resize-none leading-relaxed"
                    />
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => handleSave(id)}
                        disabled={saving[id] || !hasNote}
                        className="px-4 py-1.5 bg-white hover:bg-zinc-100 text-black text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saving[id] ? 'Saving...' : 'Save Note'}
                      </button>
                      {saved[id] && <span className="text-xs text-emerald-400">✓ Saved</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const DailyJournalView = ({ onBack }) => {
  const today = new Date().toISOString().split('T')[0]
  const displayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const [entry, setEntry] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('daily_journal_entries').select('content').eq('date', today).single()
      if (data) setEntry(data.content || '')
    }
    load()
  }, [today])

  const handleSave = async () => {
    if (!entry.trim()) return
    setSaving(true)
    setSaveMessage('')
    try {
      const { error } = await supabase.from('daily_journal_entries').upsert(
        { date: today, content: entry, updated_at: new Date().toISOString() },
        { onConflict: 'date' }
      )
      if (error) throw error
      setSaveMessage('Saved!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setSaveMessage(`Error: ${err.message}`)
    }
    setSaving(false)
  }

  const handleToggleHistory = async () => {
    if (!showHistory && history.length === 0) {
      setHistoryLoading(true)
      const { data } = await supabase.from('daily_journal_entries').select('date, content').order('date', { ascending: false }).limit(60)
      setHistory(data || [])
      setHistoryLoading(false)
    }
    setShowHistory(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 p-8">
      <button onClick={onBack} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors">← Back to Menu</button>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">Daily Journal</h1>
        <p className="text-slate-400 text-sm mb-6">{displayDate}</p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-4">
          <textarea
            value={entry}
            onChange={e => setEntry(e.target.value)}
            placeholder="How are you feeling today? What are you looking to accomplish? Any key levels or setups on your radar?"
            rows={8}
            className="w-full bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 resize-none text-sm leading-relaxed"
          />
        </div>

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleSave}
            disabled={saving || !entry.trim()}
            className="px-6 py-2 bg-white hover:bg-zinc-100 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
          {saveMessage && (
            <span className={`text-sm ${saveMessage.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{saveMessage}</span>
          )}
          <button
            onClick={handleToggleHistory}
            className="ml-auto text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showHistory ? 'Hide Journal ▲' : 'View Journal ▾'}
          </button>
        </div>

        {showHistory && (
          <div className="space-y-4">
            {historyLoading ? (
              <p className="text-slate-400 text-sm">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-slate-500 text-sm">No past entries yet.</p>
            ) : (
              history
                .filter(h => h.date !== today)
                .map(h => (
                  <div key={h.date} className="bg-zinc-950 border border-zinc-900 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                      {new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{h.content}</p>
                  </div>
                ))
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
  const [pendingStopOrderId, setPendingStopOrderId] = useState(null)
  const features = config.features || {}
  const supportsMissedTrades = features.missedTrades && config.tables?.missed
  const supportsTradingPlan = features.tradingPlan !== false && config.tables?.plan
  const supportsPositionSizer = features.positionSizer && config.tables?.balance
  const supportsGreeksCalculator = config.key === 'options'
  const supportsForexTools = Boolean(config.features?.forexTools)
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
      setDashStats({ balance, openCount: open.length, winRate, avgPnL, totalPnL })
    }
    load()
  }, [currentView, config])

  if (currentView === 'menu') {
    const { tradeColumns } = config
    const statCards = dashStats ? [
      { label: 'Account Balance', value: `$${dashStats.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-white' },
      { label: 'Open Trades', value: dashStats.openCount, color: 'text-white' },
      { label: 'Win Rate', value: dashStats.winRate !== null ? `${dashStats.winRate}%` : '—', color: dashStats.winRate !== null ? (parseFloat(dashStats.winRate) >= 50 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400' },
      { label: 'Avg P&L', value: dashStats.avgPnL !== null ? `${parseFloat(dashStats.avgPnL) >= 0 ? '+' : ''}$${Math.abs(parseFloat(dashStats.avgPnL)).toFixed(2)}` : '—', color: dashStats.avgPnL !== null ? (parseFloat(dashStats.avgPnL) >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400' },
    ] : []

    return (
      <div className="min-h-screen bg-black text-slate-100">
        <div className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">{config.labels.menuBack}</button>
          <h1 className="text-xl font-bold text-slate-100">{config.environmentTitle}</h1>
          <div className="w-24" />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {supportsGreeksCalculator && (
            <TrailingStopBanner onGoToStops={() => setCurrentView('options-tools')} />
          )}

          {dashStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {config.checklist?.tables?.attempts && <ChecklistAnalyticsCard config={config} />}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { label: config.labels.newTradeButton, view: 'new-trade', primary: true },
              { label: config.labels.updateTradeButton, view: 'update-trade' },
              { label: config.labels.viewDataButton, view: 'view-data' },
              ...(supportsGreeksCalculator ? [{ label: 'Log Stop Market Order', view: 'stop-market-new' }] : []),
              ...(supportsGreeksCalculator ? [{ label: 'Stop Market Orders', view: 'stop-market-list' }] : []),
              ...(supportsGreeksCalculator ? [{ label: 'Options Tools', view: 'options-tools' }] : []),
              ...(supportsForexTools ? [{ label: 'Forex Tools', view: 'forex-tools' }] : []),
              ...(supportsPositionSizer ? [{ label: config.labels.positionSizerButton, view: 'position-sizer' }] : []),
              ...(supportsMissedTrades ? [{ label: 'Missed Trades', view: 'missed-trades' }] : []),
              ...(supportsTradingPlan ? [{ label: config.labels.tradingPlanButton, view: 'trading-plan' }] : []),
              ...(supportsEquityCurve ? [{ label: 'Equity Curve', view: 'equity-curve' }] : []),
              { label: 'Weekly Review', view: 'weekly-review' },
              { label: 'Daily Journal', view: 'daily-journal' },
            ].map(({ label, view, primary }) => (
              <button key={view} onClick={() => setCurrentView(view)}
                className={`p-4 rounded-xl border text-sm font-medium text-left transition-all ${primary ? config.classes.primaryButton + ' border-transparent' : 'bg-zinc-950 border-zinc-900 text-slate-300 hover:border-zinc-700 hover:text-white'}`}>
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
        sidePanel={supportsGreeksCalculator ? <InlineCalculatorPanel /> : undefined}
        onTradeLogged={pendingStopOrderId ? async () => {
          await supabase.from('stop_market_orders')
            .update({ status: 'executed', executed_at: new Date().toISOString() })
            .eq('id', pendingStopOrderId)
          setPendingStopOrderId(null)
        } : undefined}
      />
    )
  }

  if (currentView === 'stop-market-new' && supportsGreeksCalculator) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex">
        <div className="flex-1 min-w-0 overflow-y-auto p-8">
          <StopMarketOrderView onBack={() => setCurrentView('menu')} />
        </div>
        <div className="w-[440px] shrink-0 border-l border-zinc-900 sticky top-0 h-screen overflow-y-auto bg-zinc-950">
          <InlineCalculatorPanel />
        </div>
      </div>
    )
  }

  if (currentView === 'stop-market-list' && supportsGreeksCalculator) {
    return <StopMarketOrdersListView
      onBack={() => setCurrentView('menu')}
      onExecute={(order) => {
        setFormData({
          instrument: order.ticker || '',
          optionType: order.option_type || 'call',
          direction: 'long',
          strike: order.strike_price != null ? String(order.strike_price) : '',
          expiry: order.expiry_date || '',
          contracts: order.contracts != null ? String(order.contracts) : '',
          premium: order.stop_option_price != null ? String(order.stop_option_price) : '',
          entryStockPrice: order.target_underlying_price != null ? String(order.target_underlying_price) : '',
          delta: order.delta != null ? String(order.delta) : '',
          gamma: order.gamma != null ? String(order.gamma) : '',
          theta: order.theta != null ? String(order.theta) : '',
          vega: order.vega != null ? String(order.vega) : '',
          slStockPrice: '',
          tpStockPrice: '',
          entryUrl: '',
          forecastUrl: '',
          notes: order.notes || '',
        })
        setPendingStopOrderId(order.id)
        setCurrentView('new-trade')
      }}
    />
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
  if (currentView === 'missed-trades' && supportsMissedTrades) return <MissedTradesView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'missed-trade' && supportsMissedTrades) return <MissedTradesView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'missed-data' && supportsMissedTrades) return <MissedTradesView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'trading-plan' && supportsTradingPlan) return <TradingPlanView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'position-sizer' && supportsPositionSizer) return <FuturesPositionSizer config={config} onBack={() => setCurrentView('menu')} />
  if (currentView === 'options-tools' && supportsGreeksCalculator) return <OptionsToolsView onBack={() => setCurrentView('menu')} />
  if (currentView === 'forex-tools' && supportsForexTools) return <ForexToolsView config={config} onBack={() => setCurrentView('menu')} />
  if (currentView === 'weekly-review') return <WeeklyReviewView config={config} onBack={() => setCurrentView('menu')} />
  if (currentView === 'daily-journal') return <DailyJournalView onBack={() => setCurrentView('menu')} />
  return null
}

export default function Home() {
  const [activeMode, setActiveMode] = useState(null)

  if (!activeMode) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <div className="w-full max-w-2xl px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4">Trading Journal</h1>
          <p className="text-slate-400 mb-10 text-lg">Select your workspace to manage trades, review performance, and sharpen your edge.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <MenuButton onClick={() => setActiveMode('options')} className={MODE_CONFIG.options.classes.primaryButton}>
              {MODE_CONFIG.options.homeButtonLabel}
            </MenuButton>
            <MenuButton onClick={() => setActiveMode('forex')} className={MODE_CONFIG.forex.classes.primaryButton}>
              {MODE_CONFIG.forex.homeButtonLabel}
            </MenuButton>
          </div>
        </div>
      </div>
    )
  }

  return <TradingEnvironment config={MODE_CONFIG[activeMode]} onBack={() => setActiveMode(null)} />
}
